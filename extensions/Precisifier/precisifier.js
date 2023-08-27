/**
 *
 *
 * @param {array} tokens
 * @param {Object} cfg
 * @return {string}
 */
function parse(tokens, cfg = {}) {
  const variables = cfg.variables || {};
  const removeComment = cfg.removeComment || false;
  const removeWS = cfg.removeWS || false;
  const windowVariables = variables.window || [];
  const toReplaceAsObjProp = (cfg.replace || {}).objectProperty || {};
  const toReplaceAsglobal = (cfg.replace || {}).global || {};
  let parsed = "";
  if (!Array.isArray(tokens))
    tokens = Colorful.tokenizers.JS(tokens).tokens;
  console.log(tokens);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let content = token.token.trim();
    const type = token.type;

    // whitespace
    let ws = removeWS ? "" : token.token.substr(content.length);

    if (type == "JS-COMMENT" && removeComment) {
      continue;
    } else if (
      /JS-(OBJECTPROP|OBJECTPROPINOBJ|METHODASOBJPROP)/.test(type)
    ) {
      let replacer = toReplaceAsObjProp[content];
      if (replacer) content = replacer;
    } else if (type == "JS-NAME") {
      let replacer = toReplaceAsglobal[content];
      if (replacer)
        token.token = token.token.replace(content, replacer);
    }

    if (removeWS && type != "JS-KEY") {
      token.token = content;
      ws = "";
    }

    if (/^JS-(OBJECTPROP|METHODASOBJPROP)$/.test(type)) {
      addNameInSurrounder(content, ws, "[", true);
    } else if (type == "JS-OBJECTPROPINOBJ") {
      addNameInSurrounder(content, ws, "'", false);
    } else if (
      /JS-(NAME|METHOD)/.test(type) &&
      windowVariables.indexOf(content) > -1
    ) {
      parsed += "window";
      addNameInSurrounder(content, ws, "[", false);
    } else {
      parsed += token.token;
    }
  }
  return parsed;

  function addNameInSurrounder(
    content,
    ws,
    surrounder = "[",
    removeLastChar,
  ) {
    if (removeLastChar) parsed = parsed.slice(0, parsed.length - 1);

    if (surrounder == "[") parsed += "['" + content + "']" + ws;
    else if (/["'']/.test(surrounder))
      parsed += surrounder + content + surrounder + ws;
  }
}

Colorful.extensions.precisifier = parse;
// possible configs
// console.log(parse(TOKENS, {
//   variables: {
//     window: ['C'],
//   },
//   removeComment: true,
//   removeWS: true,
// }))
