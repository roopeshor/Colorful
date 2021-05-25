(function () {
  // useful stuffs

  // RegExes 
  var KeywordRE =
    /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|NaN|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/;
  var operatorRE = /[=+\-*/%!<>&|:?]*/;
  var nameCharRE = /^[\w\u00C0-\uffff\$]+/;
  var number = /^(\d*(\.\d*)?|0x[0-9a-f]*|0b[01]*|\d+(\.\d*)?(e|E)\d*)$/;
  var commentRE = /((\/\*[\s\S]*?\*\/|\/\*[\s\S]*)|(\/\/.*))/;
  var regexRE =
    /^\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/;
  // builtIn objects
  var builtInObject =
    /^(AggregateError|Buffer|Array|ArrayBuffer|AsyncFunction|AsyncGenerator|AsyncGeneratorFunction|Atomics|BigInt|BigInt64Array|BigUint64Array|Boolean|DataView|Date|Error|EvalError|Float32Array|Float64Array|Function|Generator|GeneratorFunction|Int16Array|Int32Array|Int8Array|InternalError|Intl|JSON|Map|Math|Number|Object|Promise|Proxy|RangeError|ReferenceError|Reflect|RegExp|Set|SharedArrayBuffer|String|Symbol|SyntaxError|TypeError|URIError|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|WeakMap|WeakSet|WebAssembly)$/;
  var whitespace = /[\s]+/;
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
        var ln = block.getAttribute("lineNumbering");
        var lnBool = typeof ln == "string" ? true : false;
        var cfg = {
          tabIndex: block.getAttribute("tabindex") || config.tabIndex,
          fontSize: block.getAttribute("fontsize") || config.fontSize,
          lineHeight: block.getAttribute("lineheight") || config.lineHeight,
          enableLineNumbering: lnBool,
        };
        highlight(codes[k], cfg);
      }
    }
  };

  function highlight(container, cfg) {
    var text = container.innerText;

    var d1 = window.performance.now();
    var out = tokenize(text);
    var markuped = parseToken(out.tokens, cfg.lineHeight);
    var compileTime = window.performance.now() - d1;
    var complete;
    if (cfg.enableLineNumbering) {
      var lineCount = text.match(/\n/g)?.length + 1 || 1;
      complete = "<table border=0><tr><td><pre class='colorful-numberRow'>";
      for (var i = 1; i <= lineCount; i++) {
        complete += i;
        if (i < lineCount) complete += "\n";
      }
      complete +=
        '</pre></td><td><pre class="colorful-code"><code id="colorful-output" tabindex=' +
        cfg.tabIndex +
        ">" +
        markuped +
        "</code></pre></td></tr></table>";
    } else {
      complete =
        '<pre class="colorful-code"><code id="colorful-output" tabindex=' +
        cfg.tabIndex +
        ">" +
        markuped +
        "</code></pre>";
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
      word = text.substring(i).match(nameCharRE);
      var isNum, lastTkn;
      if (word) {
        var v = word[0];
        isNum = v.match(number);
        var c = isNum && text[i + v.length] == ".";
        lastTkn = tokens[tokens.length - 1] || {};
        var c2 = /[\.]$/.test(lastTkn.token) && isNum;
        // debugger
        if (c) {
          v += ".";
        }
        i += v.length;
        if (c2) {
          v = "." + v;
          if (lastTkn.token != ".") {
            if (lastTkn.type == T_NUMBER) {
              lastTkn.token+=word;
              continue
            } else {
              lastTkn.token = lastTkn.token.substr(0, lastTkn.token.length - 1);
            }
          } else {
            tokens.pop();
          }
        }
        readWordToken(v);
        if (c) continue;
        window.Colorful.mergeSameTypes(tokens);
      }
      if (i == len) break;
      lastTkn = tokens[tokens.length - 1] || emptyToken;
      /*
      after matching a word there will be a non alphanumeric(and non '$') code
      there will be something else the following code analyses that
      */
      var char = text[i]; // next character
      var next2 = text.substr(i, 2); // next two characters

      if (whitespace.test(char)) {
        // next character is a space/tab/line break
        var space = text.substring(i).match(whitespace)[0];
        if (lastTkn.token) lastTkn.token += space;
        else addToken(T_TEXT, space)
        i += space.length;
      } else if (char == "'" || char == '"' || char == "`") {
        addToken(T_STRING, char);
        i++;
        var str = "";
        var slashes = 0;
        while (i < len) {
          var ch = text[i];
          if (ch != char) {
            if (ch!="\\") slashes = 0;
            else slashes++;
            if (char=="`" && text.substr(i, 2) == "${") {
              addToken(T_STRING, str);
              str = "";
              addToken(T_OPERATOR, "${");
              i += 2;
              var out = tokenize(text.substring(i),{braceUnMatch: "break" });
              if (out.tokens.length) tokens = tokens.concat(out.tokens);
              if (out.braceUnmatchEnd) {
                addToken(T_OPERATOR, "}");
                i++;
              }
              i += out.inputEnd;
            } else {
              str += ch;
              i++;
            }
          } else {
            
            str += ch;
            i++;
            if (slashes%2 == 0) break;
          }
        }
        if (str != "") addToken(T_STRING, str);
      } else if (char.match(operatorRE)[0]) {
        var nxt = text.substring(i, len);
        // math operators
        if (next2 == "//" || next2 == "/*") {
        // comment ahead
          var comment = nxt.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment);
        } else if (char == "/" && !(lastTkn.type == T_TEXT || lastTkn.type == T_OBJECTPROP) && regexRE.test(nxt)) {
          // regular expression ahead
          var re = nxt.match(regexRE)[0];
          addToken(T_REGEX, re);
          i += re.length;
        } else {
          //operator
          addToken(T_OPERATOR, char);
          i++;
        }
      } else if (char == "(") {
        // function name
        var tl = tokens.length;
        var prev = lastTkn;
        var prevt = prev.token || "";
        var pprev = tokens[tl - 2] || emptyToken;
        addToken(T_OTHER, "(");
        i++;
        scopeTree.push("paren");
        const isFunctionClause =
          prevt.substr(0, 8) == "function" ||
          pprev.token.substr(0, 8) == "function" ||
          scopeTree[scopeTree.length - 1] == "class";
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
            var tkn = tokenize(text.substring(i), { parenUnMatch: "break" });
            var tkns = tkn.tokens;
            readArgumentsInTokens(tkns);
            i += tkn.inputEnd;
          }
        } else if (
          prevtIsCh &&
          (prev.type == "TEXT" || prev.type == "OBJECTPROP") &&
          /[\w\u00C0-\uffff$\s]+/.test((prevt.split("").reverse().join("").match(/^(\s)*[\w\u00C0-\uffff$\s]+/) || [""])[0])
        ) {
          //this is function calling clause
            prev.type = T_METHOD;
        }
      } else if (char == ")") {
        if (scopeTree.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler.parenUnMatch == "break") {
          parenUnMatchEnd = true;
          break;
        }
        addToken("OTHER", char);
        i++;
      } else if (char == "{") {
        addToken("OTHER", char);
        i++;
        scopeTree.push(scope);
        scope = "empty";
      } else if (char == "}") {
        if (scopeTree.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler.braceUnMatch == "break") {
          braceUnMatchEnd = true;
          break;
        }
        addToken("OTHER", char);
        i++;
      } else if (char == "[") {
        addToken("OTHER", char);
        i++;
        scopeTree.push(scope);
        scope = "bracket";
      } else if (char == "]") {
        if (scopeTree.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler.bracketUnMatch == "break") {
          bracketUnMatch = true;
          break;
        }
        addToken("OTHER", char);
        i++;
      } else {
        addToken("OTHER", char);
        i++;
      }
      window.Colorful.mergeSameTypes(tokens);
    }
    if (char == "\n") tokens[tokens.length-1].token += "\n"; // quick fix
    return { tokens: tokens, inputEnd: i, braceUnmatchEnd: braceUnMatchEnd };
    function addToken(type, token) {
      tokens.push({ type: type, token: token.replaceSpecHTMLChars(), scopeLevel: scopeTree.length });
    }

    // read arguments
    function readArgumentsInTokens(tks, base=0, increase=true) {
      for (var k = 0; k < tks.length; k++) {
        var tk = tks[k];
        if (
          tk.type == T_TEXT &&
          tk.scopeLevel == base &&
          tks[k - 1]?.type != T_OPERATOR
        ) {
          tk.type = T_ARGUMENT;
        }
        if (increase) tk.scopeLevel++;
      }
      tokens = tokens.concat(tks);
    }

    // finds the type of word given
    function readWordToken(word) {
      var pprevt = tokens[tokens.length - 2]?.token || "";
      var prevt = lastTkn.token || "";
      if (
        KeywordRE.test(word) || // global keywords
        (word == "arguments" &&
          scopeTree[scopeTree.length - 1] == "function") || // argument inside function clause
        ((word == "get" || word == "set") &&
          scopeTree[scopeTree.length - 1] == "class") // get/set inside class scope
      ) {
        // Keyword
        if (
          /(function|if|do|while|for|class|catch|else|finally|switch|try|)/.test(
            word
          )
        ) {
          scope = word;
        }
        addToken(T_KEY, word);
      } else if (number.test(word)) {
        addToken(T_NUMBER, word);
      } else if (
        builtInObject.test(word) &&
        !/^(function|var|const|let)/.test(prevt) &&
        prevt[0] != "."
      ) {
        // builtin objects word
        addToken(T_CAPITAL, word);
      } else if (prevt.endsWith(".") || pprevt.endsWith(".")) {
        // object property
        addToken(T_OBJECTPROP, word);
      } else {
        addToken(T_TEXT, word);
      }
    }
  }

  function parseToken(tokens) {
    var formatted = ``;
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
        OPERATOR: "operator",
      };
    for (var i = 0; i < tokens.length; i++) {
      var tkn = tokens[i],
        tokenType = tkn.type;
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