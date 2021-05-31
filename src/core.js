(function (w) {
  w.Colorful = {
    config: {
      enableLineNumbering: true,
    },
    tokenizers: {}, // tokenizers
    /** merges same type of consecutive tokens into
     * single one to minimize tokens to parse
    */
    mergeSameTypes: function (tokens) {
      var tl = tokens.length;
      if (
        tokens[tl - 1].type == tokens[tl - 2]?.type &&
        tokens[tl - 1].scopeLevel == tokens[tl - 2]?.scopeLevel
      ) {
        tokens[tl - 2].token += tokens[tl - 1].token;
        tokens.pop();
      }
    },

    /** takes parsed HTML string and wraps it in a `code` tag
     */
    finishUp: function (cfg, text, markuped) {
      var complete;
      if (cfg.enableLineNumbering) {
        var lineCount = text.match(/\n/g)?.length + 1 || 1;
        complete = "<table border=0><tr><td><pre class='colorful-numberRow'>";
        for (var i = 1; i <= lineCount; i++) {
          complete += i;
          if (i < lineCount) complete += "\n";
        }
        complete +=
          '</pre></td><td><code class="colorful-code">' +
          markuped +
          "</code></td></tr></table>";
      } else {
        complete = '<code class="colorful-code">' + markuped + "</code>";
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
        `total code analysed: ${(text.length / 1024).toFixed(3)} KiB\nfound: ${
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
      var d = {
        NAME: "name",
        OBJECTPROP: "objprop",
        KEY: "keyword",
        COMMENT: "comment",
        NUMBER: "number",
        ARGUMENT: "argument",
        BUILTIN: "builtIn",
        METHOD: "method",
        STRING: "string",
        REGEX: "regex",
        OPERATOR: "operator",
      };
      for (var i = 0; i < tokens.length; i++) {
        var tkn = tokens[i],
          tokenType = tkn.type;
        if (tokenType != "OTHER") {
          formatted +=
            "<span class='" + d[tokenType] + "'>" + tkn.token + "</span>";
        } else {
          formatted += tkn.token;
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
      var codes = document.getElementsByClassName(lang + "-colorful");
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
