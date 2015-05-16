'use strict';
/*global require, console */

var gulp        = require('gulp'),
    minifyCss      = require('gulp-minify-css'),
    uglify      = require('gulp-uglify'),
    cache      = require('gulp-cache'),
    imagemin      = require('gulp-imagemin'),
    usemin = require('gulp-usemin'),
    notify      = require('gulp-notify'),
    jshint      = require('gulp-jshint'),
    plumber     = require('gulp-plumber'),
    zip = require('gulp-zip');


require('gulp-help')(gulp, {
        description: 'Help listing.'
    });

var del = require('del');

var onError = function(err) {
	 console.log(err);
};

gulp.task('clean', function(cb) {
    del(['dist', 'datahere.zip'], cb);
});

gulp.task('html', function() {
  gulp.src('src/app/index.html')
    .pipe(usemin({
        assetsDir: 'src/app',
        css: [minifyCss(), 'concat'],
        js: [uglify({mangle: false}), 'concat']
    }))
    .pipe(gulp.dest('dist/app'));

});


gulp.task('jshint', function() {
    return gulp.src('src/app/js/*.js')
    .pipe(plumber({
        errorHandler: onError
    }))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(notify({ message: 'jshint task complete' }));
});

gulp.task('img', function() {
  return gulp.src('src/assets/images/**/*')
    .pipe(cache(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true })))
    .pipe(gulp.dest('dist/app/img'))
    .pipe(notify({ message: 'img task complete' }));
});

gulp.task('fonts', function() {
  return gulp.src('bower_components/bootstrap/fonts/*')
    .pipe(gulp.dest('dist/app/fonts'));
});

gulp.task('server.js', function() {
  return gulp.src(['src/server.js', 'package.json'])
    .pipe(gulp.dest('dist'));
});

gulp.task('zip', function() {
  return gulp.src('dist/**')
    .pipe(zip('datahere.zip'))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['clean'], function() {
  gulp.start('jshint', 'img', 'fonts', 'html', 'server.js', 'zip');
});
