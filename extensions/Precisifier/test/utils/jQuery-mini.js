(function () {
  
  /**
   *
   * @param {string} selector
   * @return {object}  
   */
  window.$ = function (selector) {
    const elem = document.querySelector(selector);
    return {
      element: elem,
      value:  () => elem.value,
      checked:  () => elem.checked,
      classList:  () => elem.classList,
      /**
       * Attach a event listener
       *
       * @param {string} type
       * @param {function} _function
       * @param {object} options
       */
      on: function (type, _function, options) {
        elem.addEventListener(type, _function, options);
      },

      remove: function () {
        elem.remove();
      },


      /**
       * adds html content to element
       * @param {string} html
      */
      addHTML: function (html) {
        elem.innerHTML += html;
      },

      /**
       * sets the html of element
       * @param {string} _html
      */
      html: function (_html) {
        elem.innerHTML = _html;
      },

      /**
       * Attach a event listener that runs when Enter key is Pressed
       * @param {function} fun 
       */
      onEnter: function (fun) {
        elem.addEventListener("keypress", (evt) => {
          if (evt.key == "Enter") {
            fun(evt);
          }
        });
      },

      onClick: function (fun) {
        elem.addEventListener("click", fun);
      },


      onChange: function (fun) {
        elem.addEventListener("change", fun);
      },


    };
  };
})();