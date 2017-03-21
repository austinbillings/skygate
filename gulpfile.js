const zaq = require('zaq');
const gulp = require('gulp');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');

const config = require('./config.js');

gulp.task('build', () => {
  zaq.info('Compiling app. . .');
  gulp.src(config.list)
    .pipe(babel({presets: ['env']}))
    .pipe(concat(config.name + '.js'))
    .pipe(gulp.dest(config.outputDir));
  gulp.src(config.list)
    .pipe(babel({presets: ['env']}))
    .pipe(concat(config.name + '.min.js'))
    .pipe(uglify({ ascii_only: true }))
    .pipe(gulp.dest(config.outputDir));
});

gulp.task('liveBuild', () => {
  zaq.info('Watching list for file changes. . .');
  gulp.watch(config.list, ['build']);
})

gulp.task('default', ['build', 'liveBuild']);
