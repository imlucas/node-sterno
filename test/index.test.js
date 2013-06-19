"use strict";

var assert = chai.assert,
    url = 'http://localhost';

describe("Loader", function(){
    before(function(){
        localStorage.clear();
    });

    describe("Setup", function(){
        var loader = new Loader(url, ['/app.js']);
        it("should use the default bootstrap path", function(){
            assert.equal(loader.bootstrapPath, url + '/sterno-bootstrap.json');
        });

        it("should be changed for a fresh file", function(){
            assert.equal(loader.hasChanged("/app.js"), true);
        });

        it("should not be changed if local storage matches", function(){
            loader.versions['/app.js'] = '1234';
            localStorage.setItem('versions_/app.js', '1234');
            assert.equal(loader.hasChanged('/app.js'), false);
        });
    });

    describe("Upgrade", function(){
        var loader = new Loader(url, ['/app.js']);

        // @todo (lucas) Way to stub navigator.onLine?
        // it("should not upgrade if we're not online", function(){
        //     assert.equal(loader.shouldUpgradeAsset('/app.js'), false);
        // });

        it("should not upgrade if the file version matches", function(){
            loader.versions['/app.js'] = '1234';
            localStorage.setItem('versions_/app.js', '1234');
            assert.equal(loader.shouldUpgradeAsset('/app.js'), false);
        });

        it("should upgrade if file version mismatches", function(){
            delete loader.localVersions['/app.js'];
            loader.versions['/app.js'] = '1234';
            localStorage.setItem('versions_/app.js', '5678');

            loader.version = loader.parseVersion('1.0.0');
            loader.incomingVersion = loader.parseVersion('1.0.0');

            assert.equal(loader.shouldUpgradeAsset('/app.js'), true);
        });

        it("should not upgrade on app minor version mismatch", function(){
            loader.version = loader.parseVersion('1.0.0');
            loader.incomingVersion = loader.parseVersion('1.1.0');
            assert.equal(loader.shouldUpgradeAsset('/app.js'), false);
        });

        it("should not upgrade on app patch version mismatch", function(){
            loader.version = loader.parseVersion('1.0.1');
            loader.incomingVersion = loader.parseVersion('1.0.2');
            assert.equal(loader.shouldUpgradeAsset('/app.js'), true);
        });
    });

    describe("Device Ready", function(){
        var loader = new Loader(url, ['/app.js']);
        it("should fire", function(done){
            loader.deviceReady(function(err){
                console.error(err);
                done();
            });
        });
    });
});