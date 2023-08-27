/* global $ */
const colors = {
  light: {
    "--bg-color": "#fefefe",
    "--text-color": "#000",
    "--border-color": "#000",
    "--bg-list-color": "#dbf9ff",
    "--border-size": "1px",
    "--replacer-before-color": "#fd7200",
    "--replacer-after-color": "#0400fd",
  },
  dark: {
    "--bg-color": "#272727",
    "--text-color": "#fff",
    "--border-color": "#fff7",
    "--bg-list-color": "#495255",
    "--replacer-before-color": "#fd7200",
    "--replacer-after-color": "#00d7fd",
  },
};

const darkModeToggle = $(".toggle-dark-mode");
darkModeToggle.on("change", () => {
  setColor(darkModeToggle.checked ? "dark" : "light");
});

/**
 *
 * @param {object} colorObj
 */
function setColor(type) {
  const colorObj = colors[type];
  localStorage.setItem("displayMode", type);
  const r = document.querySelector(":root");
  for (const type in colorObj) {
    r.style.setProperty(type, colorObj[type]);
  }
}

var mode = localStorage.getItem("displayMode");
if (mode) {
  darkModeToggle.checked = mode == "dark";
  setColor(mode);
}
