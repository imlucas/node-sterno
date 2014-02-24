"use strict";

var gulp = require('gulp'),
  browserify = require('gulp-browserify');

gulp.task('test', function(){
  gulp.src('./test/*.js')
    .pipe(browserify({
      debug : true
    }))
    .pipe(gulp.dest('./.build'));

  gulp.src('./test/*.html')
    .pipe(gulp.dest('./.build'));
});
