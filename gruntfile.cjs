module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    browserify: {
      core: {
        src: "src/core.js",
        dest: "dist/core.js",
      },
      JavaScript: {
        src: "src/JavaScript.js",
        dest: "dist/JavaScript.js",
      },
      HTML: {
        src: "src/HTML.js",
        dest: "dist/HTML.js",
      },
    },
    uglify: {
      options: {
        compress: {
          unused: false,
          dead_code: false,
        },
      },
      core: {
        src: "dist/core.js",
        dest: "dist/core.min.js",
      },
      JavaScript: {
        src: "dist/JavaScript.js",
        dest: "dist/JavaScript.min.js",
      },
      HTML: {
        src: "dist/HTML.js",
        dest: "dist/HTML.min.js",
      },
    },
  });

  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.registerTask("default", [
    "browserify:core",
    "browserify:JavaScript",
    "browserify:HTML",
    "uglify:core",
    "uglify:JavaScript",
    "uglify:HTML",
  ]);
};
