"use strict";


// require('sterno')('http://assets.mysite.com', ['/app.js', '/app.css']);
var LocalFileSystem = LocalFileSystem || {},
    cordova = cordova || {};

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

// Usage:
// require('bootstrap-loader')(process.env.url, {'js': '/app.js'});
module.exports = function(url, assets, done){
    return new Loader(url, assets).load(done);
};

//Map of assetType to function to drop it on the dom.
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

// url: The base url for assets
// assets: map of {js: [], 'css': []}
// bootstrapPath: Where bootstrap data can be found.
function Loader(url, assets, bootstrapPath){
    this.url = url;
    this.assets = assets;
    this.bootstrapPath = (bootstrapPath ? url + bootstrapPath : url + '/sterno-bootstrap.json');
    this.versions = {};
    this.appVersion = localStorage.getItem('appVersion');

    this.localVersions = {}; // Gets lazy loaded from localstorage

    this.incomingVersion = {};
    this.version = {};
    if(this.appVersion){
        this.version = this.parseVersion(this.appVersion);
    }

}

Loader.prototype.hasChanged = function(src){
    if(!this.localVersions[src]){
        this.localVersions[src] = localStorage.getItem('versions_' + src);
    }

    if(!this.localVersions[src]){
        return true;
    }

    return this.versions[src] !== this.localVersions[src];
};

Loader.prototype.shouldUpgradeAsset = function(src){
    if(!navigator.onLine || !this.hasChanged(src)){
        return false;
    }

    return (this.incomingVersion.major === this.version.major && this.incomingVersion.minor === this.version.minor);
};

Loader.prototype.parseVersion = function(v){
    var matches = /(\d+)\.(\d+)\.(\d+)/.exec(v);
    return {
        'major': matches[1],
        'minor': matches[2],
        'patch': matches[3]
    };
};

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

Loader.prototype.read = function(src, done){
    if(!this.fs){
        return done(new Error('Filesystem not available?'));
    }

    this.fs.root.getFile(src, {}, function(entry){
        entry.file(function(file){
            var reader;
            if(cordova){
                reader = new cordova.require('cordova/plugin/FileReader')();
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

Loader.prototype.load = function(done){
    var self = this;
    window.addEventListener('load', function(){
        if(navigator.vendor === 'Google Inc.'){
            return self.deviceReady(done);
        }
        document.addEventListener('deviceready', function(){
            self.deviceReady(done);
        });
    });
    return this;
};

Loader.prototype.deviceReady = function(done){
    done = done || function(){};
    var self = this;
    parallel([
        function getFS(callback){
            (window.requestFileSystem || window.webkitRequestFileSystem)(LocalFileSystem.PERSISTENT || window.PERSISTENT, 50 * 1024 * 1024, function(fs){
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

