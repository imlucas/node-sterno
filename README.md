# sterno

Tired of appcache being broken?  Still need to work with offline or packaged
apps?  I'm here to help.

[![build status](https://secure.travis-ci.org/imlucas/node-sterno.png)](http://travis-ci.org/imlucas/node-sterno)

## Example

Create a `bootloader.js` entry point to tell sterno what your app's origin is
and what files you want it to manage:

```
var sterno = require('sterno');
sterno('http://imlucas.github.io/node-sterno', ['/app.js']);
```

And create a [gulpjs](http://gulpjs.com) file like:

```
var gulp = require('gulp'),
  browserify = require('gulp-browserify'),
  githubPages = require('gulp-github-pages'),
  manifest = require('gulp-sterno-manifest');

gulp.task('manifest', function(){
  gulp.src('./.build/**/*')
    .pipe(manifest({
      version: '0.0.1'
    }))
    .pipe(gulp.dest('./.build/sterno-manifest.json'));
});

gulp.task('build', function(){
  gulp.src('./{bootloader,app}.js')
    .pipe(browserify({debug : false}))
    .pipe(gulp.dest('./.build'));

  gulp.src('./app/index.html')
    .pipe(gulp.dest('./.build'));
});

gulp.task('publish', function(){
  gulp.src('./.build/**/*')
    .pipe(githubPages());
});

gulp.task('deploy', ['build', 'manifest', 'publish']);
```

And a barebones `index.html`:

```
<!DOCTYPE html>
<html>
  <head>
    <title>Sterno Demo</title>
  </head>
  <body>
    <script src="bootstrap.js"></script>
  </body>
</html>

```

When you run `gulp deploy` you got yourself a stew goin':

 - browserify will build your `app.js` and `bootloader.js` into `./.build`
 - copy `index.html` into build
 - generate the manifest file for sterno to use
 - deploy everything to your github pages

When you open your app in chrome, sterno will:

 - phone home for your manifest file
 - download everything in the manifest if it's your first time to the app
 - only download assets that have changed in the manifest
 - if an asset hasn't changed, it will just be served locally


@todo: Actually check-in this example.

## Testing

See project on [travisci](http://travis-ci.org/imlucas/node-sterno) or just
run locally if you have phantomjs installed:

    npm test

## License

MIT
