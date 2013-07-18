# Sterno

Tired of appcache being broken?  Still need to work with offline or packaged apps?  I'm here to help.

## Usage

    require('sterno')('http://assets.mysite.com', ['/app.css', '/app.js'], function(err){
        console.log('assets loaded.');
    });

## sterno.json

    {
        "/path.ext": "version",
        "a config key": "say environment, whatever you want"
    }

## Testing

I would love if this were easier, but you'll have to leap of
faith it with me a bit.  There are a few tests for the tricky
business logic parts that can just run and be hard tested in
the browser with mocha.  If you have ideas to test the other bits,
ie falling back to local resources when offline but not bootstrapped,
cordova file system access, etc, please [open an issue](https://github.com/imlucas/node-sterno/issues).

