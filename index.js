"use strict";

var fs = {
  // Browser system level fs api
  sys: null,

  // Request 50MB
  size: 50 * 1024 * 1024,

  read: function(src, fn){
    if(!fs.sys){
      return fs.acquire(function(err){
        if(err){
          return fn(err);
        }
        fs.read(src, fn);
      });
    }

    fs.entry(src, {}, function(entry){
      entry.file(function(file){
        var reader = window.FileReader();
        reader.onloadend = function(e){
          fn(null, e.target.result);
        };
        reader.readAsText(file);
      }, fn);
    });
  },
  write: function(dest, data, fn){
    if(!fs.sys){
      return fs.acquire(function(err){
        if(err){
          return fn(err);
        }
        fs.write(dest, data, fn);
      });
    }
    fs.entry(dest, {'create': true, 'exclusive': false}, function(entry){
        entry.createWriter(function(writer){
          writer.onwriteend = function(e){
            fn(null, data);
          };
          writer.write(data);
        }, fn);
      }, fn);
  },
  entry: function(src, opts, fn){
    if(fs.sys){
      return fs.sys.root.getFile(src, opts, fn);
    }
    fs.acquire(function(){
      fs.entry(src, opts, fn);
    });
  },

  acquire: function(fn){
    var req = window.requestFileSystem || window.webkitRequestFileSystem,
      flag = window.LocalFileSystem && window.LocalFileSystem.PERSISTENT || window.PERSISTENT;
    if(!req){
      return fn(new Error('No request filesystem func?'));
    }

    req(flag, fs.size, function(sys){
        fs.sys = sys;
        fn();
      }, fn);
  }
};

// Async helper.  Like async.parallel.  Calls done on first non null error
// or when all tasks completed.
function parallel(tasks, fn){
  var remaining = tasks.length,
    resolved = false;

  tasks.map(function(task){
    task(function(err, res){
      if(!resolved){
        if(err){
          resolved = true;
          return fn(err);
        }
        remaining--;
        if(remaining === 0){
          fn();
        }
      }
    });
  });
}

// XHR fetch asset.
// Use XHR because we can get contents as blob and insert into local fs easily.
function fetch(url, fn){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function(e) {
    if (e.target.status !== 200) {
      return fn(new Error('wtf?: ' + e.target.status));
    }
    fn(null, e.target.response);
  };
  xhr.onerror = function(){
    fn(new Error('XHR error'));
  };
  xhr.send();
}

function append(tag, blob){
  var el = document.createElement(tag);
  el.type = 'text/' + (tag === 'script' ? 'javascript' : 'css');
  el.innerHTML = blob;
  document.head.appendChild(el);
  return el;
}

// Just blow up a version string into a map of major, minor and patch.
//
// @param {String} v any version string, ie 0.1.1
function parseVersion(v){
  var matches = /(\d+)\.(\d+)\.(\d+)/.exec(v);
  return {
    'major': matches[1],
    'minor': matches[2],
    'patch': matches[3]
  };
}

var app = {
  // Origin URL we should fetch from
  origin: null,

  debug: false,

  manifestName: '/manifest.json',

  // Assets we're managing
  assets: [],

   // Incoming version
  latest: null,

  // Hashes of files we've already seen.
  // Gets lazy loaded from localstorage
  local: {},

  // Manifest map we'll fetch to bootstrap
  manifest: {},

  // Insert all of our filenames into the DOM.
  // Takes care of managing all the versions and fallbacks.
  inject: function(fn){
    parallel(app.assets.map(function(asset){
      return function(cb){
        asset.inject(cb);
      };
    }), fn);
  },

  bootstrap: function(fn){
    fetch(app.origin + app.manifestName + '?' + Math.random(), function(err, data){
      if(err){
        return fn(err);
      }
      app.manifest = JSON.parse(data);
      // If we haven't bootstrapped yet, default to whats there now.
      if(!app.version){
        app.version = parseVersion(app.manifest.version);
      }
      app.latest = parseVersion(app.manifest.version);
      fn();
    });
  },

  // Tries to get permissions for local filesystem and gets bootstrapping JSON
  // data from the remote.  After it gets all that, does some version parsing to
  // set up the data used to determine if an asset should be upgraded. When
  // thats all good, calls `inject` to start loading our filenames into the DOM.
  main: function(origin, assets, manifestName, fn){
    var i;
    app.origin = origin;
    app.manifestName = manifestName;
    fn = fn || function(){};

    for(i=0; i< assets.length; i++){
      app.assets.push(new Asset(assets[i]));
    }

    window.addEventListener('load', function(){
      fn = fn || function(){};
      parallel([fs.acquire, app.bootstrap], function(){
        app.inject(fn);
      });
    });
    return app;
  },
  parseVersion: parseVersion
};

// Current version of the app.
/*Object.defineProperty(app, 'version', {get: function(){
  var v = localStorage.getItem('sterno:app:version');
  if(v){
    return parseVersion(v);
  }
}});*/

Object.defineProperty(app, 'autoUpgrade', {get: function(){
  return (this.latest.major === this.version.major && this.latest.minor === this.version.minor);
}});

function Asset(name){
  this.name = name;
}

// Use data from the bootstrap to check if a file is different from our
// local copy.
Object.defineProperty(Asset.prototype, 'updated', {get: function(){
  if(!app.local[this.name]){
    app.local[this.name] = localStorage.getItem('sterno:manifest:' + this.name);
  }
  return (!app.local[this.name]) ? true : (app.manifest[this.name] !== app.local[this.name]);
}});

// Give me a URL to it with cache busting or whatever.
Object.defineProperty(Asset.prototype, 'url', {get: function(){
  var version = app.local[this.name],
    url = this.url + this.name;

  if(app.debug){
    url += '?bust' + Math.random();
  }
  else if(version){
    url  += '/' + version;
  }

  return url;
}});

// Use our decision tree to check if we should actually pull down a nwe version
// of an asset.  Check that we're online, the file has changed and the version
// in the bootstrap is actually one we can use.
Object.defineProperty(Asset.prototype, 'upgrade', {get: function(){
  return navigator.onLine && this.updated && app.autoUpgrade;
}});

Object.defineProperty(Asset.prototype, 'tag', {get: function(){
  return this.name.indexOf('.css') > -1 ? 'link' : 'script';
}});

Asset.prototype.inject = function(fn){
  var self = this;
  if(this.upgrade){
    // Yes -> download, add to dom, next tick save to disk
    return fetch(this.url, function(err, data){
      if(err){
        return fn(err);
      }
      append(self.tag, data);
      fs.write(self.name, data, function(err){
        if(err){
          return fn(err);
        }
        localStorage.setItem('sterno:versions:' + self.name,  app.manifest[self.name]);
        fn(null, data);
      });
    });
  }

  // No -> check FS
  fs.read(this.name, function(err, data){
    if(err){ // Doesn't exist or no FS.
      return fn(err);
    }
    append(self.tag, data);
  });
};

try{
  module.exports = app.main;
}
catch(e){
  window.sterno = app.main;
}
