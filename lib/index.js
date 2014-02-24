"use strict";

var App = require('./app'),
  debug = require('debug')('sterno:app');

module.exports = function(origin, assets, opts, fn){
  if(typeof opts === 'function'){
    fn = opts;
    opts = {};
  }
  opts = opts || {};
  fn = fn || function(){};

  debug('loading', {origin: origin, assets: assets});

  var app = new App(origin, assets, opts, function(err){
    if(err){
      debug('ruh roh shaggy', err);
      return fn(err, app);
    }
    debug('ready to go!');
    fn(null, app);
  });
};
