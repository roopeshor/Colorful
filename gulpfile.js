const gulp = require("gulp");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");

function build() {
  return gulp
    .src("src/*.js")
    .pipe(gulp.dest("dist"))
    .pipe(
      uglify({
        compress: {
          unused: false,
          dead_code: false,
        },
      }),
    )
    .pipe(rename({ extname: ".min.js" }))
    .pipe(gulp.dest("dist"));
}

exports.build = build;
exports.default = build;
