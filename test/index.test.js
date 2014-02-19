"use strict";

var assert = window.chai.assert,
  origin = 'http://localhost';

describe("app", function(){
  before(function(){
    localStorage.clear();
  });

  describe("Setup", function(){
    var app = window.sterno(origin, ['/app.js'], '/sterno-manifest.json');

    it("should be changed for a fresh file", function(){
      assert.equal(app.assets[0].updated, true);
    });

    it("should not be changed if local storage matches", function(){
      app.manifest['/app.js'] = '1234';
      localStorage.setItem('sterno:manifest:/app.js', '1234');
      assert.equal(app.assets[0].updated, false);
    });
  });

  describe("Upgrade", function(){
    var app = window.sterno(origin, ['/app.js'], '/sterno-manifest.json');

    it("should not upgrade if the file version matches", function(){
      app.manifest['/app.js'] = '1234';
      localStorage.setItem('sterno:manifest:/app.js', '1234');
      assert.equal(app.assets[0].updated, false);
    });

    it("should upgrade if file version mismatches", function(){
      delete app.local['/app.js'];
      app.manifest['/app.js'] = '1234';
      localStorage.setItem('sterno:manifest:/app.js', '5678');

      app.version = app.parseVersion('1.0.0');
      app.latest = app.parseVersion('1.0.0');

      assert.equal(app.assets[0].upgrade, true);
    });

    it("should not upgrade on app minor version mismatch", function(){
      app.version = app.parseVersion('1.0.0');
      app.latest = app.parseVersion('1.1.0');
      assert.equal(app.assets[0].upgrade, false);
    });

    it("should not upgrade on app patch version mismatch", function(){
      app.version = app.parseVersion('1.0.1');
      app.latest = app.parseVersion('1.0.2');
      assert.equal(app.assets[0].upgrade, true);
    });
  });
});
