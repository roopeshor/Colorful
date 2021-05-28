window.addEventListener("load", () => {
  var $ = el => document.querySelector(el);
  var active = $("#editor-active");
  var output = $("#editor-output");
  active.onkeyup = (evt) => {
      evt.preventDefault();
      output.scroll(active.scrollTop, active.scrollLeft);
      var vl = evt.target.value
      var tkns = Colorful.compilers.JS.tokenize(vl).tokens
      output.innerHTML = Colorful.compilers.JS.parse(tkns);
  }

  active.onscroll = (evt) => {
      output.scroll(active.scrollTop, active.scrollLeft);
  }
});