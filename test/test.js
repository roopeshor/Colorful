const $ = el => document.querySelector(el);
const J = Colorful.compilers.JS;
var active = $("#editor-active");
var output = $("#editor-output");
active.onkeyup = (evt) => {
  evt.preventDefault();
  output.scroll(active.scrollTop, active.scrollLeft);
  output.innerHTML = J.parse(J.tokenize(evt.target.value).tokens);
}

active.onscroll = (evt) => {
  output.scroll(active.scrollTop, active.scrollLeft);
}