"use strict";

// Just blow up a version string into a map of major, minor and patch.
//
// @param {String} v any version string, ie 0.1.1
function Version(v){
  var matches = /(\d+)\.(\d+)\.(\d+)/.exec(v);
  if(matches){
    this.major = matches[1];
    this.minor = matches[2];
    this.patch = matches[3];
  }
}

module.exports = Version;
