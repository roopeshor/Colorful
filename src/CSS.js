//@ts-check
(function (w) {
  // check for core.js
  if (!window["Colorful"]) {
    console.error(
      "Core part of library wasn't imported. Import it by adding script tag linking core.js`"
    );
    return;
  }
  // types of tokens
  const T_PROPERTY = "CSS-PROPERTY",
    T_ATTRIBUTE = "CSS-ATTRIBUTE",
    T_SELECTOR = "CSS-SELECTOR",
    T_OPERATOR = "CSS-OPERATOR",
    T_COMMENT = "CSS-COMMENT",
    T_OTHER = "CSS-OTHER",
    T_VALUE_OPER = "CSS-VALUE_OPERATOR",
    T_NUMBER = "CSS-NUMBER",
    T_STRING = "CSS-STRING",
    T_UNIT = "CSS-UNIT",
    T_VALUE = "CSS-VALUE";

  var operatorRE = /^[=!$^@~|-+*/%&:<>]+/;
  var attributeRE = /^[^=]+/;
  var commentRE = /^(\/\*[\s\S]*\*\/|\/\*[\s\S]*)/;
  var selectorRE = /^[^{]+/;
  var nameRE = /^[\w-]+/;
  var mainSelectorRE = /[.#][\w-]+/;
  /**
   * tokenize input text
   * @param {string} text text to be tokenised
   * @return {Object}
   */
  function tokenize(text) {
    var len = text.length;
    var tokens = [],
      i = 0;
    while (i < len) {
      var next = text.substr(i);
      var toRead = next.match(selectorRE);
      if (toRead) {
        var sel = toRead[0],
          k = 0,
          Len = sel.length,
          insideAttrSelector = false;
        while (k < Len) {
          var ch = sel[k];
          if (ch == "[") {
            insideAttrSelector = true;
          } else if (ch == "]") {
            insideAttrSelector = false;
          } else if (sel.substr(k, 2) == "/*") {
            // comment ahead
            k += readComment(sel, k);
          } else if (operatorRE.test(ch)) {
            var opers = sel.substr(k).match(operatorRE)[0];
            addToken(T_OPERATOR, opers);
            k+=opers.length;
          } else if (/\s/.test(ch)) {
            var spaces = sel.substr(k).match(/\s+/)[0];
            if (tokens[tokens.length-1].token) tokens[tokens.length-1].token += spaces;
            // if a token exists in the list add whitespaces to it
            else addToken(T_OTHER, spaces); // if there is no previous tokens
            k+=spaces.length;
          } else {
            // some other stuff;

            var name = sel.substr(k).match(mainSelectorRE);
            if (name) {
              var n = name[0];
              if (insideAttrSelector) {
                if (
                  tokens[tokens.length - 1].type == T_OPERATOR ||
                  tokens[tokens.length - 2].type == T_OPERATOR
                ) {
                  //attribute value
                  addToken(T_VALUE, n);
                } else {
                  //attribute name
                  addToken(T_ATTRIBUTE, n);
                }
              } else {
                addToken(T_SELECTOR, n)
              }
              k += n.length;
            } else {
              addToken(T_OTHER, ch);
              k++;
            }
          }
          mergeSameTypes();
        }
        i += k;
      }
      if (i >= len) break;
      var char = text[i];
      if (char == "{") {
        addToken(T_OTHER, char);
        i++
        toRead = next.match(/[^}]+/);
        if (toRead) {
          var k = 0,
            defs = toRead[0], // 'property: value' pairs
            Len = defs.length,
            ins;
          while (k < Len) {
            var name = defs.substr(k).match(nameRE);
            if (name) {
              addToken(T_PROPERTY, name[0]);
              k += name[0].length
            } 
            if (k >= Len) break;
            var ch = defs[k];
            if (defs.substr(k, 2) == "/*") {
              k += readComment(defs, k);
            } else if (operatorRE.test(ch)) {
              if (ch == ":") {
                let toRead = defs.substr(k).match(/[^;]/);
                if (toRead) {
                  
                }
              } else {
                var opers = defs.substr(k).match(operatorRE)[0];
                addToken(T_OPERATOR, opers);
                k+=opers.length;
              }
            }
          }
        }
        
      } else if (text.substr(i,2) == "/*") {
        // read comment
        i += readComment(text, i);
      } else {
        addToken(T_OTHER, char);
        i++;
      }
      mergeSameTypes();
    }
    return { tokens: tokens, inputEnd: i };

    function readComment (txt,j) {
      var comment = txt.substr(j).match(commentRE)[0];
      addToken(T_COMMENT, comment);
      return comment.length;
    }

    /** merges same type of consecutive tokens into
     * single one to minimize tokens to parse
     */
    function mergeSameTypes() {
      var tl = tokens.length;
      if (
        tokens[tl - 1].type == tokens[tl - 2]?.type
      ) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    }
    /**
     * @param {string} type
     * @param {string} token
     */
    function addToken(type, token) {
      tokens.push({
        type: type,
        token: token,
      });
    }
  }

  w["Colorful"]["tokenizers"]["CSS"] = tokenize;
  w["Colorful"]["tokenTypes"] = Object.assign(w["Colorful"]["tokenTypes"], {
    [T_ATTRIBUTE]: "attribute css-attribute",
    [T_OPERATOR]: "operator css-operator",
    [T_COMMENT]: "comment css-comment",
    [T_OTHER]: "other",
    [T_VALUE_OPER]: "value value_operator",
    [T_SELECTOR]: "selector css-selector",
    [T_VALUE]: "value",
  });
})(window);
