//@ts-check

(function (w) {
  var operatorRE = /^[=/<>!]+/;
  var attributeRE = /^[^=>/]+/;
  var commentRE = /(<!--[\s\S]*?-->|<!--[\s\S]*)/;
  var tagNameRE = /[^\s>/]+/;
  var valueRE = tagNameRE;
  var textRE = /[^&<]*/;
  var specialRE = /^&[a-zA-Z]+;/;
  // types of tokens
  const T_TAG = "HTML-TAG",
        T_ATTRIBUTE = "HTML-ATTRIBUTE",
        T_OPERATOR = "HTML-OPERATOR",
        T_COMMENT = "HTML-COMMENT",
        T_OTHER = "HTML-OTHER",
        T_SPECIAL = "HTML-SPECIAL",
        T_TAG_PUCT_L = "HTML-TAG-PUCTUATION-LEFT",
        T_TAG_PUCT_R = "HTML-TAG-PUCTUATION-RIGHT",
        T_VALUE_OPER = "HTML-VALUE_OPERATOR",
        T_VALUE = "HTML-VALUE";
  // an empty token

  const log = function (){ console.log(...arguments); }
  /**
   * tokenize input text
   * @param {String} text text to be tokenised
   * @return {Object}
   */
  function tokenize(text) {
    var len = text.length;
    var tokens = [],
      i = 0,
      recentTag = "";
    while (i < len) {
      var char = text[i];
      var next = text.substr(i);
      if (char == "<") {
        if (next.substr(0, 4) == "<!--") {
          // comment ahead
          var comment = next.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment)
        } else if (!/\s/.test(text[i + 1])) {
          var puctuations = next.match(operatorRE)[0];
          addToken(T_TAG_PUCT_L, puctuations);
          i+= puctuations.length;
          
          // find tag name
          var tagName = text.substr(i).match(tagNameRE);
          if (tagName) {
            addToken(T_TAG, tagName[0]);
            i += tagName[0].length;

            // run a paser locally to find attributes and values
            while (i < len) {
              var ch = text[i];
              if (ch == ">") {
                // end of tag
                addToken(T_TAG_PUCT_R, ch);
                i++;
                break;
              } else if (ch == "=") {
                addToken(T_OPERATOR, ch);
                i++;
                // find value
                var anc = text[i];
                if (anc == "'" || anc == '"') {
                  // reads value inside string
                  addToken(T_VALUE_OPER, anc);
                  var slashes = 0; // number of backslashes
                  //regular expression that is used to match all characters except the string determiner and backslashes
                  var re = anc == "'" ? /^[^'\\]+/ : /^[^"\\]+/;
                  i++;
                  while (i < len) {
                    var str = text.substring(i).match(re);
                    if (str) {
                      addToken(T_VALUE, str[0]);
                      i += str[0].length;
                      slashes = 0;
                    }
                    var ch = text[i];
                    if (ch == "\\") {
                      var slsh = text.substring(i).match(/[\\]+/)[0];
                      addToken(T_VALUE, slsh);
                      slashes += slsh.length;
                      i += slsh.length;
                    } else if (ch == anc) {
                      i++;
                      if (slashes % 2 == 0){
                        addToken(T_VALUE_OPER, ch);
                        break; // even number of backslashes means string character is not escaped
                      } else {
                        addToken(T_VALUE, ch);
                      }
                    }
                  }
                } else {
                  var val = next.match(valueRE)[0]
                  i += val.length;
                  addToken(T_VALUE, val);
                }
              } else {
                var opers = ch.match(operatorRE);
                if (opers) {
                  // operators
                  addToken(T_OPERATOR, opers[0]);
                  i += opers[0].length;
                } else {
                  // attribute
                  var attr = text.substr(i).match(attributeRE)[0];
                  i += attr.length;
                  addToken(T_ATTRIBUTE, attr);
                }
              }
            }
          } else {
            // let previous tag to be OTHER type
            tokens[tokens.length-1].type = T_OTHER;
          }
          
        } else {
          addToken(T_OTHER, char);
          i++;
        }
      } else if (char == "&") {
        var spec = next.match(specialRE);
        if (spec) {
          addToken(T_SPECIAL, spec[0]);
          i += spec[0].length;
        } else {
          addToken(T_OTHER, char);
          i++;
        }
      } else {
        var val = next.match(textRE)[0]
        i += val.length;
        addToken(T_OTHER, val);
      }
    }
    return { tokens: tokens, inputEnd: i };

    function mergeSameTypes () {
      var tl = tokens.length;
      if (tokens[tl - 1].type == tokens[tl - 2]?.type) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    }
    /**
     * @param {any} type
     * @param {any} token
     */
    function addToken(type, token) {
      tokens.push({
        type: type,
        token: token,
      });
    }
  }

  w['Colorful']['tokenizers']['HTML'] = tokenize;
  w['Colorful'].tokenTypes = Object.assign(w['Colorful'].tokenTypes, {
    [T_TAG]       : "tag html-tag",
    [T_ATTRIBUTE] : "attribute html-attribute",
    [T_OPERATOR]  : "operator html-operator",
    [T_COMMENT]   : "comment html-comment",
    [T_OTHER]     : "other",
    [T_SPECIAL]   : "html-special",
    [T_TAG_PUCT_L]: "operator tag-puctuation-left",
    [T_TAG_PUCT_R]: "operator tag-puctuation-right",
    [T_VALUE_OPER]: "value value_operator",
    [T_VALUE]     : "value"
  })
})(window);
