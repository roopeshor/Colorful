(function (w) {
  w.Colorful = {
    // default configuration
    config: {
      enableLineNumbering: true,
    },
    tokenizers: {}, // tokenizers
    tokenTypes: {}, // includes tokens except `OTHER` type
    
    /** takes parsed HTML string and wraps it in a `code` tag*/
    finishUp: function (cfg, text, markuped) {
      var complete;
      if (cfg.enableLineNumbering) {
        var lineCount = text.match(/\n/g)?.length + 1 || 1;
        complete = "<table border=0><tr><td><pre class='cf-numberRow'>";
        for (var i = 1; i <= lineCount; i++) {
          complete += i;
          if (i < lineCount) complete += "\n";
        }
        complete +=
          '</pre></td><td><code class="cf-code">' +
          markuped +
          "</code></td></tr></table>";
      } else {
        complete = '<code class="cf-code">' + markuped + "</code>";
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
      container.innerHTML = w.Colorful.finishUp(cfg, text, markuped);
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
   * @return {String}
   */
    parse: function parse(tokens) {
      var formatted = ``;
      var d = this.tokenTypes;
      for (var i = 0; i < tokens.length; i++) {
        var tkn = tokens[i],
          tokenType = tkn.type,
          token = tkn.token.replaceSpecHTMLChars();
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
   * converts characters into html char codes
   * "<" -> "&lt;"
   * ">" -> "&gt;"
   * "&" -> "&amp;"
   * @returns string replacing some characters
   */
  String.prototype.replaceSpecHTMLChars = function () {
    return this.replace(/&/g, "&amp;").replace(/</g, "&lt;");
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
