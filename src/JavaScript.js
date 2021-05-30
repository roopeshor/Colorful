(function (w) {
  // RegExes
  var KeywordRE =
    /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|native|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/;
  var operatorRE = /[=+\-*/%!<>&|:?]*/;
  var nameCharRE = /^[\w\u00C0-\uffff\$]+/;

  // modified regex from Prism: https://github.com/PrismJS/prism/blob/master/components/prism-javascript.js#L21
  var number =
    /^(\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?)/;

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
    T_NAME = "NAME",
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
  /**
   * tokenize input text
   * @param {String} text text to be tokenised
   * @param {Object} [ErrHandler={}] defines how errors should be handled.
   * Only handles bracket/brace/paren un matches only in one way: either break and return tokens or continue.
   *
   * possible values: {
   *  breakOnBraceUnmatch: true/false,
   *  breakOnParenUnmatch: true/false,
   *  breakOnBracketUnmatch: true/false
   * }
   * @return {Object}
   *
   * @example tokenize("...", { breakOnBraceUnmatch:true }) // returns tokens when brace not matches or EOF reached
   */
  function tokenize(text, ErrHandler = {}) {
    var len = text.length;
    var tokens = [],
      word = "",
      scopeTree = [], // list like structure defines where current tokenisation is happening
      argNames = [], // list of argument names
      argScope = [], // cumulated scope number of arguments
      scope = ""; // recent scope
    var i = 0;
    while (i < len) {
      word = text.substring(i).match(nameCharRE);
      var isNum, prevTkn;
      if (word) {
        var v = word[0];
        isNum = v.match(number);
        prevTkn = tokens[tokens.length - 1] || emptyToken;
        if (isNum) {
          v = text.substring(i).match(number)[0];
          addToken(T_NUMBER, v);
        } else {
          readWordToken(v);
        }
        i += v.length;
        window.Colorful.mergeSameTypes(tokens);
      } else if (text[i] == "." && /\d/.test(text[i + 1])) {
        var w = text.substring(i).match(number)[0];
        addToken(T_NUMBER, w);
        i += w.length;
      }
      if (i == len) break; // break if EOF
      prevTkn = tokens[tokens.length - 1] || emptyToken; // previous token
      /* after matching a word there will be a non-unicode characters (punctuations, operators, etc.) that will follow word. Following code analyses it */
      var char = text[i]; // next character
      var next2 = text.substr(i, 2); // next two characters

      if (whitespace.test(char)) {
        // finds next whitespace characters
        var space = text.substring(i).match(whitespace)[0];
        if (prevTkn.token) prevTkn.token += space;
        // if a token exists in the list add whitespaces to it
        else addToken(T_NAME, space); // if there is no previous tokens
        i += space.length;
      } else if (char == "'" || char == '"' || char == "`") {
        // string ahead

        addToken(T_STRING, char);
        i++;

        var str = "";
        var slashes = 0; // number of backslashes
        //regular expression that is used to match all characters except the string determiner and backslashes
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
            if (slashes % 2 == 0) break; // even number of #backslashes means string character is not escaped
          } else if (text.substr(i, 2) == "${") {
            // only for multiline string
            // string interpolation ahead
            addToken(T_OPERATOR, "${"); // adds `${` as operator
            i += 2;
            var nxt = text.substring(i); // text left to parse except `${`
            var out = tokenize(nxt, { breakOnBraceUnmatch: true }); // tokenises code left
            if (out.tokens.length) tokens = tokens.concat(out.tokens);
            i += out.inputEnd;
            if (out.inputEnd != nxt.length) {
              // if tokenization was completed due to an unmatched brace add `}` after everything
              addToken(T_OPERATOR, "}");
              i++;
            } else if (text[i - 1] == "\n") {
              tokens[tokens.length - 1].token += "\n"; // quick fix
            }
          }
        }
      } else if (char.match(operatorRE)[0]) {
        var nxt = text.substring(i);
        var prevt = prevTkn.type;
        if (next2 == "//" || next2 == "/*") {
          // comment ahead
          var comment = nxt.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment);
        } else if (
          char == "/" &&
          !((prevt == T_NAME && !/^\s+$/.test(prevTkn.token)) || prevt == T_OBJECTPROP || prevt == T_NUMBER) &&
          regexRE.test(nxt)
        ) {
          // regular expression ahead
          var regExAhead = true;
          var tk = tokens[tokens.length - 2]?.type;
          if (
            prevTkn.type == T_COMMENT &&
            (tk == T_NAME || tk == T_OBJECTPROP || tk == T_NUMBER)
          ) {
            regExAhead = false;
          }
          if (regExAhead) {
            var re = nxt.match(regexRE)[0];
            addToken(T_REGEX, re);
            i += re.length;
          } else {
            //operator
            addToken(T_OPERATOR, char);
            i++;
          }
        } else if (next2 == "=>") {
          // arrow expression
          if (prevTkn.type == "NAME") {
            /* highlights single argument
              arg => {...}
              ^^^
            */
            prevTkn.type = "ARG";
            argNames.push(prevTkn.token.trim(), "arguments"); // trim the token to et arguments name
            argScope.push((argScope[argScope.length - 1] || 0) + 2);
            scope = "function"; // after this should be a function
          } else if (/\)\s*$/.test(prevTkn.token)) { 
            /* reads multiple arguments
              (arg1, arg2, argn) => {...}
               ^^^^  ^^^^  ^^^^
            */
            var initialScopeLevel = scopeTree.length; // current scope
            var toReadArray = [tokens[tokens.length - 1]]; // array of tokens to read
            for (var k = tokens.length - 2; k >= 0; k--) {
              var tk = tokens[k];
              toReadArray.push(tk);
              if (tk.type == T_OTHER && tk.scopeLevel == initialScopeLevel) {
                // reached `(`
                tokens.splice(k);
                break;
              }
            }
            // reverse the array
            toReadArray.reverse();
            // reads arguments
            readArgumentsInTokens(toReadArray, initialScopeLevel+1);
          }
          addToken(T_OPERATOR, next2); // add `=>` to tokens
          i += 2;
        } else {
          addToken(T_OPERATOR, char); //regular operator
          i++;
        }
      } else if (char == "(") {
        // function name
        var prev = prevTkn;
        var prevt = prev.type;
        var pprev = tokens[tokens.length - 2] || emptyToken;
        const isFunctionClause =
          (prev.token.substr(0, 8) == "function" && prevt == "KEY") ||
          (pprev.token.substr(0, 8) == "function" && pprev.type == "KEY") ||
          scopeTree[scopeTree.length - 1] == "class";
        addToken(T_OTHER, "(");
        i++;
        scopeTree.push("(");
        scope = "(";
        // makes name of function colored to method
        if (prevt == "NAME" || prevt == "OBJECTPROP") {
          prev.type = T_METHOD;
        }
        if (isFunctionClause) {
            // reads arguments
            var tkn = tokenize(text.substring(i), { breakOnParenUnmatch: true });
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
          "}": "breakOnBraceUnmatch",
          ")": "breakOnParenUnmatch",
          "]": "breakOnBracketUnmatch",
        };
        if (scopeTree.length > 0) {
          if (char == "}" && argScope.length && scopeTree[scopeTree.length-1] == "function") {
            argNames.splice(argScope[argScope.length-2]);
            argScope.pop();
          }
          scopeTree.pop();
        } else if (ErrHandler[handler[char]]) {
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
    function readArgumentsInTokens(tks, base = 0) {
      var nos = 0;
      for (var k = 0; k < tks.length; k++) {
        var tk = tks[k];
        if (
          (tk.type == T_NAME || tk.type == T_CAPITAL) &&
          tk.scopeLevel == base &&
          tks[k - 1]?.type != T_OPERATOR
        ) {
          nos++
          tk.type = T_ARGUMENT;
          argNames.push(tk.token.trim());
        }
      }
      argNames.push("arguments");
      tokens = tokens.concat(tks);
      if (nos) argScope.push(nos + (argScope[argScope.length-1] || 0) + 1)
      else argScope.push((argScope[argScope.length-1] || 0) + 1)
      scope = "function";
    }

    // finds the type of word given
    function readWordToken(word) {
      var prevt = prevTkn.token || "";
      if (
        KeywordRE.test(word) || // global keywords
        ((word == "get" || word == "set") &&
          scopeTree[scopeTree.length - 1] == "class") // get/set inside class scope
      ) {
        // Keyword
        if (/(function|if|do|while|for|class|catch|else|finally|switch|try)/.test(word)
        ) {
          scope = word.trim();
        }
        addToken(T_KEY, word);
      } else if (
        builtInObject.test(word) &&
        !/^(function|var|const|let)/.test(prevt) &&
        !/(\.\s*)$/.test(prevt)
      ) {
        // builtin objects word
        addToken(T_CAPITAL, word);
      } else if (/(\.\s*)$/.test(prevt)) {
        // object property
        addToken(T_OBJECTPROP, word);
      } else if (argNames.indexOf(word) > -1) {
        addToken(T_ARGUMENT, word);
      } else {
        // argument inside function clause
        addToken(T_NAME, word);
      }
    }
  }

  w.Colorful.tokenizers.JS = tokenize
})(window);