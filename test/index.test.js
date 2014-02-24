'use strict';

// require('debug').enable('*');

var sterno = require('../'),
  App = require('../lib/app'),
  Version = require('../lib/version'),
  assert = require('assert'),
  debug = require('debug')('sterno:test'),
  origin = 'http://localhost',
  mockedResources = {};

App.prototype.realFetch = App.prototype.fetch;
App.prototype.fetch = function(pathname, fn){
  if(!mockedResources[pathname]){
    return this.realFetch(pathname, fn);
  }
  mockedResources[pathname](fn);
};

function resources(pathnameToContents){
  Object.keys(pathnameToContents).map(function(pathname){
    mockedResources[pathname] = function(fn){
      fn(null, pathnameToContents[pathname]);
    };
  });
}

describe('sterno', function(){
  beforeEach(function(){
    localStorage.clear();
    mockedResources = {};
  });

  describe('new asset', function(){
    it('should download it the first time', function(done){
      resources({
        '/sterno-manifest.json': '{"version": "1.0.0", "/app.js": "1"}',
        '/app.js': 'console.log("yello world.");'
      });

      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        assert.equal(app.assets[0].update, true);
        done();
      });
    });

    it('should noop if the asset version has not changed', function(done){
      resources({
        '/sterno-manifest.json': '{"version": "1.0.0", "/app.js": "1"}',
        '/app.js': 'console.log("yello world.");'
      });
      localStorage.setItem('sterno:manifest:/app.js', '1');

      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        assert.equal(app.assets[0].update, false);
        done();
      });
    });
  });

  describe('asset update', function(){
    it('should noop if the asset version matches', function(done){
      resources({
        '/sterno-manifest.json': '{"version": "1.0.0", "/app.js": "1"}',
        '/app.js': 'console.log("yello world.");'
      });

      localStorage.setItem('sterno:manifest:/app.js', '1');

      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }

        assert.equal(app.assets[0].update, false);
        done();
      });
    });

    it('should update if the asset version has changed', function(done){
      resources({
        '/sterno-manifest.json': '{"version": "1.0.0", "/app.js": "2"}',
        '/app.js': 'console.log("yello world.");'
      });
      localStorage.setItem('sterno:manifest:/app.js', '1');
      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }
        assert.equal(app.assets[0].update, true);
        done();
      });
    });
  });

  describe('app version', function(){
    it('should download the new file if the hash has changed but the app version has not', function(done){
      resources({
        '/sterno-manifest.json': '{"version": "1.0.0", "/app.js": "2"}',
        '/app.js': 'console.log("hello world.");'
      });
      localStorage.setItem('sterno:app:version', '1.0.0');
      localStorage.setItem('sterno:manifest:/app.js', '1');

      sterno(origin, ['/app.js'], function(err, app){
        if(err){
          return done(err);
        }

        assert.equal(app.assets[0].update, true);
        done();
      });
    });
    describe('existing asset has changed', function(){
      function mockVersion(range, current, incoming, expect, done){
        resources({
          '/sterno-manifest.json': '{"version": "' + incoming + '", "/app.js": "2"}',
          '/app.js': 'console.log("hello world.");'
        });
        localStorage.setItem('sterno:app:version', current);
        localStorage.setItem('sterno:manifest:/app.js', '1');

        sterno(origin, ['/app.js'], {versionRange: range}, function(err, app){
          if(err){
            return done(err);
          }
          assert.equal(app.upgrade, expect);
          done();
        });
      }

      describe('using ~', function(){
        beforeEach(function(){
          localStorage.clear();
          mockedResources = {};
        });

        it('should upgrade if the patch version has changed', function(done){
          mockVersion('~', '1.0.0', '1.0.1', true, done);
        });

        it('should not upgrade if the minor version has changed', function(done){
          mockVersion('~', '1.0.0', '1.1.0', false, done);
        });

        it('should not upgrade if the major version has changed', function(done){
          mockVersion('~', '1.0.0', '2.0.0', false, done);
        });
      });

      describe('using *', function(){
        beforeEach(function(){
          localStorage.clear();
          mockedResources = {};
        });

        it('should upgrade if the patch version has changed', function(done){
          mockVersion('*', '1.0.0', '1.0.1', true, done);
        });

        it('should upgrade if the minor version has changed', function(done){
          mockVersion('*', '1.0.0', '1.1.0', true, done);
        });

        it('should upgrade if the major version has changed', function(done){
          mockVersion('*', '1.0.0', '2.0.0', true, done);
        });
      });

      describe('using ^', function(){
        beforeEach(function(){
          localStorage.clear();
          mockedResources = {};
        });

        it('should upgrade if the patch version has changed', function(done){
          mockVersion('^', '1.0.0', '1.0.1', true, done);
        });

        it('should upgrade if the minor version has changed', function(done){
          mockVersion('^', '1.0.0', '1.1.0', true, done);
        });

        it('should not upgrade if the major version has changed', function(done){
          mockVersion('^', '1.0.0', '2.0.0', false, done);
        });
      });

      describe('using ==', function(){
        beforeEach(function(){
          localStorage.clear();
          mockedResources = {};
        });

        it('should not upgrade if the patch version has changed', function(done){
          mockVersion('==', '1.0.0', '1.0.1', false, done);
        });

        it('should not upgrade if the minor version has changed', function(done){
          mockVersion('==', '1.0.0', '1.1.0', false, done);
        });

        it('should not upgrade if the major version has changed', function(done){
          mockVersion('==', '1.0.0', '2.0.0', false, done);
        });
      });

    });
  });
});
