"use strict";

var stor = require('stor'),
  debug = require('debug')('sterno:asset');

function Asset(name, app){
  this.name = name;
  this.app = app;

  this.tag = this.name.indexOf('.css') > -1 ? 'link' : 'script';
  this.update = false;

  var a = this.app.local,
    b = this.app.manifest,
    self = this;

  stor.get('sterno:manifest:' + this.name, function(err, res){
    if(!a[self.name]){
      a[self.name] = res;
    }

    self.update = (!a[self.name]) ? true : (b[self.name] !== a[self.name]);
  });

}
module.exports = Asset;

// Use our decision tree to check if we should actually pull down a nwe version
// of an asset.  Check that we're online, the file has changed and the version
// in the bootstrap is actually one we can use.
Object.defineProperty(Asset.prototype, 'upgrade', {get: function(){
  return navigator.onLine && this.update && this.app.upgrade;
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
      stor.set(self.name, data, function(err){
        if(err){
          return fn(err);
        }
        debug(self.name + ' version', self.app.manifest[self.name]);
        stor.set('sterno:versions:' + self.name,
          self.app.manifest[self.name], function(){
            fn(null, data);
          });
      });
    });
  }
  debug('need to fetch from cache', this.name);
  // No -> check FS
  stor.get(this.name, function(err, data){
    if(err){
      return fn(err);
    }
    if(data){
      self.append(data);
    }

    fn();
  });
};
