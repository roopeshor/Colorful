window.addEventListener('load', () => {
  const $ = (el) => document.querySelector(el);
  const active = $('#editor-active');
  const output = $('#editor-output');
  active.onkeyup = (evt) => {
    evt.preventDefault();
    output.scroll(active.scrollTop, active.scrollLeft);
    const vl = evt.target.value;
    const tkns = Colorful.tokenizers.HTML(vl).tokens;
    output.innerHTML = Colorful.parse(tkns, 'HTML');
  };

  active.onscroll = (evt) => {
    output.scroll(active.scrollTop, active.scrollLeft);
  };
});
