window.addEventListener("load", () => {
  var $ = el => document.querySelector(el);
  var active = $("#editor-active");
  var output = $("#editor-output");
  active.onkeyup = (evt) => {
      evt.preventDefault();
      output.scroll(active.scrollTop, active.scrollLeft);
      var vl = evt.target.value
      var tkns = Colorful.tokenizers.JS(vl).tokens
      output.innerHTML = Colorful.parse(tkns);
  }

  active.onscroll = (evt) => {
      output.scroll(active.scrollTop, active.scrollLeft);
  }
});