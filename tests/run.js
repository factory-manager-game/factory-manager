/**
 * Minimal test runner (no dependencies): node tests/run.js
 * Every file in tests/unit registers tests with test(name, fn).
 */
'use strict';
var fs = require('fs');
var path = require('path');

var tests = [];
global.test = function (name, fn) { tests.push({ name: name, fn: fn }); };
global.assert = require('assert');

var dir = path.join(__dirname, 'unit');
fs.readdirSync(dir).filter(function (f) { return /\.test\.js$/.test(f); }).sort().forEach(function (f) {
  global.currentFile = f;
  require(path.join(dir, f));
});

var failed = 0;
var t0 = Date.now();
tests.forEach(function (t) {
  try {
    t.fn();
    console.log('  ✓ ' + t.name);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + t.name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e));
  }
});
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed in ' + (Date.now() - t0) + ' ms');
if (failed) process.exitCode = 1;
