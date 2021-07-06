/*global $*/

const Configs = {
  variables: {
    window: []
  },
  removeComment: false,
  removeWS: false,
  replace: {
    objectProperty: {},
    global: {},
  }
};

const windowVariableItem = $("#windowVariableItem"); // input:text
const windowVarAddBtn = $("#window-var-add-btn"); // input:button
const windowVariableListUl = $("#output-window-vars"); // ul

const varNameBefore = $("#varNameBefore"); // input:text
const varNameAfter = $("#varNameAfter"); // input:text
const isObjectProprty = $("#isObjectProprty"); // input:checkbox
const replacerAddBtn = $("#replacer-add-btn"); // input:button
const replacerVariableListUl = $("#output-replacer-vars"); // ul

const removeComment = $("#removeComment"); // input:checkbox
const removeWS = $("#removeWS"); // input:checkbox

const codeTextarea = $("#code") // textarea
const compileBtn = $("#compile") // button
const codeOutput = $("#output-code") // pre

const globalFlag = "<span class='g-flag'>g</span>";

windowVariableItem.onEnter(addWindowVarEF);
replacerAddBtn.onClick = addReplacerVarEF;
windowVarAddBtn.onClick = addWindowVarEF;

compileBtn.on("click", () => {
  var codeToCompile = codeTextarea.innerText;
  if (codeToCompile.length) {
    codeOutput.innerText = Colorful.extensions.precisifier(codeToCompile, Configs);
    Colorful.compile(codeOutput, {}, "JS")
  }
});

varNameBefore.onEnter(addReplacerVarEF);
varNameAfter.onEnter(addReplacerVarEF);

removeComment.onChange = () => {
  Configs.removeComment = removeComment.checked;
}
removeWS.onChange = () => {
  Configs.removeWS = removeWS.checked;
}


// adders
function addReplacerVarEF() {
  var before = varNameBefore.value;
  var after = varNameAfter.value;
  addReplacerVar(before, after, !isObjectProprty.checked());
}
function addWindowVarEF() {
  var item = windowVariableItem.value;
  addWindowVar(item);
}


function addReplacerVar(before, after, isGlobal = true) {
  let toLook = Configs.replace.global;
  let beforeClearImg = globalFlag;
  let classes = "";
  if (!isGlobal) {
    toLook = Configs.replace.objectProperty;
    beforeClearImg = "";
    classes = "obj-prop";
  }
  if (!toLook[before]) {
    replacerVariableListUl.innerHTML += li(
      "<code class='name-inline replacer-before'>" + before + "</code> as <code class='name-inline replacer-after'>" + after + "</code>",
      "r" + before,
      "removeFromReplacer",
      beforeClearImg, classes);
    toLook[before] = after;
  }
}
function addWindowVar(_var) {
  if (Configs.variables.window.indexOf(_var) < 0) {
    windowVariableListUl.inneeHTML += li(
      _var,
      "w" + Configs.variables.window.length,
      "removeWinVarItem");
    Configs.variables.window.push(_var);
  }
}

/**
 * returns li element
 *
 * @param {string} content
 * @param {string} id
 * @param {string} removerFunction
 * @param {string} prefiximg
 * @param {string} [classes=""]
 * @return {string}  
 */
function li(content, id, removerFunction, prefiximg, classes = "") {
  return "<li id='" + id + "' class='" + classes + "'><span>" + content + "</span>" + clearIcon(id, removerFunction, prefiximg) + "</li>";
}
/**
 * retruns html of clear icon
 *
 * @param {string} id
 * @param {string} removerFunction remover
 * @param {string} [prefiximg=""] thing to add before img
 * @return {string}  
 */
function clearIcon(id, removerFunction, prefiximg = "") {
  return "<span class='img-clear-container'>" + prefiximg + "<img src='./media/ic_clear.svg' class='icon clear' onclick='" + removerFunction + "(\"" + id + "\")'></span>";
}



// removers

function removeFromReplacer(id) {
  const elem = $("#" + id);
  const classList = elem.classList;
  if (classList.contains("obj-prop")) {
    delete Configs.replace.objectProperty[id.substr(1)];
  } else {
    delete Configs.replace.global[id.substr(1)];
  }
  elem.remove();
}

function removeWinVarItem(id) {
  const index = Number(id.substr(1));
  delete Configs.variables.window[index];
  document.getElementById(id).remove();
}