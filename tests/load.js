/**
 * Loads the game sources into Node in the same order as the browser,
 * using src/manifest.json as the single list of files.
 */
'use strict';
var path = require('path');
var files = require('../src/manifest.json');
files.forEach(function (f) { require(path.join(__dirname, '..', 'src', f)); });
module.exports = global.FM;
