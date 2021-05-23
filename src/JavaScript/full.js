(function () {
  // useful stuffs

  // RegExes for matching stuffs
  //regular expressions
  var KeywordRE =
    /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|NaN|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/;
  var operatorRE = /[=+\-*/%!<>&|:?]*/;
  var nameCharRE = /[\wα-ζΑ-Ζ\$]/;
  var number = /^(\d*(\.\d*)?|0x[0-9a-f]*|0b[01]*|\d+(\.\d*)?(e|E)\d*)$/;
  var commentRE = /((\/\*[\s\S]*?\*\/|\/\*[\s\S]*)|(\/\/.*))/;
  var stringRE =
    /('(((\\)+(')?)|([^']))*')|("(((\\)+(")?)|([^"]))*")/;
  var regexRE =
    /^\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/;
  // builtIn objects
  var builtInObject =
    /^(AggregateError|Buffer|Array|ArrayBuffer|AsyncFunction|AsyncGenerator|AsyncGeneratorFunction|Atomics|BigInt|BigInt64Array|BigUint64Array|Boolean|DataView|Date|Error|EvalError|Float32Array|Float64Array|Function|Generator|GeneratorFunction|Int16Array|Int32Array|Int8Array|InternalError|Intl|JSON|Map|Math|Number|Object|Promise|Proxy|RangeError|ReferenceError|Reflect|RegExp|Set|SharedArrayBuffer|String|Symbol|SyntaxError|TypeError|URIError|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|WeakMap|WeakSet|WebAssembly)$/;

  // types of tokens
  const T_STRING = "STRING",
    T_KEY = "KEY",
    T_TEXT = "TEXT",
    T_OPERATOR = "OPERATOR",
    T_COMMENT = "COMMENT",
    T_NUMBER = "NUMBER",
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
    var codes = document.getElementsByClassName("js-colorful");
    if (codes.length) {
      for (var k = 0; k < codes.length; k++) {
        var block = codes[k];
        var ln = block.getAttribute("lineNumbering")
        var lnBool = typeof ln == "string"?true:false;
        var cfg = {
          tabIndex: block.getAttribute("tabindex") || config.tabIndex,
          fontSize: block.getAttribute("fontsize") || config.fontSize,
          lineHeight: block.getAttribute("lineheight") || config.lineHeight,
          enableLineNumbering:lnBool
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
    var complete;
    var intentWidth = 0;
    if (cfg.enableLineNumbering) {
      var lineCount = text.match(/\n/g)?.length + 1 || 1;
      complete = "<table border=0><tr><td><pre class='colorful-numberRow'>";
      for (var i = 1; i <= lineCount; i++) {
        complete += i;
        if (i < lineCount) complete += "\n"
      }
      complete += '</pre></td><td><pre class="colorful-code"><code id="colorful-output" tabindex='+cfg.tabIndex+'>'+markuped+'</code></pre></td></tr></table>';
    } else {
      complete = '<pre class="colorful-code"><code id="colorful-output" tabindex='+cfg.tabIndex+'>'+markuped+'</code></pre>'
    }
    container.style.fontSize = cfg.fontSize + "px";
    container.innerHTML = complete;
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
      scope = "empty",
      braceUnMatchEnd = false;
    var i = 0;
    while (i < len) {
      word = text.substring(i).match(/^[\wα-ζΑ-Ζ$]+/);
      var isNum, lastTkn;
      if (word) {
        var v = word[0];
        isNum = v.match(number)
        var c = isNum && text[i + v.length] == ".";
        lastTkn = tokens[tokens.length-1] || {};
        var c2 = /[\.]$/.test(lastTkn.token) && isNum;
        if (c) {
          v += ".";
        }
        i += v.length;
        if (c2) {
          v = "."+v;
          if (lastTkn.token != ".") lastTkn.token = lastTkn.token.substr(0, lastTkn.token.length-1);
          else tokens.pop();
        }
        tokens.push(readWordToken(v));
        if (c) continue;
        mergeSameTypes();
      }
      if (i == len) break;
      lastTkn = tokens[tokens.length-1] || emptyToken;
      /*
      after matching a word there will be a non alphanumeric(and non '$') code
      there will be something else the following code analyses that
      */
      var char = text[i]; // next character
      var next2 = text.substr(i, 2); // next two characters

      if (/\s/.test(char)) {
        // next character is a space/tab/line break
        var space = text.substring(i).match(/[\s]+/)[0];
        lastTkn.token += space;
        i += space.length;
      } else if (next2 == "//" || next2 == "/*") {
        // comment ahead
        var comment = text.substring(i, len).match(commentRE)[0];
        i += comment.length;
        tokens.push({ type: T_COMMENT, token: comment.replaceSpecHTMLChars() });
        
      } else if (char == "'" || char == '"') {
        // string ahead
        var str = text.substring(i, len).match(stringRE)[0];
        i += str.length
        readStr(str);
      } else if (char == "`") {
        // multiline string ahead

        tokens.push({type: T_STRING, token: "`"});
        i++;
        var tkn = "";
        while (i < len) {
          var ch = text[i];
          if (ch != "`") {
            if (text.substr(i, 2) == "${") {
              readStr(tkn);
              tkn = "";
              tokens.push({type: T_OPERATOR, token: "${"});
              i+=2;
              var out = tokenize(text.substring(i), {braceUnMatch: "break"});
              if (out.tokens.length) tokens = tokens.concat(out.tokens)
              if (out.braceUnmatchEnd) {
                tokens.push({type: T_OPERATOR, token: "}"});
                i++;
              }
              i += out.inputEnd;
            } else {
              tkn += ch;
              i++;
            }
          } else if (text[i - 1] == "\\") {
            if (text[i - 2] != "//") {
              tkn += ch;
              i++;
            } else {
              readStr(tkn);
              break;
            }
          } else {
            tkn += ch;
            i++;
            break;
          }
          
        }
        if (tkn != "") readStr(tkn);
        
      } else if (char.match(operatorRE)[0]) {
        // math operators
        if (char == "/" && !/[\wα-ζΑ-Ζ$]/.test(text[i - 1])) {
          // search for regular expressions
          var re = text.substring(i, len).match(regexRE);
          if (re) {
            // regular expression ahead
            tokens.push({ type: T_REGEX, token: re[0] });
            i += re[0].length;
          }
        } 
        var operators = text.substring(i).match(operatorRE)[0];
        if (operators == "=>") {
          if (lastTkn.type == "TEXT") {
            lastTkn.type = "ARGUMENT";
          } else if (lastTkn.type == "OTHER" && /\)\s*$/.test(lastTkn.token)) {
            var txt = text.substring(0, i-1).reverse().match(/[^(]*/)[0]
          }
        }
        // finds next group of operators
        i += operators.length;
        tokens.push({
          type: T_OPERATOR,
          token: operators.replaceSpecHTMLChars(),
        });
      } else if (char == "(") {
        // function name
        var tl = tokens.length;
        var prev = lastTkn;
        var prevt = prev.token || "";
        var pprev = tokens[tl - 2] || emptyToken;
        var ppprev = tokens[tl - 3] || emptyToken;
        tokens.push({ type: T_OTHER, token: "(" });
        i++;
        const isFunctionClause =
          prevt.substr(0,8) == "function" ||
          pprev.token.substr(0,8) == "function" ||
          ppprev.token.substr(0,8) == "function" || scopeTree[scopeTree.length-1] == "class";
        var prevtIsCh = nameCharRE.test(prevt);
        var pprevtIsCh = nameCharRE.test(pprev.token);
        if (isFunctionClause) {
          // function defnition ahead
          // makes name of function colored to method
          if (prev.type == T_TEXT && prevtIsCh) {
            prev.type = T_METHOD;
          } else if (pprev.type == T_TEXT && pprevtIsCh) {
            pprev.type = T_METHOD;
          }

          // reads arguments
          if (next2 != "()") {
            var argstr = text.substring(i).match(/[^)]*/)[0];
            tokens = tokens.concat(readArgumentsToken(argstr));
          }
        } else if (
          prevtIsCh &&
          /[\wα-ζΑ-Ζ$\s]+/.test(
            (prevt.reverse().match(/^(\s)*[\wα-ζΑ-Ζ$\s]+/) || [""])[0]
          )
        ) {
          //this is function calling clause
          if ((prev.type == "TEXT" || prev.type == "OBJECTPROP") && prevtIsCh) {
            prev.type = T_METHOD;
          } else if (
            (pprev.type == "TEXT" || pprev.type == "OBJECTPROP") &&
            pprevtIsCh
          ) {
            pprev.type = T_METHOD;
          } else if (
            (ppprev.type == "TEXT" || ppprev.type == "OBJECTPROP") &&
            nameCharRE.test(ppprev.token)
          ) {
            ppprev.type = T_METHOD;
          }
        }
      } else if (char == "{") {
        scopeTree.push(scope);
        scope = "empty";
        addOtherType(char);
      } else if (char == "}") {
        if (scopeTree.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler.braceUnMatch == "break") {
          braceUnMatchEnd = true
          break;
        }
        addOtherType(char);
      } else {
        addOtherType(char);
      }
      mergeSameTypes();
    }
    console.log(tokens)
    return {tokens: tokens, inputEnd: i, braceUnmatchEnd: braceUnMatchEnd};

    function addOtherType(ch) {
      tokens.push({type: "OTHER", token:ch});
      i++;
    }
    
    function readStr(str){
      tokens.push({ type: T_STRING, token: str.replaceSpecHTMLChars() });
    }

    /*
    merges same type of consecutive tokens into
    single one to minimize tokens to parse
    */
    function mergeSameTypes() {
      var tl = tokens.length;
      if (tokens[tl - 1].type == tokens[tl - 2]?.type) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    }

    // read arguments
    function readArgumentsToken(args) {
      // reads and finds arguments of a function being defined
      var index = args.length + 1;
      var argarr = [];
      var w = "";
      for (var l = 0; l < args.length; l++) {
        var ch = args[l];
        if (ch.match(nameCharRE)) {
          w += ch;
        } else {
          if (/\s/.test(ch)) {
            w += ch;
          } else {
            argarr.push({ type: T_ARGUMENT, token: w });
            argarr.push({ type: T_TEXT, token: ch });
            w = "";
          }
        }
      }
      if (w != "") argarr.push({ type: T_ARGUMENT, token: w });
      if (text[i + index] == ")") {
        argarr.push({ type: T_OTHER, token: ")" }); // adds right paren if it was there
        index++;
      }
      i += index-1;
      return argarr;
    }

    // finds the type of word given
    function readWordToken(word) {
      if (KeywordRE.test(word)) {
        // Keyword
        if (/(function|if|do|while|for|class|catch|else|finally|switch|try)/.test(word)) {
          scope = word;
        }
        return { type: T_KEY, token: word };
      } else if (number.test(word)) {
        return { type: T_NUMBER, token: word };
      } else if (
        builtInObject.test(word) &&
        tokens[tokens.length - 2]?.token != "function" &&
        lastTkn.token[0] != "."
      ) {
        // builtin objects word
        return { type: T_CAPITAL, token: word };
      } else if (
        (lastTkn.token || "").endsWith(".") ||
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

  function parseToken(tokens) {
    var formatted = ``;
    for (var i = 0; i < tokens.length; i++) {
      var tkn = tokens[i],
        tokenType = tkn.type;
      var d = {
        TEXT: "name",
        OBJECTPROP: "objprop",
        KEY: "keyword",
        COMMENT: "comment",
        NUMBER: "number",
        ARGUMENT: "argument",
        CAPITAL: "capital",
        METHOD: "method",
        STRING: "string",
        REGEX: "regex",
        OPERATOR: "operator"
      };
      if (tokenType != "OTHER") {
        formatted +=
          "<span class='js-" + d[tokenType] + "'>" + tkn.token + "</span>";
      } else {
        formatted += tkn.token;
      }
    }
    return formatted;
  }
})();