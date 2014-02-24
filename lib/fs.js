"use strict";

var debug = require('debug')('sterno:fs');

// Browser system level fs api
var binding = null;

// If we don't have the binding yet, request and set it so next time,
// we'll just be a passthrough.
function getBinding(fn){
  if(binding !== null){
    return fn(null, binding);
  }

  var req = window.requestFilesystem || window.webkitRequestFilesystem,
    flag = window.LocalFilesystem && window.LocalFilesystem.PERSISTENT || window.PERSISTENT;

  if(!req){
    return fn(new Error('No request filesystem func?'));
  }

  debug('requesting access to local');
  req(flag, 50 * 1024 * 1024, function(res){
      binding = res;
      fn();
    }, fn);
}

function getEntry(src, opts, fn){
  getBinding(function(){
    binding.root.getFile(src, opts, fn);
  });
}

module.exports.read = function(src, fn){
  debug('read', src);
  getBinding(function(){
    getEntry(src, {}, function(entry){
      entry.file(function(file){
        var reader = window.FileReader();
        reader.onloadend = function(e){
          debug('loaded', src);
          fn(null, e.target.result);
        };
        reader.readAsText(file);
      }, fn);
    });
  });
};

module.exports.write = function(dest, data, fn){
  debug('write', dest);
  getBinding(function(){
    getEntry(dest, {'create': true, 'exclusive': false}, function(entry){
        entry.createWriter(function(writer){
          writer.onwriteend = function(e){
            debug('wrote', dest);
            fn(null, data);
          };
          writer.write(data);
        }, fn);
      }, fn);
  });
};
