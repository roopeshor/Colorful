(function (w) {
  w.Colorful = {
    // default configuration
    config: {
      enableLineNumbering: true,
    },
    tokenizers: {}, // tokenizers
    tokenClasses: {}, // includes tokens except `OTHER` type
    extensions: {}, // includes tokens except `OTHER` type
    /**
     * Takes parsed HTML string and wraps it in a `code` tag
     *
     * @param {Object} cfg
     * @param {string} text
     * @param {string} markuped
     * @return {string}
     */
    finishUp: function finishUp(cfg, text, markuped) {
      let complete;
      if (cfg.enableLineNumbering) {
        const lineCount = (text.match(/\n/g) || []).length + 1 || 1;
        complete = "<code class='numberRow-cf'>";
        for (let i = 1; i <= lineCount; i++) {
          complete += i;
          if (i < lineCount) complete += "\n";
        }
        complete += `</code><code class='code-cf'>${markuped}</code>`;
      } else {
        complete = `<code class='code-cf'>${markuped}</code>`;
      }
      return complete;
    },

    /**
     * combines tokenizer and parser
     *
     * @param {HTMLElement} container
     * @param {Object} cfg
     * @param {string} lang
     */
    compile: function compile(container, cfg, lang) {
      const text = container.innerText;
      const tokenize = this.tokenizers[lang];
      let time = window.performance.now();
      const out = tokenize(text);
      const markuped = this.parse(out.tokens);
      time = window.performance.now() - time;
      container.innerHTML = w.Colorful.finishUp(cfg, text, markuped, container);
      const speed = ((text.length / 1024 / time) * 1000).toFixed(3); // kb/s
      console.log(
        `Language: ${lang}
total code analysed: ${(text.length / 1024).toFixed(3)} KiB
found: ${out.tokens.length} tokens
compile time: ${time.toFixed(4)} ms
compile speed: ${speed} KiB/s`,
      );
    },

    /**
     * parse tokens to generate html string
     * @param {Array} tokens array of tokens
     * @return {string}
     */
    parse: function parse(tokens) {
      let formatted = "";
      for (let i = 0; i < tokens.length; i++) {
        const tkn = tokens[i];
        const tokenType = tkn.type;
        const token = tkn.token.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        if (tokenType != "OTHER") {
          formatted += `<span class="token ${this.tokenClasses[tokenType]}">${token}</span>`;
        } else {
          formatted += token;
        }
      }
      return formatted;
    },
  };

  /**
   * highlight all languages on page loads
   */
  w.addEventListener("load", function () {
    const langs = Object.keys(w.Colorful.tokenizers);
    for (let i = 0; i < langs.length; i++) {
      const lang = langs[i];
      const codes = document.getElementsByClassName("cf-" + lang);
      for (let k = 0; k < codes.length; k++) {
        const block = codes[k];
        const cfg = {
          enableLineNumbering: block.hasAttribute("lineNumbering"),
        };
        window.Colorful.compile(codes[k], cfg, lang);
      }
    }
  });
})(window);
