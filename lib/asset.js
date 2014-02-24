"use strict";

var fs = require('./fs'),
  debug = require('debug')('sterno:asset');

function Asset(name, app){
  this.name = name;
  this.app = app;

  this.tag = this.name.indexOf('.css') > -1 ? 'link' : 'script';
  this.upgrade = navigator.onLine && this.updated && this.app.upgrade;
  var a = this.app.local,
    b = this.app.manifest;

  if(!a[this.name]){
    debug(this.name, 'is new');
    a[this.name] = localStorage.getItem('sterno:manifest:' + this.name);
  }
  this.updated = (!a[this.name]) ? true : (b[this.name] !== a[this.name]);
}
module.exports = Asset;

// Use our decision tree to check if we should actually pull down a nwe version
// of an asset.  Check that we're online, the file has changed and the version
// in the bootstrap is actually one we can use.
Asset.prototype.upgrade = false;

// Use data from the bootstrap to check if a file is different from our
// local copy.
Asset.prototype.updated = false;

Asset.prototype.append = function(data){
  debug(this.name, 'appending to dom');
  var el = document.createElement(this.tag);
  el.type = 'text/' + (this.tag === 'script' ? 'javascript' : 'css');
  el.innerHTML = data;
  document.head.appendChild(el);
  return el;
};

Asset.prototype.inject = function(fn){
  debug(this.name, 'injecting');
  var self = this;
  if(this.upgrade){
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

  // No -> check FS
  fs.read(this.name, function(err, data){
    if(err){ // Doesn't exist or no FS.
      return fn(err);
    }
    self.append(data);
  });
};
