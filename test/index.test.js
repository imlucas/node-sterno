'use strict';

require('debug').enable('*');

var sterno = require('../'),
  Version = require('../lib/version'),
  assert = require('assert'),
  debug = require('debug')('sterno:test'),
  origin = 'http://localhost';

describe('asset', function(){
  before(function(){
    debug('resetting local storage');
    localStorage.clear();
  });

  describe('updated', function(){
    it('should have an updated flag if its a new file', function(done){
      sterno(origin, ['/app.js'], {manifest: {}}, function(err, app){
        if(err){
          return done(err);
        }
        assert.equal(app.assets[0].updated, true);
        done();
      });
    });

    it('should recognize a previously seen version', function(done){
      localStorage.setItem('sterno:manifest:/app.js', '1234');
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        assert.equal(app.assets[0].updated, false);
        done();
      });
    });
  });
  describe('upgrade', function(){
    it('should not upgrade if the file version matches', function(done){
      localStorage.setItem('sterno:manifest:/app.js', '1234');
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }

        app.manifest['/app.js'] = '1234';
        assert.equal(app.assets[0].updated, false);
        done();
      });
    });

    it('should upgrade if file version mismatches', function(done){
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }

        delete app.local['/app.js'];
        app.manifest['/app.js'] = '1234';
        localStorage.setItem('sterno:manifest:/app.js', '5678');

        app.version = new Version('1.0.0');
        app.latest = new Version('1.0.0');

        assert.equal(app.assets[0].upgrade, true);
        done();
      });
    });

    it('should not upgrade on app minor version mismatch', function(done){
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        app.version = new Version('1.0.0');
        app.latest = new Version('1.1.0');
        assert.equal(app.assets[0].upgrade, false);
        done();
      });
    });

    it('should not upgrade on app patch version mismatch', function(done){
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        app.version = new Version('1.0.1');
        app.latest = new Version('1.0.2');
        assert.equal(app.assets[0].upgrade, true);
        done();
      });
    });
  });
});
