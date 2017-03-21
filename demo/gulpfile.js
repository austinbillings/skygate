// Deps ==========================================
var bower = require('bower-files')();
var path = require('path');
var zaq = require('zaq');
var chalk = require('chalk');
var merge = require('merge-stream');
var gulp = require('gulp');
var sass = require('gulp-sass');
var less = require('gulp-less');
var copy = require('gulp-copy');
var filter = require('gulp-filter');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var uglifyCSS = require('gulp-uglifycss');
var imageResize = require('gulp-image-resize');

// Config =======================================

var bowerDir = './bower_components/';
var outputDir = './dist';

var sources = {
	photos: ['./assets/**/*.jpg'],
  css: bower.ext('css').files,
  less: bower.ext('less').files,
	sass: ['./scss/**/*.scss'],
  js: bower.ext('js').files,
  fonts: [],
	app: ['./js/**/*.js']
};

sources.js.push('./lib/**/*.js');
sources.css.push('./lib/**/*.css');
sources.fonts.push(bowerDir + '/bootstrap/fonts/*');
sources.fonts.push(bowerDir + '/font-awesome/fonts/*');
sources.fonts.push('./ui/**/fonts/*');

// Tasks ==========================================

gulp.task('js', () => {
    gulp.src(sources.js)
    .pipe(concat('vendor.js'))
    //.pipe(uglify({ ascii_only: true }))
    .pipe(gulp.dest(outputDir));
});

gulp.task('fonts', () => {
  gulp.src(sources.fonts)
    .pipe(copy(outputDir + '/fonts', {prefix: 4}));
});

gulp.task('thumbs', () => {
	var thumbFilter = filter(['**', '!**/*-thumb.jpg']);
	gulp.src(sources.photos)
		.pipe(thumbFilter)
		.pipe(imageResize({ height: 400 }))
		.pipe(rename({ suffix: '-thumb' }))
		.pipe(gulp.dest(function (path) {
			return path.base;
		}));
});

gulp.task('css', () => {
  var unprocessed = gulp.src(sources.css);
  var processed = gulp.src(sources.less).pipe(less({ paths: [ path.join(__dirname, 'less', 'includes')] }))
    .pipe(replace(/url\('[^\']*fonts\//gi, 'url(\'fonts/'));

  merge(unprocessed, processed)
    .pipe(concat('vendor.css'))
    .pipe(uglifyCSS({uglyComments: true, maxLineLen: 500}))
    .pipe(gulp.dest(outputDir));
});

gulp.task('app', () => {
	zaq.info('Compiling Frontend. . .');
	gulp.src(sources.app)
		.pipe(concat('app.js'))
		.pipe(gulp.dest(outputDir));
});

gulp.task('sass', () => {
	zaq.info('Compiling Sass. . .');
	gulp.src(sources.sass)
		.pipe(concat('ui.css'))
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(outputDir));
});

gulp.task('deps', ['js','fonts','css']);

gulp.task('default', () => {
	zaq.info('Watching ' + chalk.bold('./scss') + ' for Sass file changes. . .');
	gulp.watch(sources.sass, ['sass']);
	zaq.info('Watching ' + chalk.bold('./js') + ' for app file changes. . .');
	gulp.watch(sources.app, ['app']);
});
