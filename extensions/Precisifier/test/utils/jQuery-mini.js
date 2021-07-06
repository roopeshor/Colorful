(function () {
  
  /**
   *
   * @param {string} selector
   * @return {object}  
   */
  window.$ = function (selector) {
    const elem = document.querySelector(selector);
    if (elem) {
      /**
       * Attach a event listener
       *
       * @param {string} type
       * @param {function} _function
       * @param {object} options
       */
      elem.on = function (type, _function, options) {
        elem.addEventListener(type, _function, options);
      }
      
      /**
       * Attach a event listener that runs when Enter key is Pressed
       * @param {function} fun 
       */
      elem.onEnter = function(fun) {
        elem.addEventListener("keypress", (evt) => {
          if (evt.key == "Enter") {
            fun(evt);
          }
        });
      }
    }
    return elem
  };
})();