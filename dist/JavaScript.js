(function (w) {
  // check for core.js
  if (!window["Colorful"]) {
    console.error(
      "Core part of library wasn't imported. Import it by adding script tag linking core.js`",
    );
    return;
  }

  // prettier-ignore
  const Keywords = ["async","await","break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","false","finally","for","function","if","implements","import","in","instanceof","interface","let","new","null","package","return","static","super","switch","this","throw","true","try","typeof","undefined","var","void","while","with","yield"];
  // prettier-ignore
  const builtInObject = ["AggregateError","Buffer","Array","ArrayBuffer","AsyncFunction","AsyncGenerator","AsyncGeneratorFunction","Atomics","BigInt","BigInt64Array","BigUint64Array","Boolean","DataView","Date","Error","EvalError","Float32Array","Float64Array","Function","Generator","GeneratorFunction","Int16Array","Int32Array","Int8Array","InternalError","Intl","JSON","Map","Math","Number","Object","Promise","Proxy","RangeError","ReferenceError","Reflect","RegExp","Set","SharedArrayBuffer","String","Symbol","SyntaxError","TypeError","URIError","Uint16Array","Uint32Array","Uint8Array","Uint8ClampedArray","WeakMap","WeakSet","WebAssembly"];
  // prettier-ignore
  const ScopingKW = ["function","if","do","while","for","class","catch","else","finally","switch","try"];
  const Initializers = ["function", "var", "const", "let", "interface"];

  const operatorRE = /[-=+*/%!<>&|:?]/;
  const nameCharRE = /^[\wÀ-￿$]+/u; // \w, $ and from \u00c0 to \uffff
  const commentRE = /(\/\*[\s\S]*?\*\/|\/\*[\s\S]*|\/\/.*)/;
  const whitespace = /[\s]+/;

  // modified regex from Prism: https://github.com/PrismJS/prism/blob/master/components/prism-javascript.js#L21
  const number =
    /^((?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?)/;

  const regexRE =
    /^\/((?![*+?])(?:[^\r\n[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/[gimyus]*/;

  // types of tokens
  const T_NAME = "JS-NAME";
  const T_OBJECTPROP = "JS-OBJECTPROP";
  // object property inside Object
  // eg: {a:3}
  const T_OBJECTPROPINOBJ = "JS-OBJECTPROPINOBJ";
  const T_KEY = "JS-KEY";
  const T_COMMENT = "JS-COMMENT";
  const T_NUMBER = "JS-NUMBER";
  const T_ARGUMENT = "JS-ARGUMENT";
  const T_BUILTIN = "JS-BUILTIN";
  const T_METHOD = "JS-METHOD";

  // method as object property (e.g: console.log())
  const T_METHODASOBJPROP = "JS-METHODASOBJPROP";
  const T_STRING = "JS-STRING";
  const T_REGEX = "JS-REGEX";
  const T_OPERATOR = "JS-OPERATOR";
  const T_OTHER = "JS-OTHER";
  // an empty token
  const emptyToken = { type: "", token: "" };
  const handler = {
    "}": "breakOnBraceUnmatch",
    ")": "breakOnParenUnmatch",
    "]": "breakOnBracketUnmatch",
  };
  /**
   * Tokenize input text
   * @param {string} text text to be tokenised
   * @param {Object} [ErrHandler={}] defines how errors should be handled.
   * Only handles bracket/brace/paren un matches only in one way: either break and return tokens or continue.
   *
   * possible values: {
   *  breakOnBraceUnmatch: true/false,
   *  breakOnParenUnmatch: true/false,
   *  breakOnBracketUnmatch: true/false
   * }
   * @param {RegExp} endRE ends parsing at this expression.
   *                         used in parseing JS code inside HTML code
   * @return {Object}
   *
   * @example tokenize("...", { breakOnBraceUnmatch:true }) // returns tokens when brace not matches or EOF reached
   */
  function tokenize(text, ErrHandler = {}, endRE = null) {
    const len = text.length;
    let tokens = [];
    let word;
    const scopeTree = []; // Keeps scope tree
    const argNames = []; // list of argument names (inside functions)
    const argScope = []; // cumulated scope number of arguments
    let scope = ""; // recent scope
    let i = 0;
    let prevToken;
    let char;
    while (i < len) {
      let upcoming = text.substring(i);
      word = upcoming.match(nameCharRE);
      let isNumber;
      if (endRE && endRE.test(upcoming)) {
        return { tokens: tokens, inputEnd: i };
      }
      if (word) {
        let v = word[0];
        isNumber = v.match(number);
        prevToken = tokens[tokens.length - 1] || emptyToken;
        if (isNumber) {
          v = upcoming.match(number)[0];
          addToken(T_NUMBER, v);
        } else {
          readWordToken(v);
        }
        i += v.length;
        mergeSameTypes();
      } else if (text[i] == "." && /\d/.test(text[i + 1])) {
        const w = text.substring(i).match(number)[0];
        addToken(T_NUMBER, w);
        i += w.length;
      }
      if (i == len) break; // break if EOF
      prevToken = tokens[tokens.length - 1] || emptyToken; // previous token
      /* after matching a word there will be a non-unicode characters (punctuations, operators, etc.) that will follow word. Following code analyses it */
      char = text[i]; // next character
      const next2 = text.substring(i, i + 2); // next two characters
      if (whitespace.test(char)) {
        // finds next whitespace characters
        const space = text.substring(i).match(whitespace)[0];
        if (prevToken.token) prevToken.token += space;
        // if a token exists in the list add whitespaces to it
        else addToken(T_NAME, space); // if there is no previous tokens
        i += space.length;
      } else if (char == "'" || char == '"' || char == "`") {
        // string ahead

        addToken(T_STRING);
        i++;

        let str;
        let slashes = 0; // number of backslashes
        // regular expression that is used to match all characters except the string determiner and backslashes
        const re =
          char == "'" ? /^[^'\\]+/ : char == '"' ? /^[^"\\]+/ : /^((?!`|\${).|\n)+/;
        while (i < len) {
          str = text.substring(i).match(re);
          if (str) {
            addToken(T_STRING, str[0]);
            i += str[0].length;
            slashes = 0;
          }
          const ch = text[i];
          if (ch == "\\") {
            const slsh = text.substring(i).match(/[\\]+/)[0];
            addToken(T_STRING, slsh);
            slashes += slsh.length;
            i += slsh.length;
          } else if (ch == char) {
            addToken(T_STRING, ch);
            i++;
            // even number of backslashes means string character is not escaped
            if (slashes % 2 == 0) break;
            else slashes = 0; // else reset it
          } else if (text.substring(i, i + 2) == "${") {
            // only for multiline string
            // string interpolation ahead
            addToken(T_OPERATOR, "${"); // adds `${` as operator
            i += 2;
            const nxt = text.substring(i); // text left to parse except `${`
            const out = tokenize(nxt, { breakOnBraceUnmatch: true }); // tokenises code left
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
      } else if (operatorRE.test(char)) {
        const nxt = text.substring(i);
        const prevt = prevToken.type;
        if (next2 == "//" || next2 == "/*") {
          // comment ahead
          const comment = nxt.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment);
        } else if (
          char == "/" &&
          !(
            (prevt == T_NAME && !/^\s+$/.test(prevToken.token)) ||
            prevt == T_OBJECTPROP ||
            prevt == T_NUMBER
          ) &&
          regexRE.test(nxt)
        ) {
          // regular expression ahead
          let regExAhead = true;
          const tk = (tokens[tokens.length - 2] || {}).type;
          if (
            prevToken.type == T_COMMENT &&
            (tk == T_NAME || tk == T_OBJECTPROP || tk == T_NUMBER)
          ) {
            regExAhead = false;
          }
          if (regExAhead) {
            const reg = nxt.match(regexRE)[0];
            addToken(T_REGEX, reg);
            i += reg.length;
          } else {
            // operator
            addToken(T_OPERATOR);
            i++;
          }
        } else if (next2 == "=>") {
          // arrow expression
          if (prevToken.type == T_NAME) {
            /* highlights single argument
              arg => {...}
              ^^^
            */
            prevToken.type += " " + T_ARGUMENT;
            argNames.push(prevToken.token.trim()); // trim the token to get arguments name
            argScope.push((argScope[argScope.length - 1] || 0) + 1);
            scope = "function"; // start function scope
          } else if (/\)\s*$/.test(prevToken.token)) {
            /* reads multiple arguments
              (arg1, arg2, argn) => {...}
               ^^^^  ^^^^  ^^^^
            */
            const initialScopeLevel = scopeTree.length; // current scope
            const toReadArray = tokens.slice(-1); // array of tokens to read
            for (let k = tokens.length - 2; k >= 0; k--) {
              const tk = tokens[k];
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
            readArgumentsInTokens(toReadArray, initialScopeLevel + 1);
          }
          addToken(T_OPERATOR, next2); // add `=>` to tokens
          i += 2;
        } else {
          addToken(T_OPERATOR); // regular operator
          i++;
          if (
            char == ":" &&
            scopeTree[scopeTree.length - 1] == "{" &&
            prevToken.type == T_NAME
          ) {
            prevToken.type = T_OBJECTPROPINOBJ;
          }
        }
      } else if (char == "(") {
        // function name
        const prevt = prevToken.type;
        const pprevToken = tokens[tokens.length - 2] || emptyToken;
        const isFunctionClause =
          (prevToken.token.match(/function\s*$/) && prevt == T_KEY) ||
          (pprevToken.token.match(/function\s*$/) && pprevToken.type == T_KEY) ||
          scopeTree[scopeTree.length - 1] == "class";
        addToken(T_OTHER);
        i++;
        scopeTree.push("(");
        scope = "(";
        // makes name of function colored to method
        if (prevt == T_NAME || prevt == T_OBJECTPROP || prevt == T_ARGUMENT) {
					if (isObjectProprty(pprevToken.token, tokens[tokens.length - 4])) {
						prevToken.type = T_METHODASOBJPROP;
          } else {
						prevToken.type += " " +T_METHOD;
					}
        }
        if (isFunctionClause) {
          // reads arguments
          const tkn = tokenize(text.substring(i), {
            breakOnParenUnmatch: true,
          });
          const tkns = tkn.tokens;
          readArgumentsInTokens(tkns);
          i += tkn.inputEnd;
        }
      } else if (char == "{" || char == "[") {
        addToken(T_OTHER, char);
        i++;
        if (scope == "" || scope.length == 1) scope = char;
        scopeTree.push(scope);
        scope = char;
      } else if (char == "}" || char == ")" || char == "]") {
        if (scopeTree.length > 0) {
          if (
            char == "}" &&
            argScope.length &&
            scopeTree[scopeTree.length - 1] == "function"
          ) {
            argNames.splice(argScope[argScope.length - 2]);
            argScope.pop();
          }
          scopeTree.pop();
        } else if (ErrHandler[handler[char]]) {
          break;
        }
        addToken(T_OTHER);
        i++;
      } else {
        addToken(T_OTHER);
        i++;
      }
      mergeSameTypes();
    }
    if (char == "\n") tokens[tokens.length - 1].token += "\n"; // quick fix
    return { tokens: tokens, inputEnd: i };
    /**
     * merges same type of consecutive tokens into
     * single one to minimize tokens to parse
     */
    function mergeSameTypes() {
      const tl = tokens.length;
      if (
        tokens[tl - 1].type == (tokens[tl - 2] || {}).type &&
        tokens[tl - 1].scopeLevel == (tokens[tl - 2] || {}).scopeLevel &&
        tokens[tl - 1].type != T_OTHER
      ) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    }
    /**
     * push token to tokenList
     *
     * @param {*} type
     * @param {*} token
     */
    function addToken(typ, tkn = char) {
      tokens.push({
        type: typ,
        token: tkn,
        scopeLevel: scopeTree.length,
      });
    }

    /**
     * read arguments in given token list
     *
     * @param {string} tks
     * @param {number} [base=0]
     */
    function readArgumentsInTokens(tks, base = 0) {
      let nos = 0;
      for (let k = 0; k < tks.length; k++) {
        const tk = tks[k];
        if (
          (tk.type == T_NAME || tk.type == T_BUILTIN) &&
          tk.scopeLevel == base &&
          (tks[k - 1] || {}).type != T_OPERATOR
        ) {
          nos++;
          tk.type = T_ARGUMENT;
          argNames.push(tk.token.trim());
        }
      }
      tokens = tokens.concat(tks);
      if (nos) argScope.push(nos + (argScope[argScope.length - 1] || 0) + 1);
      scope = "function";
    }

    /**
     * checks if the current context is object property
     * @param {string} previousTokenContent
     * @param {Object} _2ndLastToken 2nd last token
     * @returns {boolean}
     */
    function isObjectProprty(previousTokenContent, _2ndLastToken) {
      return (
        previousTokenContent == "." &&
        (/[)\]]/.test(_2ndLastToken.token) ||
          (previousTokenContent.length == 1 &&
            (/^JS-(NAME|OBJECTPROP|ARGUMENT|BUILTIN|REGEX)$/.test(
              _2ndLastToken.type,
            ) ||
              // for this.someProperty or false.someProperties
              // this is defined as keyword
              /(this|false|true)/.test(_2ndLastToken.token))))
      );
    }

    /**
     * finds the type of word given
     *
     * @param {string} word
     */
    function readWordToken(word) {
      const prevTContent = (prevToken.token || "").trim();
      const pprevT = tokens[tokens.length - 2] || {};
      const lastScope = scopeTree[scopeTree.length - 1];
      if (
        Keywords.indexOf(word) >= 0 || // global keywords
        ((word == "get" || word == "set") && lastScope == "class") // get/set inside class scope
      ) {
        // Keyword
        addToken(T_KEY, word);
        if (ScopingKW.indexOf(word) >= 0) scope = word;
      } else if (
        (builtInObject.indexOf(word) >= 0 &&
          !(Initializers.indexOf(prevTContent) >= 0) && // not being initialized
          !/\.$/.test(prevTContent)) || // not a object property
        (word == "constructor" && lastScope == "class") // color this also
      ) {
        // builtin objects word
        addToken(T_BUILTIN, word);
      } else if (isObjectProprty(prevTContent, pprevT)) {
        // object property
        addToken(T_OBJECTPROP, word);
      } else if (argNames.indexOf(word) >= 0 || word == "arguments") {
        // argument inside function clause
        addToken(T_ARGUMENT, word);
      } else {
        addToken(T_NAME, word);
      }
    }
  }

  w["Colorful"]["tokenizers"]["JS"] = tokenize;

  // add types of token used here to tokenType object for parser to classify tokens
  w["Colorful"]["tokenClasses"] = Object.assign(w["Colorful"]["tokenClasses"], {
    [T_NAME]: "name js-name",
    [T_OBJECTPROP]: "objprop",
    [T_OBJECTPROPINOBJ]: "objprop object-prop-in-obj",
    [T_KEY]: "keyword js-keyword",
    [T_COMMENT]: "comment js-comment",
    [T_NUMBER]: "number js-number",
    [T_ARGUMENT]: "argument",
    [T_BUILTIN]: "builtIn js-builtIn",
    [T_METHOD]: "method js-method",
    [T_METHODASOBJPROP]: "method js-method method-as-obj-prop",
    [T_STRING]: "string js-string",
    [T_REGEX]: "regex",
    [T_OPERATOR]: "operator js-operator",
  });
})(window);
