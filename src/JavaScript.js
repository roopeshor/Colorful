(function (w) {
  // RegExes
  var KeywordRE =
    /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|NaN|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/;
  var operatorRE = /[=+\-*/%!<>&|:?]*/;
  var nameCharRE = /^[\w\u00C0-\uffff\$]+/;
  var number = /^(\d*(\.\d*)?|0x[0-9a-f]*|0b[01]*|\d+(\.\d*)?(e|E)\d+)$/;
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
  /**
   * combines tokenizer and parser
   * @param {HTMLElement} container
   * @param {Object} cfg
   */
  function highlight(container, cfg=w.Colorful.config) {
    var text = container.innerText;
    var d1 = w.performance.now();
    var out = tokenize(text);
    var markuped = parse(out.tokens);
    var compileTime = w.performance.now() - d1;
    container.innerHTML = w.Colorful.finishUp(cfg, text, markuped);
    var speed = ((text.length / 1024 / compileTime) * 1000).toFixed(3); //kb/s
    console.log(
      `total code analysed: ${(text.length / 1024).toFixed(3)} kb\nfound: ${
        out.tokens.length
      } tokens\ncompile time: ${compileTime.toFixed(
        4
      )} ms\ncompile speed: ${speed} kib/s`
    );
  }

  /**
   * tokenize input text
   *
   * @param {String} text
   * @param {Object} [ErrHandler={}]
   * @return {Object} tokens
   */
  function tokenize(text, ErrHandler = {}) {
    var len = text.length;
    var tokens = [],
      word = "",
      scopeTree = [],
      scope = "empty";
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
        if (c) {
          v += ".";
        }
        i += v.length;
        if (c2) {
          v = "." + v;
          if (lastTkn.token != ".") {
            if (lastTkn.type == T_NUMBER) {
              lastTkn.token += word;
              continue;
            } else {
              lastTkn.token = lastTkn.token.substr(0, lastTkn.token.length - 1);
            }
          } else {
            tokens.pop();
          }
        }
        readWordToken(v);
        if (c) continue;
        w.Colorful.mergeSameTypes(tokens);
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
        else addToken(T_TEXT, space);
        i += space.length;
      } else if (char == "'" || char == '"' || char == "`") {
        addToken(T_STRING, char);
        i++;
        var str = "";
        var slashes = 0; // number of backslashes
        var re =
          char == "'" ? /^[^'\\]+/ : char == '"' ? /^[^"\\]+/ : /^[^`\\${]+/;
        while (i < len) {
          str = text.substring(i).match(re);
          if (str) {
            addToken(T_STRING, str[0]);
            i += str[0].length;
            slashes = 0;
          }
          var ch = text[i];
          if (ch == "\\") {
            var slsh = text.substring(i).match(/[\\]+/)[0];
            addToken(T_STRING, slsh);
            slashes += slsh.length;
            i += slsh.length;
          } else if (ch == char) {
            addToken(T_STRING, ch);
            i++;
            if (slashes % 2 == 0) break;
          } else if (text.substr(i, 2) == "${") {
            addToken(T_OPERATOR, "${");
            i += 2;
            var nxt = text.substring(i);
            var out = tokenize(nxt, { braceUnmatch: "break" });
            if (out.tokens.length) tokens = tokens.concat(out.tokens);
            i += out.inputEnd;
            if (out.inputEnd != nxt.length) {
              addToken(T_OPERATOR, "}");
              i++;
            } else if (text[i - 1] == "\n") {
              tokens[tokens.length - 1].token += "\n"; // quick fix
            }
          }
        }
      } else if (char.match(operatorRE)[0]) {
        var nxt = text.substring(i);
        // math operators
        if (next2 == "//" || next2 == "/*") {
          // comment ahead
          var comment = nxt.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment);
        } else if (char == "/" && !(lastTkn.type == T_TEXT ||lastTkn.type == T_OBJECTPROP ||lastTkn.type == T_NUMBER) &&  regexRE.test(nxt)) {
          // regular expression ahead
          var continueWork = true;
          if (lastTkn.type == T_COMMENT) {
            for (var k = tokens.length - 1; k >= 0; k--) {
              var tk = tokens[k];
              if (tk.type == T_COMMENT) {
                continue;
              } else if (
                tk.type == T_TEXT ||
                tk.type == T_OBJECTPROP ||
                tk.type == T_NUMBER
              ) {
                continueWork = false;
                break;
              } else {
                break;
              }
            }
          }
          if (continueWork) {
            var re = nxt.match(regexRE)[0];
            addToken(T_REGEX, re);
            i += re.length;
          } else {
            //operator
            addToken(T_OPERATOR, char);
            i++;
          }
        } else if (next2 == "=>") {
          if (lastTkn.type == "TEXT") {
            lastTkn.type = "ARGUMENT";
          } else if (/\)\s*$/.test(lastTkn.token)) {
            var initialScopeLevel = scopeTree.length;
            var argsarr = [tokens[tokens.length-1]];
            for (var k = tokens.length - 2; k >= 0; k--) {
              var tk = tokens[k];
              argsarr.push(tk);
              if (tk.type == T_OTHER && tk.scopeLevel == initialScopeLevel) {
                tokens.splice(k);
                break
              }
            }
            argsarr.reverse();
            readArgumentsInTokens(argsarr, initialScopeLevel+1, false);
          }
          addToken(T_OPERATOR, next2);
          i+=2;
        } else {
          //operator
          addToken(T_OPERATOR, char);
          i++;
        }
      } else if (char == "(") {
        // function name
        var prev = lastTkn;
        var prevt = prev.type;
        var pprev = tokens[tokens.length - 2] || emptyToken;
        const isFunctionClause =
          (prev.token.substr(0, 8) == "function" && prevt == "KEY") ||
          (pprev.token.substr(0, 8) == "function" && pprev.type == "KEY") ||
          scopeTree[scopeTree.length - 1] == "class";
        addToken(T_OTHER, "(");
        i++;
        scopeTree.push("(");
        scope = "("
        // makes name of function colored to method
        if (prevt == "TEXT" || prevt == "OBJECTPROP") {
          prev.type = T_METHOD;
        }
        if (isFunctionClause && next2 != "()") {
          // reads arguments
          var tkn = tokenize(text.substring(i), { parenUnmatch: "break" });
          var tkns = tkn.tokens;
          readArgumentsInTokens(tkns);
          i += tkn.inputEnd;
        }
      } else if (char == "{" || char == "[") {
        addToken("OTHER", char);
        i++;
        scopeTree.push(scope);
        scope = char;
      } else if (char == "}" || char == ")" || char == "]") {
        var handler = {
          "}":"braceUnmatch",
          ")":"parenUnmatch",
          "]":"bracketUnmatch"
        }
        if (scopeTree.length > 0) {
          scopeTree.pop();
        } else if (ErrHandler[handler[char]] == "break") {
          break;
        }
        addToken("OTHER", char);
        i++;
      } else {
        addToken("OTHER", char);
        i++;
      }
      w.Colorful.mergeSameTypes(tokens);
    }
    if (char == "\n") tokens[tokens.length - 1].token += "\n"; // quick fix
    return { tokens: tokens, inputEnd: i };
    function addToken(type, token) {
      tokens.push({
        type: type,
        token: token.replaceSpecHTMLChars(),
        scopeLevel: scopeTree.length,
      });
    }

    // read arguments
    function readArgumentsInTokens(tks, base = 0, increase = true) {
      for (var k = 0; k < tks.length; k++) {
        var tk = tks[k];
        if (
          (tk.type == T_TEXT || tk.type == T_CAPITAL) &&
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

  /**
   * parse tokens to generate html string
   * @param {Array} tokens array of tokens
   * @return {String}
   */
  function parse(tokens) {
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
          "<span class='" + d[tokenType] + "'>" + tkn.token + "</span>";
      } else {
        formatted += tkn.token;
      }
    }
    return formatted;
  }

  w.Colorful.langs.push("JS");
  w.Colorful.compilers.JS = {
    compile: highlight,
    tokenize: tokenize,
    parse: parse,
  };
})(window);
