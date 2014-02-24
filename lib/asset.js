"use strict";

var fs = require('./fs'),
  debug = require('debug')('sterno:asset');

function Asset(name, app){
  this.name = name;
  this.app = app;

  this.tag = this.name.indexOf('.css') > -1 ? 'link' : 'script';
}
module.exports = Asset;

// Use our decision tree to check if we should actually pull down a nwe version
// of an asset.  Check that we're online, the file has changed and the version
// in the bootstrap is actually one we can use.
Object.defineProperty(Asset.prototype, 'upgrade', {get: function(){
  return navigator.onLine && this.update && this.app.upgrade;
}});

// Use data from the bootstrap to check if a file is different from our
// local copy.
Object.defineProperty(Asset.prototype, 'update', {get: function(){
  var a = this.app.local,
    b = this.app.manifest;

  if(!a[this.name]){
    a[this.name] = localStorage.getItem('sterno:manifest:' + this.name);
  }
  return (!a[this.name]) ? true : (b[this.name] !== a[this.name]);
}});

Asset.prototype.append = function(data){
  debug('appending to dom', this.name);
  var el = document.createElement(this.tag);
  el.type = 'text/' + (this.tag === 'script' ? 'javascript' : 'css');
  el.innerHTML = data;
  document.head.appendChild(el);
  return el;
};

Asset.prototype.inject = function(fn){
  debug('injecting', this.name);
  var self = this;
  if(this.upgrade){
    debug(this.name, 'upgrading');
    // Yes -> download, add to dom, next tick save to disk
    return this.app.fetch(this.name, function(err, data){
      if(err){
        return fn(err);
      }
      self.append(data);
      fs.write(self.name, data, function(err){
        if(err){
          return fn(err);
        }
        debug(self.name + ' version', self.app.manifest[self.name]);
        localStorage.setItem('sterno:versions:' + self.name,  self.app.manifest[self.name]);
        fn(null, data);
      });
    });
  }
  debug('need to fetch from fs', this.name);
  // No -> check FS
  fs.read(this.name, function(err, data){
    debug('fs read returned', err, data);
    if(err){
      return fn(err);
    }
    if(data){
      self.append(data);
    }

    fn();
  });
};
