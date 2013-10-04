"use strict";

var Loader = function(){
    this.url = process.env.url;
    this.version = process.env.version;
    this.environment = process.env.environment;
    console.log(this.url, this.version, this.environment);
    this.loadTO = null;
    this.jsLoaded = false;
}

// First listen for window 'load' event. 
// Then listen for 'deviceready' and start new Loader
Loader.prototype.init = function(){
    window.addEventListener(
        'load',
        function(e){    
            document.addEventListener(
                'deviceready',
                function(e){
                    console.log('deviceready');
                    this.getFiles();
                }.bind(this),
                false
            );
        }.bind(this),
        false
    );
}

// Get js and css based on what environment we are in
Loader.prototype.getFiles = function(){
    console.log('get files');
    this.loadTO = setTimeout(this.loadTimeout.bind(this), 7000);
    window.addEventListener(
        'jsLoaded',
        function(e){
            console.log('js loaded');
            this.jsLoaded = true;
            clearTimeout(this.loadTO);
        }.bind(this),
        false
    );
    if(this.environment === 'development'){
        window.addEventListener(
            'cssLoaded',
            this.getRemoteJS.bind(this),
            false
        );
        this.getRemoteCSS();
    }
    else{
        window.addEventListener(
            'cssLoaded',
            this.getFilesystemJS.bind(this),
            false
        );
        this.getFileSystem();
    }
}

/**************************** FILESYSTEM ****************************/


// Request access to the device filesystem
Loader.prototype.getFileSystem = function(){
    console.log('getFilesystem');
    window.requestFileSystem(
        LocalFileSystem.PERSISTENT, 
        50*1024*1024, 
        this.gotFileSystem.bind(this), 
        this.getBundleCSS.bind(this)
    );
}

// We got filesystem access
// Get remote boostrap code
Loader.prototype.gotFileSystem = function(fileSystem){
    this.fileSystem = fileSystem;
    this.getFilesystemCSS();
}

// Load CSS from filesystem
Loader.prototype.getFilesystemCSS = function(){
    this.getFileFromFilesystem(
        'app.css',
        {
            'onSuccess': this.appendCSS,
            'onFail': this.getBundleCSS
        }
    );
};

// Load JS from filesystem
Loader.prototype.getFilesystemJS = function(){
    this.getFileFromFilesystem(
        'app.js',
        {
            'onSuccess': this.appendJS,
            'onFail': this.getBundleJS
        }
    );
};

// Get a file from the filesystem
Loader.prototype.getFileFromFilesystem = function(fileName, options){
    console.log('getting ' + fileName + ' from filesystem');
    if(this.fileSystem){
        this.fileSystem.root.getFile(
            fileName, 
            {}, 
            function(fileEntry){
                fileEntry.file(
                    function(file){
                        //var FileReader = cordova.require('cordova/plugin/FileReader');
                        var reader = new FileReader();
                        reader.onloadend = function(e) {
                            if(options.onSuccess){
                                options.onSuccess.call(this, e.target.result);
                            }       
                        }.bind(this);
                        reader.readAsText(file);
                    }.bind(this),
                    options.onFail.bind(this)
                );
            }.bind(this), 
            options.onFail.bind(this)
        );
    }
    else{
        options.onFail.call(this);
    }
};

/****************************** BUNDLE ******************************/


// Load CSS from app bundle
Loader.prototype.getBundleCSS = function(){
    console.log('get bundle CSS');
    this.getRemoteFile(
        'app.css',
            {
                'type': 'css',
                'onSuccess': this.appendCSS,
        	    'onFail': this.appendCSS
            }
    );
};

// Load JS from app bundle
Loader.prototype.getBundleJS = function(){
    console.log('get bundle js');
    this.getRemoteFile(
        'app.js',
            {
                'type': 'js',
                'onSuccess': this.appendJS,
        	    'onFail': this.appendJS
            }
    );
};


/****************************** REMOTE ******************************/


// Load CSS from app bundle
Loader.prototype.getRemoteCSS = function(){
    console.log('get remote CSS');
    this.getRemoteFile(
        this.url + '/app.css?r=' + Math.random(),
            {
                'type': 'css',
                'onSuccess': this.appendCSS,
        	    'onFail': this.getFileSystem
            }
    );
};

// Load JS from app bundle
Loader.prototype.getRemoteJS = function(){
    console.log('get remote js');
    this.getRemoteFile(
        this.url + '/app.js?r=' + Math.random(),
            {
                'type': 'js',
                'onSuccess': this.appendJS,
        	    'onFail': this.getFilesystemJS
            }
    );
};

// Get a remote file.
Loader.prototype.getRemoteFile = function(url, options){
    console.log('getting remote file: ' + url);
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	//xhr.responseType = 'blob';
	xhr.onload = function(e) {
	   console.log(url + ' status: ' + e.target.status);
	   var blob = e.target.response;
	   if (e.target.status == 200) {
	       if(options.onSuccess){
    	       options.onSuccess.call(this, blob);
    	   }
    	}
    	else{
            if(options.onFail){
            	options.onFail.call(this, blob);
        	}
    	}
    }.bind(this);
    xhr.onerror = function(e) {
        console.log('remote file error: ' + url);
        if(options.onFail){
            options.onFail.call(this, options);
        }
    }.bind(this);
    xhr.send();
}

// Error loading remote file
Loader.prototype.errorRemote = function(e){
    console.log('errorRemote', e, this);
    // log it
}

/******************************** DOM *******************************/
 

// Turn a blob into JS and append it to DOM.
Loader.prototype.appendJS = function(blob){
    console.log('appending js');
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.innerHTML = blob;
    document.head.appendChild(s);
}

// Turn a blob into CSS and append it to DOM.
Loader.prototype.appendCSS = function(blob){
    console.log('appending css');
    var c = document.createElement('style');
    c.type = 'text/css';
    c.innerHTML = blob;
    document.head.appendChild(c);
    this.triggerCSSLoadedEvent();
}

// CSS loaded. Fire 'cssLoaded' event.
Loader.prototype.triggerCSSLoadedEvent = function(){
    this.cssLoaded = true;
    var cssLoaded = document.createEvent('Event');
    cssLoaded.initEvent('cssLoaded', true, true);
    window.dispatchEvent(cssLoaded);
}

// Timeout reached, load from bundle
Loader.prototype.loadTimeout = function(){
    console.log('timeout reached');
    if(this.jsLoaded === false){
        console.log('timeout get bundle css');
        this.getBundleCSS();
    }
}



// Usage:
// require('sterno')(process.env.url, ['/app.js']);
//
// on load / device ready:
//
// # get local file system for reading / writing file caches
// # load bootstrap json from remote
// # insert assets to the dom, and cache locally if need be
module.exports = function(){
    return new Loader().init();
};
