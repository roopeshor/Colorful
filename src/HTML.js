(function (w) {
  // check for core.js
  if (!window["Colorful"]) {
    console.error(
      "Core part of library wasn't imported. Import it by adding script tag linking core.js`",
    );
    return;
  }
  const operatorRE = /^[=/<>!]+/;
  const attributeRE = /^[^=>/]+/;
  const commentRE = /(<!--[\s\S]*?-->|<!--[\s\S]*)/;
  const tagNameRE = /[^\s>/]+/;
  const valueRE = tagNameRE;
  const textRE = /[^&<]*/;
  const specialRE = /^&[a-zA-Z]+;/;
  // types of tokens
  const T_TAG = "HTML-TAG";
  const T_ATTRIBUTE = "HTML-ATTRIBUTE";
  const T_OPERATOR = "HTML-OPERATOR";
  const T_COMMENT = "HTML-COMMENT";
  const T_OTHER = "HTML-OTHER";
  const T_SPECIAL = "HTML-SPECIAL";
  const T_TAG_PUCT_L = "HTML-TAG-PUCTUATION-LEFT";
  const T_TAG_PUCT_R = "HTML-TAG-PUCTUATION-RIGHT";
  const T_VALUE_OPER = "HTML-VALUE_OPERATOR";
  const T_VALUE = "HTML-VALUE";

  /**
   * tokenize input text
   * @param {String} text text to be tokenised
   * @return {Object}
   */
  function tokenize(text) {
    const len = text.length;
    let tokens = [];
    let i = 0;
    const jstokenizer = window["Colorful"]["tokenizers"]["JS"];
    while (i < len) {
      const char = text[i];
      const next = text.substr(i);
      if (char == "<") {
        if (next.substr(0, 4) == "<!--") {
          // comment ahead
          const comment = next.match(commentRE)[0];
          i += comment.length;
          addToken(T_COMMENT, comment);
        } else if (!/\s/.test(text[i + 1])) {
          const puctuations = next.match(operatorRE)[0];
          addToken(T_TAG_PUCT_L, puctuations);
          i += puctuations.length;

          // find tag name
          const tagName = text.substr(i).match(tagNameRE);
          if (tagName) {
            addToken(T_TAG, tagName[0]);
            i += tagName[0].length;
            // run a paser locally to find attributes and values
            while (i < len) {
              const ch = text[i];
              if (ch == ">") {
                // end of tag
                addToken(T_TAG_PUCT_R, ch);
                i++;
                if (tagName[0] == "script" && puctuations == "<") {
                  // parse JS
                  if (jstokenizer != undefined) {
                    const res = jstokenizer(
                      text.substr(i),
                      {},
                      /^<\/script\s*>/i,
                    );
                    if (res["tokens"].length) {
                      tokens = tokens.concat(res["tokens"]);
                      i += res["inputEnd"];
                    }
                  }
                }
                break;
              } else if (ch == "=") {
                addToken(T_OPERATOR, ch);
                i++;
                // find value
                const anc = text[i];
                if (anc == "'" || anc == '"') {
                  // reads value inside string
                  addToken(T_VALUE_OPER, anc);
                  let slashes = 0; // number of backslashes
                  // regular expression that is used to match all characters except the string determiner and backslashes
                  const re = anc == "'" ? /^[^'\\]+/ : /^[^"\\]+/;
                  i++;
                  while (i < len) {
                    const str = text.substring(i).match(re);
                    if (str) {
                      addToken(T_VALUE, str[0]);
                      i += str[0].length;
                      slashes = 0;
                    }
                    const char = text[i];
                    if (char == "\\") {
                      const slsh = text
                        .substring(i)
                        .match(/[\\]+/)[0];
                      addToken(T_VALUE, slsh);
                      slashes += slsh.length;
                      i += slsh.length;
                    } else if (char == anc) {
                      i++;
                      if (slashes % 2 == 0) {
                        addToken(T_VALUE_OPER, char);
                        break; // even number of backslashes means string character is not escaped
                      } else {
                        addToken(T_VALUE, char);
                      }
                    }
                  }
                } else {
                  const val = next.match(valueRE)[0];
                  i += val.length;
                  addToken(T_VALUE, val);
                }
              } else {
                const opers = ch.match(operatorRE);
                if (opers) {
                  // operators
                  addToken(T_OPERATOR, opers[0]);
                  i += opers[0].length;
                } else {
                  // attribute
                  const attr = text.substr(i).match(attributeRE)[0];
                  i += attr.length;
                  addToken(T_ATTRIBUTE, attr);
                }
              }
            }
          } else {
            // let previous tag to be OTHER type
            tokens[tokens.length - 1].type = T_OTHER;
          }
        } else {
          addToken(T_OTHER, char);
          i++;
        }
      } else if (char == "&") {
        const spec = next.match(specialRE);
        if (spec) {
          addToken(T_SPECIAL, spec[0]);
          i += spec[0].length;
        } else {
          addToken(T_OTHER, char);
          i++;
        }
      } else {
        const val = next.match(textRE)[0];
        i += val.length;
        addToken(T_OTHER, val);
      }
    }
    return { tokens: tokens, inputEnd: i };

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

  w["Colorful"]["tokenizers"]["HTML"] = tokenize;
  w["Colorful"]["tokenTypes"] = Object.assign(
    w["Colorful"]["tokenTypes"],
    {
      [T_TAG]: "tag html-tag",
      [T_ATTRIBUTE]: "attribute html-attribute",
      [T_OPERATOR]: "operator html-operator",
      [T_COMMENT]: "comment html-comment",
      [T_OTHER]: "other",
      [T_SPECIAL]: "html-special",
      [T_TAG_PUCT_L]: "operator tag-puctuation-left",
      [T_TAG_PUCT_R]: "operator tag-puctuation-right",
      [T_VALUE_OPER]: "value value_operator",
      [T_VALUE]: "value",
    },
  );
})(window);
