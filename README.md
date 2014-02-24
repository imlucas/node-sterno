# sterno

[![build status](https://secure.travis-ci.org/imlucas/node-sterno.png)](http://travis-ci.org/imlucas/node-sterno)

## @todo update examples as api has changed in 2.0.0

Tired of appcache being broken?  Still need to work with offline or packaged apps?  I'm here to help.

    // this will look for http://assets.mysite.com/sterno-bootstrap.json
    // and from that load
    //
    //  * http://assets.mysite.com/app.css
    //  * http://assets.mysite.com/app.js
    //
    // it stores the current version id of these files, as specifed by the values
    // in sterno-bootstrap.json, in localstorage and writes the contents
    // to the local filesystem.
    //
    // you shouldnt have to worry about where your files are actually being served
    // from.  extensive docs are in the code.
    //
    // http://assets.mysite.com/sterno-bootstrap.json should not be
    // cached with HTTP headers.
    // baseUrl, asset paths, callback.
    require('sterno')('http://assets.mysite.com', ['/app.css', '/app.js'], function(err){
        console.log('assets loaded.');
    });


The first part of using `sterno` is to create a
`sterno-bootstrap.json` which is like an appcache manifest.

    {
        "/path.ext": "file version version",
        "a config key": "say environment, whatever you want",
        "version": "0.0.0"
    }

[mott](http://github.com/imlucas/mott) has a builtin step for creating these
bootstrap files but basically it is just a bunch of keys.

all other keys in the bootstrap json should be asset paths where baseUrl is the
root or the current directory of your html file.

the value for all of these paths should be a hash or version number or
your favorite base64 gif to use when talking about that version of the file.
when the value for a path key changes, that asset will be updated in the local
cache to that version.

the only really required key thats not a path is `version`.
`version` should be a valid semver.
like package.json, it's ok to use a fake one like 0.0.0.
it's here to help you.

sterno keeps track of this version number locally and currently
will stop updating local assets versions when the minor version number is
different than the one it has locally.  this doesnt need to be updated for
every deploy and is merely a convenience for you to not break code
if that's what you're into.
@todo (lucas) should be a way to opt out of this / supply your own
              comparison function.


## Testing

I would love if this were easier, but you'll have to leap of
faith it with me a bit.  There are a few tests for the tricky
business logic parts that can just run and be hard tested in
the browser with mocha.  If you have ideas to test the other bits,
ie falling back to local resources when offline but not bootstrapped,
cordova file system access, etc, please [open an issue](https://github.com/imlucas/node-sterno/issues).

## License

MIT
