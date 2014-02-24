"use strict";

var Asset = require('./asset'),
  Version = require('./version'),
  debug = require('debug')('sterno:app');

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

// Tries to get permissions for local filesystem and gets bootstrapping JSON
// data from the remote.  After it gets all that, does some version parsing to
// set up the data used to determine if an asset should be upgraded. When
// thats all good, calls `inject` to start loading our filenames into the DOM.
function App(origin, assets, opts, fn){
  if(typeof opts === 'function'){
    fn = opts;
    opts = {};
  }
  opts = opts || {};
  fn = fn || function(){};

  var self = this,
    storedVersion = localStorage.getItem('sterno:app:version');

  // Origin URL we should fetch from
  this.origin = origin;
  this.manifestName = opts.manifest || '/sterno-manifest.json';

  // Incoming version
  this.latest = null;

  // If we've run before this will be set to something.
  this.version = storedVersion ? new Version(storedVersion) : null;

  this.isFirstRun = this.version === null;

  this.versionRange = opts.versionRange || '^';

  // Hashes of files we've already seen.
  // Gets lazy loaded from localstorage
  this.local = {};

  // Manifest map we'll fetch to bootstrap
  this.manifest = null;

  this.timeout = opts.timeout || 1000;

  // Map of pathname to timeout id.
  this.fetchTimeouts = {};

  self.bootstrap(function(err){
    if(err){
      return fn(err, self);
    }

    // Assets we're managing
    self.assets = assets.map(function(asset){
      return new Asset(asset, self);
    });
    self.inject(function(err){
      fn(err, self);
    });
  });
}

module.exports = App;

App.prototype.bootstrap = function(fn){
  var self = this;
  self.fetch(self.manifestName, function(err, data){
    if(err){
      return fn(err);
    }
    self.manifest = JSON.parse(data);

    // If we haven't bootstrapped yet, default to whats there now.
    self.latest = new Version(self.manifest.version);
    if(!self.version){
      self.version = self.latest;
    }
    fn();
  });
};
Object.defineProperty(App.prototype, 'upgrade', {get: function(){
  var a = this.version, b = this.latest, res;

  if(this.versionRange === '*'){
    res = true;
  }
  else if(this.versionRange === '^'){
    res = (b.major === a.major);
  }
  else if(this.versionRange === '~'){
    res = (b.major === a.major && b.minor === a.minor);
  }
  else {
    res = (b.major === a.major && b.minor === a.minor && b.patch === a.patch);
  }

  debug('upgrade', this.versionRange, this.version, '->', this.latest, res);
  return res;
}});

// Insert all of our filenames into the DOM.
// Takes care of managing all the versions and fallbacks.
App.prototype.inject = function(fn){
  debug('injecting all assets');
  parallel(this.assets.map(function(asset){
    return function(cb){
      asset.inject(cb);
    };
  }), fn);
};

// XHR fetch asset.
// Use XHR because we can get contents as blob and insert into local fs easily.
App.prototype.fetch = function (pathname, fn){
  var xhr = new XMLHttpRequest(),
    url = this.origin + pathname,
    self = this;

  debug('attempting to fetch', url);

  this.fetchTimeouts[pathname] = setTimeout(function(){
    fn(new Error('Failed to load ' + pathname + ' within timeout'));
  }, this.timeout);

  xhr.open('GET', url, true);
  xhr.onload = function(e){
    clearTimeout(self.fetchTimeouts[pathname]);
    if (e.target.status !== 200) {
      return fn(new Error('wtf?: ' + e.target.status));
    }
    fn(null, e.target.response);
  };
  xhr.onerror = function(){
    fn(new Error('XHR error'));
  };
  xhr.send();
};
