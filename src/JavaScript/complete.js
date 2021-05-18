(function () {
  // useful stuffs

  // RegExes for matching stuffs
  //regular expressions
  var KeywordRE =
    /^(arguments|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|eval|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|native|new|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)$/;
  var operatorRE = /(\=|\+|\-|\*|\/|%|!|<|>|&|\|)*/;
  var nameCharRE = /[a-zA-Z0-9_\$]/;
  var number = /^((\d*(\.)?\d*)|(0x[0-9a-f]*)|(0b[01]*))$/;
  var nullTypes = /^(null|NaN|undefined)$/;
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
    T_LPAREN = "PAREN",
    T_NULLTYPE = "NULLTYPE";
  // an empty token
  var emptyToken = { type: "", token: "" };

  // default configurations for output
  var config = {
    tabIndex: 4,
    fontSize: 16, // in px
    enableLineNumbering: true,
    lineHeight: 20,
    performanceMonitoring: true,
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
          enableLineNumbering: block.getAttribute("linenumbering") || config.enableLineNumbering,
          performanceMonitoring: block.getAttribute("moniter") || config.performanceMonitoring
        }
        highlight(codes[k], cfg);
      }
    }
  };

  function highlight(container, cfg) {
    var w_h = 0.5498367766955267; // width/height of a monospace number
    var text = container.innerText;
    var d1 = window.performance.now();
    var tokens = tokenize(text);
    var markuped = parseToken(tokens, cfg.lineHeight);
    var compileTime = window.performance.now() - d1;
    var complete = "<pre class='syntex-code'>";
    var intentWidth = 0;
    if (cfg.enableLineNumbering) {
      var lineCount = text.match(/\n/g)?.length || 1;
      var lineNo = new Array(lineCount).fill(1);
      intentWidth = String(lineCount).length * w_h * cfg.fontSize;
      lineNo.forEach((k, i) => {
        lineNo[i] = `<span class='js-intent' style='width:${intentWidth}px; height: ${cfg.lineHeight}px'>${i + 1}</span>`;
      });
      complete += `<pre id="numberRow">${lineNo.join("\n")}</pre>`;
      intentWidth += 30;
    }
    container.style.fontSize = cfg.fontSize + "px"
    container.innerHTML = `${complete}<code id="output" style="margin-left: ${intentWidth}px; height: ${cfg.lineHeight}px;" tabindex="${cfg.tabIndex}">${markuped}</code></pre>`;

    // performance report
    var totalTime = window.performance.now() - d1;
    if (cfg.performanceMonitoring) {
      console.log(`total code analysed: ${(len / 1024).toFixed(3)} kb
  found: ${tokens.length} tokens
  compile time: ${compileTime.toFixed(4)} ms
  compile speed: ${((len / 1024 / compileTime) * 1000).toFixed(3)} kib/s
  total time: ${totalTime.toFixed(4)} ms`);
    }
    return tokens;
  }

  function tokenize(text) {
    len = text.length;
    var tokens = [],
      word = "";

    for (var i = 0; i < len; i++) {
      var char = text[i];
      if (!char.match(nameCharRE)) {
        // word analysis
        if (word != "") {
          if (word.match(number) && char == ".") {
            word += ".";
            continue;
          } else {
            tokens.push(readWordToken(word));
          }
        }
        var next2 = text.substring(i, i + 2);
        // analysin various symbols

        if (char == "\n") {
          tokens.push({ type: T_NEWLINE });
        } else if (next2 == "//" || next2 == "/*") {
          // comment
          var comment = text.substring(i, len).match(commentRE)[0];
          i += comment.length - 1;
          comment = comment.replaceSpecHTMLChars().split("\n");
          comment.forEach((line, index) => {
            tokens.push({ type: T_COMMENT, token: line });
            if (index < comment.length - 1) tokens.push({ type: T_NEWLINE });
          });
        } else if (char.match(/['"`]/)) {
          var str = text.substring(i, len).match(stringRE)[0];
          i += str.length - 1;
          str = str.replaceSpecHTMLChars().split("\n");
          str.forEach((line, index) => {
            tokens.push({ type: T_STRING, token: line });
            if (index < str.length - 1) tokens.push({ type: T_NEWLINE });
          });
          // tokens.push({ type: T_STRING, token: str.replaceSpecHTMLChars() });
        } else if (char.match(operatorRE)[0]) {
          // math operators
          if (char == "/") {
            var re = text.substring(i, len).match(regexRE);
            if (re) {
              tokens.push({ type: T_REGEX, token: re[0] });
              i += re[0].length;
            }
          }
          var operStr = text.substring(i).match(operatorRE)[0];
          i += operStr.length - 1;
          tokens.push({
            type: T_OPERATOR,
            token: operStr.replaceSpecHTMLChars(),
          });
        } else if (char == "(") {
          // function name
          var tl = tokens.length;
          var prev = tokens[tl - 1] || emptyToken;
          var prevt = prev.token;
          var pprev = tokens[tl - 2] || emptyToken;
          var ppprev = tokens[tl - 3] || emptyToken;
          tokens.push({ type: T_LPAREN, token: "(" });
          const isFunctionClause =
            prevt == "function" ||
            pprev.token == "function" ||
            ppprev.token == "function";
          /** if following condition is true then it would be function clause
           * cases:
           * 1: function name (args)
           * 2: function name(args)
           * 3: function (args)
           * 4: function(args)
           */
          if (isFunctionClause) {
            // makes name of function colored to method
            if (prev.type == T_TEXT && prevt.match(nameCharRE)) {
              prev.type = T_METHOD;
            } else if (pprev.type == T_TEXT && pprev.token.match(nameCharRE)) {
              pprev.type = T_METHOD;
            }

            // reads arguments
            if (next2 != "()") {
              args = readArgumentsToken(i);
              tokens = tokens.concat(args);
            }
          } else if (
            prevt.match(nameCharRE) &&
            /[a-zA-Z0-9_$\s]+/.test(
              (prevt.reverse().match(/^(\s)*[a-zA-Z0-9_$\s]+/) || [""])[0]
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
        } else {
          tokens.push({ type: T_TEXT, token: char });
        }
        word = "";
      } else if (char.match(nameCharRE)) {
        word += char;
      }
      mergeSameTypes();
    }
    if (word != "") tokens.push(readWordToken(word));
    return tokens;

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
    function readArgumentsToken(k) {
      // reads and finds arguments of a function being defined
      var args = text.substring(k + 1).match(/[^)]*/)[0];
      const index = args.length + 1;
      var argarr = [];
      var w = "";
      for (var l = 0; l < args.length; l++) {
        var ch = args[l];
        if (ch.match(nameCharRE)) {
          w += ch;
        } else {
          if (ch.match(/[\t ]/)) {
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
      if (text[k + index] == ")") argarr.push({ type: T_TEXT, token: ")" }); // adds right paren if it was there
      i = index + k;
      return argarr;
    }

    // finds the type of word given
    function readWordToken(word) {
      if (word.match(KeywordRE)) {
        // Keyword
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
        //eg: Buffer, Array, String, ...
        return { type: T_CAPITAL, token: word };
      } else if (
        (tokens[tokens.length - 1]?.token || "").endsWith(".") ||
        (tokens[tokens.length - 2]?.token || "").endsWith(".")
      ) {
        return { type: T_OBJECTPROP, token: word };
      } else if (word.match(nullTypes)) {
        return { type: T_NULLTYPE, token: word };
      } else {
        return { type: T_TEXT, token: word };
      }
    }
  };

  function parseToken(tokens, lineHeight) {
    var formatted = `<span class='js-newline' style="height:${lineHeight}px">`;
    for (var i = 0; i < tokens.length; i++) {
      var tkn = tokens[i],
        tokenType = tkn.type;
      if (tokenType.match(/(TEXT|PAREN)/)) {
        formatted += tkn.token;
      } else if (tokenType == T_NEWLINE) {
        formatted += `</span><span class='js-newline' style="height:${lineHeight}px">`;
      } else if (tokenType == T_OBJECTPROP) {
        formatted += "<span class='js-objprop'>" + tkn.token + "</span>";
      } else if (tokenType == T_KEY) {
        formatted += "<span class='js-keyword'>" + tkn.token + "</span>";
      } else if (tokenType == T_COMMENT) {
        formatted += "<span class='js-comment'>" + tkn.token + "</span>";
      } else if (tokenType == T_NUMBER) {
        formatted += "<span class='js-number'>" + tkn.token + "</span>";
      } else if (tokenType == T_FUNCTION) {
        formatted += "<span class='js-function'>" + tkn.token + "</span>";
      } else if (tokenType == T_ARGUMENT) {
        formatted += "<span class='js-argument'>" + tkn.token + "</span>";
      } else if (tokenType == T_CAPITAL) {
        formatted += "<span class='js-capital'>" + tkn.token + "</span>";
      } else if (tokenType == T_METHOD) {
        formatted += "<span class='js-method'>" + tkn.token + "</span>";
      } else if (tokenType == T_STRING) {
        formatted += "<span class='js-string'>" + tkn.token + "</span>";
      } else if (tokenType == T_REGEX) {
        formatted += "<span class='js-regex'>" + tkn.token + "</span>";
      } else if (tokenType == T_OPERATOR) {
        formatted += "<span class='js-operator'>" + tkn.token + "</span>";
      } else if (tokenType == T_NULLTYPE) {
        formatted += "<span class='js-nulltype'>" + tkn.token + "</span>";
      }
    }
    return formatted;
  }
})();
