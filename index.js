"use strict";

// Async helper.  Like async.parallel.  Calls done on first non null error
// or when all tasks completed.
function parallel(tasks, done){
    var remaining = tasks.length,
        resolved = false;

    tasks.map(function(task){
        task(function(err, res){
            if(!resolved){
                if(err){
                    resolved = true;
                    return done(err);
                }
                remaining--;
                if(remaining === 0){
                    done();
                }
            }
        });
    });
}

// XHR fetch asset.
function fetch(url, done){
    if(!process.env || process.env.environment === 'development'){
        url += '?bust' + Math.random();
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(e) {
        if (e.target.status !== 200) {
            return done(new Error('wtf?: ' + e.target.status));
        }
        return done(null, e);
    };
    xhr.onerror = function(){
        done(new Error('XHR error'));
    };
    xhr.send();
}

//Map of assetType to function to drop it on the DOM.
var append = {
    'js': function(src){
        var el = document.createElement('script');
        el.type = 'text/javascript';
        if(src.indexOf('file://') === 0){
            el.src = src;
        }
        else {
            el.innerHTML = src; // Blob
        }
        document.head.appendChild(el);
        return el;
    },
    'css': function(src){
        var el;
        if(src.indexOf('file://') === 0){
            el = document.createElement('link');
            el.rel = 'stylesheet';
            el.type = 'text/css';
            el.href = src;
        }
        else {
            el = document.createElement('style');
            el.type = 'text/css';
            el.innerHTML = src; // Blob
        }
        document.head.appendChild(el);
        return el;
    }
};

// Loader instance handles everything for you.
//
// @param {String} url The base url for assets
// @param {Array} assets just a list of assets to manage, ie /app.css, /app.js, etc.
// @param {String} bootstrapPath optionally where bootstrap data can be found
function Loader(url, assets, bootstrapPath){
    this.url = url;
    this.assets = assets;
    this.bootstrapPath = (bootstrapPath ? url + bootstrapPath : url + '/sterno-bootstrap.json');
    this.versions = {};
    this.appVersion = localStorage.getItem('appVersion');

    // Hashes of files we've already seen.
    // Gets lazy loaded from localstorage
    this.localVersions = {};

    this.incomingVersion = {};
    this.version = {};
    if(this.appVersion){
        this.version = this.parseVersion(this.appVersion);
    }

}

// Use data from the bootstrap to check if a file is different from our
// local copy.
//
// @param {String} src Source of the file, ie /app.js
Loader.prototype.hasChanged = function(src){
    if(!this.localVersions[src]){
        this.localVersions[src] = localStorage.getItem('versions_' + src);
    }

    if(!this.localVersions[src]){
        return true;
    }

    return this.versions[src] !== this.localVersions[src];
};

// Use our decision tree to check if we should actually pull down a nwe version
// of an asset.  Check that we're online, the file has changed and the version
// in the bootstrap is actually one we can use.
//
// @param {String} src Source of the file, ie /app.js
Loader.prototype.shouldUpgradeAsset = function(src){
    if(!navigator.onLine || !this.hasChanged(src)){
        return false;
    }

    return (this.incomingVersion.major === this.version.major && this.incomingVersion.minor === this.version.minor);
};

// Just blow up a version string into a map of major, minor and patch.
//
// @param {String} v any version string, ie 0.1.1
Loader.prototype.parseVersion = function(v){
    var matches = /(\d+)\.(\d+)\.(\d+)/.exec(v);
    return {
        'major': matches[1],
        'minor': matches[2],
        'patch': matches[3]
    };
};

// Insert all of our assets into the DOM.
// Takes care of managing all the versions and fall backs.
//
// @param {Function} done
Loader.prototype.insert = function(done){
    var self = this;
    parallel(this.assets.map(function(src){
        var assetType = /.*\.(js|css)/.exec(src)[1];
        return function(callback){
            // Can we use this version and are we online?
            if(self.shouldUpgradeAsset(src)){
                // Yes -> download, add to dom, next tick save to disk
                fetch(self.url + src, function(err, event){
                    if(err){
                        return callback(err);
                    }

                    append[assetType](event.target.response);

                    self.write(src, event.target.response, function(err){
                        if(err){
                            return callback(err);
                        }
                        localStorage.setItem('versions_' + src,  self.versions[src]);
                        callback();
                    });
                });
            }
            else {
                // No -> check FS. not in fs, set to local URI
                self.read(src, function(err, blob){
                    if(err){ // Doesn't exist or no FS.
                        return append[assetType]('file://' + src);
                    }
                    append[assetType](blob);
                });
            }
        };
    }), function(err){
        done(err);
    });
};

// Cleaner API for reading from the local fs and handing back contents.
//
// @param {String} src
// @param {Function} done
Loader.prototype.read = function(src, done){
    if(!this.fs){
        return done(new Error('Filesystem not available?'));
    }

    this.fs.root.getFile(src, {}, function(entry){
        entry.file(function(file){
            var reader;
            if(window.cordova){
                reader = new window.cordova.require('cordova/plugin/FileReader')();
            }
            else {
                reader = window.FileReader();
            }

            reader.onloadend = function(e){
                done(null, e.target.result);
            };
            reader.readAsText(file);
        }, done);
    });
};

// Cleaner API for writing to local fs.
//
// @param {String} dest
// @param {String} blob
// @param {Function} done
Loader.prototype.write = function(dest, blob, done){
    var self = this;
    this.fs.root.getFile(dest, {'create': true, 'exclusive': false}, function(entry){
        entry.createWriter(function(writer){
            writer.onwriteend = function(e){
                done();
            };
            writer.write(blob);
        }, done);
    }, done);
};


// Kicks everything off.
// If we're in chrome, on window load, call device ready.
// If we're in cordova land, wait for device ready to actually fire.
//
// @param {Function} done
Loader.prototype.load = function(done){
    var self = this;
    window.addEventListener('load', function(){
        if(!window.cordova){
            return self.deviceReady(done);
        }
        document.addEventListener('deviceready', function(){
            self.deviceReady(done);
        });
    });
    return this;
};

// Called by window load or device ready depeneding on where we're running.
// Tries to get permissions for local filesystem and gets bootstrapping JSON
// data from the remote.  After it gets all that, does some version parsing to
// set up the data used to determine if an asset should be upgraded.
// When thats all good, calls `insert` to start loading our assets into the DOM.
Loader.prototype.deviceReady = function(done){
    done = done || function(){};
    var self = this;
    parallel([
        function getFS(callback){
            var requestFS = window.requestFileSystem || window.webkitRequestFileSystem;
            if(!requestFS){
                return callback();
            }
            var winFS = window.LocalFileSystem|| window;
            requestFS(winFS.PERSISTENT, 50 * 1024 * 1024, function(fs){
                self.fs = fs;
                callback();
            }, callback);
        },
        function getBootstrap(callback){
            fetch(self.bootstrapPath, function(err, event){
                if(err){
                    return callback(err);
                }
                self.versions = JSON.parse(event.target.response);

                // If we haven't bootstrapped yet, default to whats there now.
                if(!self.appVersion){
                    self.appVersion = self.versions.version;
                    self.version = self.parseVersion(self.appVersion);
                }
                self.incomingVersion = self.parseVersion(self.versions.version);
                callback();
            });
        }
    ], function(err){
        self.insert(done);
    });
};

// Usage:
// require('sterno')(process.env.url, ['/app.js']);
//
// on load / device ready:
//
// # get local file system for reading / writing file caches
// # load bootstrap json from remote
// # insert assets to the dom, and cache locally if need be
module.exports = function(url, assets, done){
    return new Loader(url, assets).load(done);
};

