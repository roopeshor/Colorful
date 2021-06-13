(function (w) {
  w.Colorful = {
    // default configuration
    config: {
      enableLineNumbering: true,
    },
    tokenizers: {}, // tokenizers
    tokenTypes: {}, // includes tokens except `OTHER` type
    
    /** takes parsed HTML string and wraps it in a `code` tag*/
    finishUp: function (cfg, text, markuped, container) {
      var complete;
      if (cfg.enableLineNumbering) {
        var lineCount = text.match(/\n/g)?.length + 1 || 1;
        complete = "<code class='numberRow-cf'>";
        for (var i = 1; i <= lineCount; i++) {
          complete += i;
          if (i < lineCount) complete += "\n";
        }
        complete +=
          '</code><code class="code-cf">' +
          markuped +
          "</code>";
      } else {
        complete = '<code class="code-cf" style="padding-left: 0px;">' + markuped + "</code>"
      }
      return complete;
    },

    /**
     * combines tokenizer and parser
     * @param {HTMLElement} container
     * @param {Object} cfg
    */
    compile: function (container, cfg, lang) {
      var text = container.innerText,
        tokenize = this.tokenizers[lang],
        time = window.performance.now(),
        out = tokenize(text),
        markuped = this.parse(out.tokens);
      time = window.performance.now() - time;
      container.innerHTML = w.Colorful.finishUp(cfg, text, markuped, container);
      var speed = ((text.length / 1024 / time) * 1000).toFixed(3); //kb/s
      console.log(
        `Language: ${lang}
total code analysed: ${(text.length / 1024).toFixed(3)} KiB\nfound: ${
          out.tokens.length
        } tokens\ncompile time: ${time.toFixed(
          4
        )} ms\ncompile speed: ${speed} KiB/s`
      );
    },

    /**
   * parse tokens to generate html string
   * @param {Array} tokens array of tokens
   * @return {string}
   */
    parse: function parse(tokens) {
      var formatted = ``;
      var d = this.tokenTypes;
      for (var i = 0; i < tokens.length; i++) {
        var tkn = tokens[i],
          tokenType = tkn.type,
          token = tkn.token.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        if (tokenType != "OTHER") {
          formatted +=
            "<span class='token " + d[tokenType] + "'>" + token + "</span>";
        } else {
          formatted += token;
        }
      }
      return formatted;
    }
  };

  /**
   * highlight all languages on page loads
   */
  w.addEventListener("load", function () {
    var langs = Object.keys(w.Colorful.tokenizers);
    for (var i = 0; i < langs.length; i++) {
      var lang = langs[i];
      var codes = document.getElementsByClassName("cf-"+lang);
      for (var k = 0; k < codes.length; k++) {
        var block = codes[k];
        var cfg = {
          enableLineNumbering: block.hasAttribute("lineNumbering")
        };
        window.Colorful.compile(codes[k], cfg, lang);
      }
    }
  });
})(window);
