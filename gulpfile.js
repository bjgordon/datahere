'use strict';

var gulp        = require('gulp'),
    // watch       = require('gulp-watch'),
    // liveReload  = require('gulp-livereload'),
    concat      = require('gulp-concat'),
    // ngAnnotate  = require('gulp-ng-annotate'),
    minifyCss      = require('gulp-minify-css'),
    minifyHtml      = require('gulp-minify-html'),
    uglify      = require('gulp-uglify'),
    rename      = require('gulp-rename'),
    cache      = require('gulp-cache'),
    imagemin      = require('gulp-imagemin'),
    // autoprefixer = require('gulp-autoprefixer'),
    usemin = require('gulp-usemin'),
    moment      = require('moment'),
    notify      = require('gulp-notify'),
    // less        = require('gulp-less'),
    jshint      = require('gulp-jshint'),
    plumber     = require('gulp-plumber'),
    serve       = require('gulp-serve');

require('gulp-help')(gulp, {
        description: 'Help listing.'
    });


var del = require('del');

var onError = function(err) {
	// console.log(err);
  gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
      this.emit('end');
};

gulp.task('serve', ['default'], serve({
    root: ['dist'],
    port: 3000
}));

gulp.task('clean', function(cb) {
    del(['dist'], cb);
});

gulp.task('html', function() {
  gulp.src('src/index.html')
    .pipe(usemin({
        assetsDir: 'src',
        css: [minifyCss(), 'concat'],
        js: [uglify({mangle: false}), 'concat']
    }))
    .pipe(gulp.dest('dist'));

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
    // .pipe(cache(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true })))
    .pipe(gulp.dest('dist/img'))
    .pipe(notify({ message: 'img task complete' }));
});

gulp.task('fonts', function() {
  return gulp.src('bower_components/bootstrap/fonts/*')
    .pipe(gulp.dest('dist/fonts'));
});


// gulp.task('js', function () {
//   return gulp.src(['app/js/**/module.js', 'app/js/**/*.js'])
//     .pipe(concat('app.js'))
//     .pipe(gulp.dest('dist/js'));
// });

gulp.task('default', ['clean'], function() {
  gulp.start('jshint', 'img', 'fonts', 'html');
});
