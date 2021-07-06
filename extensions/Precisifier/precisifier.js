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
  let prevt = {};
  if (!Array.isArray(tokens)) tokens = Colorful.tokenizers.JS(tokens).tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let content = token.token.trim();
    const type = token.type;

    // whitespace
    const ws = removeWS ? "" : token.token.substr(content.length);

    if (type == "JS-OBJECTPROP") {
      let replacer = toReplaceAsObjProp[content];
      if (replacer) content = replacer;
      addNameInSurrounder(content, ws);
    } else if (type == "JS-OBJECTPROPINOBJ") {
      let replacer = toReplaceAsObjProp[content];
      if (replacer) content = replacer;
      addNameInSurrounder(content, ws, "\"");
    } else if (type == "JS-METHOD" && (/[)\]]/.test(prevt[prevt.length - 2]) || (prevt == "." && /^JS-(NAME|OBJECTPROP|ARGUMENT|METHOD|BUILTIN|REGEX)$/.test((tokens[i - 2] || {}).type)))) {
      addNameInSurrounder(content, ws);
    } else if (/JS-(NAME|METHOD)/.test(type) && windowVariables.indexOf(content) > -1) {
      parsed += "window[\"" + content + "\"]" + ws;
    } else if (type == "JS-NAME") {
      let replacer = toReplaceAsglobal[content];
      if (replacer) token.token = token.token.replace(content, replacer);
      parsed += token.token;
    } else {
      if (type == "JS-COMMENT" && removeComment) continue;
      if (removeWS && type != "JS-KEY") token.token = content;
      parsed += token.token;
    }
    prevt = content;
  }
  return parsed;

  function addNameInSurrounder(content, ws, surrounder="[") {
    parsed = parsed.slice(0, parsed.length - 1);
    if (surrounder == "[") parsed += "[\"" + content + "\"]" + ws;
    else if (/["'']/.test(surrounder)) parsed += surrounder + content + surrounder + ws;
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
