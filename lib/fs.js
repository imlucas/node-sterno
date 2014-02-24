"use strict";

var debug = require('debug')('sterno:fs');

module.exports.read = function(src, fn){
  debug('read', src);
  var res = localStorage.getItem('sterno:asset:' + src);
  fn(null, res);
};

module.exports.write = function(dest, data, fn){
  debug('write', dest);
  var res = localStorage.setItem('sterno:asset:' + dest, data);
  fn(null, res);
};
