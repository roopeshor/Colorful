(function () {
  // useful stuffs

  // RegExes for matching stuffs
  //regular expressions
  var KeywordRE =
    /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|NaN|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/;
  var operatorRE = /(\=|\+|\-|\*|\/|%|!|<|>|\&|\||\:|\?)*/;
  var nameCharRE = /[\wα-ζΑ-Ζ\$]/;
  var number = /^-?((\d*(\.\d*)?)|(0x[0-9a-f]*)|(0b[01]*))$/;
  var specials = /^(window|document)$/;
  var commentRE = /((\/\*[\s\S]*?\*\/|\/\*[\s\S]*)|(\/\/.*))/;
  var stringRE =
    /('(((\\)+(')?)|([^']))*')|("(((\\)+(")?)|([^"]))*")|(`(((\\)+(`)?)|([^`]))*`)/;
  var regexRE =
    /^\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/;
  var txt_obj = /(TEXT|OBJECTPROP)/;
  // builtIn objects
  var builtInObject =
    /^(AggregateError|Buffer|Array|ArrayBuffer|AsyncFunction|AsyncGenerator|AsyncGeneratorFunction|Atomics|BigInt|BigInt64Array|BigUint64Array|Boolean|DataView|Date|Error|EvalError|Float32Array|Float64Array|Function|Generator|GeneratorFunction|Int16Array|Int32Array|Int8Array|InternalError|Intl|JSON|Map|Math|Number|Object|Promise|Proxy|RangeError|ReferenceError|Reflect|RegExp|Set|SharedArrayBuffer|String|Symbol|SyntaxError|TypeError|URIError|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|WeakMap|WeakSet|WebAssembly)$/;

  // types of tokens
  const T_STRING = "STRING",
    T_KEY = "KEY",
    T_TEXT = "TEXT",
    T_OPERATOR = "OPERATOR",
    T_NEWLINE = "NEWLINE",
    T_COMMENT = "COMMENT",
    T_NUMBER = "NUMBER",
    T_FUNCTION = "FUNCTION",
    T_ARGUMENT = "ARGUMENT",
    T_CAPITAL = "CAPITAL",
    T_OBJECTPROP = "OBJECTPROP",
    T_METHOD = "METHOD",
    T_REGEX = "REGEX",
    T_LPAREN = "LPAREN",
    T_OTHER = "OTHER";
  // an empty token
  var emptyToken = { type: "", token: "" };

  // default configurations for output
  var config = {
    tabIndex: 4,
    fontSize: 16, // in px
    enableLineNumbering: true,
    lineHeight: 20,
  };

  // useful string patterns

  /**
   * Reverses the string
   * @returns reversed string
   */
  String.prototype.reverse = function () {
    return this.split("").reverse().join("");
  };

  /**
   * converts characters into html char codes
   * "<" -> "&lt;"
   * ">" -> "&gt;"
   * "&" -> "&amp;"
   * @returns string replacing some characters
   */
  String.prototype.replaceSpecHTMLChars = function () {
    return this.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  window.onload = function () {
    var codes = document.getElementsByClassName("js-syntex");
    if (codes.length) {
      for (var k = 0; k < codes.length; k++) {
        var block = codes[k];
        var cfg = {
          tabIndex: block.getAttribute("tabindex") || config.tabIndex,
          fontSize: block.getAttribute("fontsize") || config.fontSize,
          lineHeight: block.getAttribute("lineheight") || config.lineHeight,
          enableLineNumbering:
            block.getAttribute("linenumbering") || config.enableLineNumbering,
        };
        highlight(codes[k], cfg);
      }
    }
  };

  function highlight(container, cfg) {
    var w_h = 0.5498367766955267; // width/height of a monospace number
    var text = container.innerText;

    var d1 = window.performance.now();
    var out = tokenize(text);
    var markuped = parseToken(out.tokens, cfg.lineHeight);
    var compileTime = window.performance.now() - d1;
    var complete = "<pre class='syntex-code'>";
    var intentWidth = 0;
    if (cfg.enableLineNumbering) {
      var lineCount = text.match(/\n/g)?.length + 1 || 1;
      var lineNo = new Array(lineCount).fill(1);
      intentWidth = String(lineCount).length * w_h * cfg.fontSize;
      lineNo.forEach((k, i) => {
        lineNo[
          i
        ] = `<span class='js-intent' style='width:${intentWidth}px; height: ${
          cfg.lineHeight
        }px'>${i + 1}</span>`;
      });
      complete += `<pre id="numberRow">${lineNo.join("\n")}</pre>`;
      intentWidth += 30;
    }
    container.style.fontSize = cfg.fontSize + "px";
    container.innerHTML = `${complete}<code id="output" style="margin-left: ${intentWidth}px; height: ${cfg.lineHeight}px;" tabindex="${cfg.tabIndex}">${markuped}</code></pre>`;
    var speed = ((text.length / 1024 / compileTime) * 1000).toFixed(3); //kb/s
    console.log(`total code analysed: ${(text.length / 1024).toFixed(3)} kb
found: ${out.tokens.length} tokens
compile time: ${compileTime.toFixed(4)} ms
compile speed: ${speed} kib/s`);
  }

  
  /**
   * tokenize input text
   *
   * @param {string} text
   * @param {Object} [ErrHandler={}]
   * @return {Array} tokens
   */
  function tokenize(text, ErrHandler = {}) {
    var len = text.length;
    var tokens = [],
      word = "",
      scopeTree = [],
      scope = "empty";
    var i = 0;
    while (i < len) {
      word = text.substring(i).match(/^[\wα-ζΑ-Ζ$]+/);
      if (word) {
        var v = word[0];
        var c = v.match(number) && text[i + v.length] == ".";
        if (c) {
          //possible number
          v += ".";
        }
        tokens.push(readWordToken(v));
        i += v.length;
        if (c) continue;
        mergeSameTypes();
      }
      if (i == len) break;
      /*
      after matching a word there will be a non alphanumeric(and non '$') code
      there will be something else the following code analyses that
      */
      var char = text[i]; // next character
      var next2 = text.substring(i, i + 2); // next two characters

      if (char == " " || char == "\t") {
        // next character is a space/tab
        var space = text.substring(i).match(/[\t ]+/)[0];
        addTextType(space)
      } else if (char == "\n") {
        // next character is a line break
        tokens.push({ type: T_NEWLINE });
        i++;
      } else if (next2 == "//" || next2 == "/*") {
        // comment ahead
        var comment = text.substring(i, len).match(commentRE)[0];
        i += comment.length;

        // splits comment on line breaks
        comment = comment.replaceSpecHTMLChars().split("\n");
        comment.forEach((line, index) => {
          tokens.push({ type: T_COMMENT, token: line });
          if (index < comment.length - 1) tokens.push({ type: T_NEWLINE });
        });
      } else if (char == "'" || char == '"' || char == "`") {
        // string ahead
        var str = text.substring(i, len).match(stringRE)[0];
        var slen = str.length, c = 0;
        debugger
        while (c < slen) {
          var $i = str.indexOf("${");
          if ($i > -1) {
            tokens.push({type: T_OPERATOR, token: "${"});
            var newStr = str.substring(0, $1);
            readStr(newStr);
            var out = tokenize(str.substring($1+2), {braceUnMatch: "break"});
            c += out.inputEnd;
            tokens.concat(out.tokens)
            tokens.push({type: T_OPERATOR, token: "}"});
          } else {
            c += str.length;
            readStr(str);
          }
        }
        function readStr(s){
          i += s.length;
          s = s.replaceSpecHTMLChars().split("\n");
          s.forEach((line, index) => {
            tokens.push({ type: T_STRING, token: line });
            if (index < s.length - 1) tokens.push({ type: T_NEWLINE });
          });
        }
      } else if (char.match(operatorRE)[0]) {
        // math operators
        if (char == "/") {
          // search for regular expressions
          var re = text.substring(i, len).match(regexRE);
          if (re) {
            // regular expression ahead
            tokens.push({ type: T_REGEX, token: re[0] });
            i += re[0].length;
          }
        }
        // finds next group of operators
        var operStr = text.substring(i).match(operatorRE)[0];
        i += operStr.length;
        tokens.push({
          type: T_OPERATOR,
          token: operStr.replaceSpecHTMLChars(),
        });
      } else if (char == "(") {
        // function name
        var tl = tokens.length;
        var prev = tokens[tl - 1] || emptyToken;
        var prevt = prev.token || "";
        var pprev = tokens[tl - 2] || emptyToken;
        var ppprev = tokens[tl - 3] || emptyToken;
        tokens.push({ type: T_LPAREN, token: "(" });
        i++;
        const isFunctionClause =
          prevt == "function" ||
          pprev.token == "function" ||
          ppprev.token == "function" || scopeTree[scopeTree.length-1] == "class";
        if (isFunctionClause) {
          // function defnition ahead
          // makes name of function colored to method
          if (prev.type == T_TEXT && prevt.match(nameCharRE)) {
            prev.type = T_METHOD;
          } else if (pprev.type == T_TEXT && pprev.token.match(nameCharRE)) {
            pprev.type = T_METHOD;
          }

          // reads arguments
          if (next2 != "()") {
            args = readArgumentsToken(i - 1);
            tokens = tokens.concat(args);
          }
        } else if (
          prevt.match(nameCharRE) &&
          /[\wα-ζΑ-Ζ$\s]+/.test(
            (prevt.reverse().match(/^(\s)*[\wα-ζΑ-Ζ$\s]+/) || [""])[0]
          )
        ) {
          //this is function calling clause
          if (prev.type.match(txt_obj) && prevt.match(nameCharRE)) {
            prev.type = T_FUNCTION;
          } else if (
            pprev.type.match(txt_obj) &&
            pprev.token.match(nameCharRE)
          ) {
            pprev.type = T_FUNCTION;
          } else if (
            ppprev.type.match(txt_obj) &&
            ppprev.token.match(nameCharRE)
          ) {
            ppprev.type = T_FUNCTION;
          }
        }
      } else if (char == "{") {
        // debugger;
        scopeTree.push(scope);
        scope = "empty";
        addTextType(char);
      } else if (char == "}") {
        addTextType(char);
        if (scope.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler.braceUnMatch == "break") {
          break;
        }
      } else {
        addTextType(char);
      }
      mergeSameTypes();
    }
    return {tokens: tokens, inputEnd: i};

    function addTextType(ch) {
      tokens.push({ type: T_TEXT, token: ch });
      i+=ch.length;
    }

    /*
    merges same type of consecutive tokens (except NEWLINE) into
    single one to minimize tokens to parse
    */
    function mergeSameTypes() {
      var tl = tokens.length;
      if (
        tl > 1 &&
        tokens[tl - 1].type == tokens[tl - 2].type &&
        tokens[tl - 1].type != T_NEWLINE
      ) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    }

    // read arguments
    function readArgumentsToken(k) {
      // reads and finds arguments of a function being defined
      var args = text.substring(k + 1).match(/[^)]*/)[0];
      var index = args.length + 1;
      var argarr = [];
      var w = "";
      for (var l = 0; l < args.length; l++) {
        var ch = args[l];
        if (ch.match(nameCharRE)) {
          w += ch;
        } else {
          if (ch == " " || ch == "\t") {
            w += ch;
          } else {
            argarr.push({ type: T_ARGUMENT, token: w });
            if (ch == "\n") argarr.push({ type: T_NEWLINE });
            else argarr.push({ type: T_TEXT, token: ch });
            w = "";
          }
        }
      }
      if (w != "") argarr.push({ type: T_ARGUMENT, token: w });
      if (text[k + index] == ")") {
        argarr.push({ type: T_OTHER, token: ")" }); // adds right paren if it was there
        index++;
      }
      i += index;
      return argarr;
    }

    // finds the type of word given
    function readWordToken(word) {
      if (word.match(KeywordRE)) {
        // Keyword
        if (word.match(/(function|if|do|while|for|class|catch|else|finally|switch|try)/)) {
          scope = word;
        }
        return { type: T_KEY, token: word };
      } else if (word.match(specials)) {
        // special objects
        return { type: T_FUNCTION, token: word };
      } else if (word.match(number)) {
        return { type: T_NUMBER, token: word };
      } else if (
        word.match(builtInObject) &&
        tokens[tokens.length - 2]?.token != "function" &&
        (tokens[tokens.length - 1]?.token || "")[0] != "."
      ) {
        // builtin objects word
        return { type: T_CAPITAL, token: word };
      } else if (
        (tokens[tokens.length - 1]?.token || "").endsWith(".") ||
        (tokens[tokens.length - 2]?.token || "").endsWith(".")
      ) {
        // object property
        return { type: T_OBJECTPROP, token: word };
      } else if (word == "arguments" && scopeTree[scopeTree.length - 1] == "function") {
        return { type: T_KEY, token: word };
      } else if ((word == "get" || word == "set") && scopeTree[scopeTree.length - 1] == "class") {
        return { type: T_KEY, token: word };
      } else {
        return { type: T_TEXT, token: word };
      }
    }
  }

  function parseToken(tokens, lineHeight) {
    var formatted = `<span class='js-newline' style="height:${lineHeight}px">`;
    for (var i = 0; i < tokens.length; i++) {
      var tkn = tokens[i],
        tokenType = tkn.type;
      var d = {
        TEXT: "name",
        OBJECTPROP: "objprop",
        KEY: "keyword",
        COMMENT: "comment",
        NUMBER: "number",
        FUNCTION: "function",
        ARGUMENT: "argument",
        CAPITAL: "capital",
        METHOD: "method",
        STRING: "string",
        REGEX: "regex",
        OPERATOR: "operator",
      };
      if (tokenType == "NEWLINE") {
        formatted += `</span><span class='js-newline' style="height:${lineHeight}px">`;
      } else if (tokenType == "OTHER" || tokenType == "LPAREN") {
        formatted += tkn.token;
      } else {
        formatted +=
          "<span class='js-" + d[tokenType] + "'>" + tkn.token + "</span>";
      }
    }
    return formatted;
  }
})();
