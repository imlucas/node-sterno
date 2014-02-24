"use strict";

var gulp = require('gulp'),
  browserify = require('gulp-browserify');

gulp.task('build', function(){
  gulp.src('./index.js')
    .pipe(browserify({
      debug : false
    }))
    .pipe(gulp.dest('./.build'));
});

gulp.task('test', function(){
  gulp.src('./test/*.js')
    .pipe(browserify({
      debug : true
    }))
    .pipe(gulp.dest('./.build'));
});
