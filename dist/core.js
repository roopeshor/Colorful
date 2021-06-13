(function (f) {
  f.Colorful = {
    config: { enableLineNumbering: !0 },
    tokenizers: {},
    tokenTypes: {},
    finishUp: function (c, b, d) {
      var a;
      if (c.enableLineNumbering) {
        c = (null == (a = b.match(/\n/g)) ? void 0 : a.length) + 1 || 1;
        a = "<code class='numberRow-cf'>";
        for (b = 1; b <= c; b++) (a += b), b < c && (a += "\n");
        a += '</code><code class="code-cf">' + d + "</code>";
      } else
        a = '<code class="code-cf" style="padding-left: 0px;">' + d + "</code>";
      return a;
    },
    compile: function (c, b, d) {
      var a = c.innerText;
      d = (0, this.tokenizers[d])(a);
      d = this.parse(d.tokens);
      c.innerHTML = f.Colorful.finishUp(b, a, d);
    },
    parse: function (c) {
      for (var b = "", d = this.tokenTypes, a = 0; a < c.length; a++) {
        var e = c[a],
          g = e.a;
        e = e.b.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        b =
          "OTHER" != g
            ? b + ("<span class='token " + d[g] + "'>" + e + "</span>")
            : b + e;
      }
      return b;
    },
  };
  f.addEventListener("load", function () {
    for (var c = Object.keys(f.Colorful.tokenizers), b = 0; b < c.length; b++)
      for (
        var d = c[b], a = document.getElementsByClassName("cf-" + d), e = 0;
        e < a.length;
        e++
      )
        window.Colorful.compile(
          a[e],
          { enableLineNumbering: a[e].hasAttribute("lineNumbering") },
          d
        );
  });
})(window);
