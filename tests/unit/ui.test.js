'use strict';
/**
 * Interface checks that run in Node: every text key exists, the page loads the
 * engine in manifest order, and every panel renders cleanly through whole chapters.
 */
var fs = require('fs');
var path = require('path');
var h = require('./helpers');
var FM = h.FM;

var ROOT = path.join(__dirname, '..', '..');
var UI_FILES = ['strings.js', 'icons.js', 'dom.js', 'scene.js', 'panels.js'];
UI_FILES.forEach(function (f) { require(path.join(ROOT, 'src', 'ui', f)); });
var T = FM.Text;

function walk(dir) {
  var out = [];
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p)); else if (/\.js$/.test(f)) out.push(p);
  });
  return out;
}

function missing(keys) { return keys.filter(function (k) { return !T.has(k); }); }

test('ui: every log and error key used by the engine has Persian text', function () {
  var keys = {};
  walk(path.join(ROOT, 'src')).forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    (src.match(/'(log|err)\.[A-Za-z0-9.]*[A-Za-z0-9]'/g) || []).forEach(function (m) { keys[m.slice(1, -1)] = 1; });
  });
  FM.Chapters.list().forEach(function (ch) {
    var c = FM.Config.of(ch.id);
    if (c.introKey) keys[c.introKey] = 1;
    (c.scripted || []).forEach(function (e) { if (e.key) keys[e.key] = 1; });
  });
  assert.ok(Object.keys(keys).length > 50, 'scan found too few keys');
  assert.deepStrictEqual(missing(Object.keys(keys)), []);
});

test('ui: every t() key in the interface exists', function () {
  var keys = {};
  walk(path.join(ROOT, 'src', 'ui')).forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    (src.match(/\bt\('[A-Za-z0-9]+\.[A-Za-z0-9.]*[A-Za-z0-9]'/g) || []).forEach(function (m) { keys[m.slice(3, -1)] = 1; });
  });
  assert.ok(Object.keys(keys).length > 60, 'scan found too few keys');
  assert.deepStrictEqual(missing(Object.keys(keys)), []);
});

test('ui: keys built at run time exist for every value the engine can produce', function () {
  var B = FM.Config.BASE;
  var keys = [];
  B.line.forEach(function (m) { keys.push('machine.' + m); });
  Object.keys(B.products).forEach(function (p) { keys.push('product.' + p); });
  Object.keys(B.materials).forEach(function (m) { keys.push('mat.' + m); });
  Object.keys(B.machineModes).forEach(function (m) { keys.push('mode.' + m); });
  Object.keys(B.quality.qcModes).forEach(function (q) { keys.push('qc.' + q); });
  ['running', 'idle', 'starved', 'starvedMat', 'blocked', 'noOperator', 'broken', 'maintenance', 'setup'].forEach(function (s) { keys.push('status.' + s); });
  ['goals', 'goalsMissed', 'bankrupt', 'customers'].forEach(function (r) { keys.push('end.reason.' + r); });
  Object.keys(FM.State.emptyDay()).forEach(function (c) { if (c !== 'revenue') keys.push('report.cost.' + c); });
  ['orders', 'plan', 'buy', 'workers', 'report'].forEach(function (d) { keys.push('dock.' + d); });
  FM.Chapters.list().forEach(function (ch) {
    var c = FM.Config.of(ch.id);
    c.goals.forEach(function (g) { keys.push('goal.' + g.type); if (g.tag) keys.push('tag.' + g.tag); });
    (c.orders.script || []).forEach(function (o) { if (o.tag) keys.push('tag.' + o.tag); if (o.customer) keys.push('customer.' + o.customer); });
  });
  assert.deepStrictEqual(missing(keys), []);
});

test('ui: the page loads the engine in manifest order, then the interface', function () {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var scripts = (html.match(/<script src="([^"]+)"/g) || []).map(function (m) { return m.slice(13, -1); });
  var expected = require('../../src/manifest.json').map(function (f) { return 'src/' + f; })
    .concat(UI_FILES.map(function (f) { return 'src/ui/' + f; }), ['src/ui/app.js']);
  assert.deepStrictEqual(scripts, expected);
});

test('ui: money, time and durations read naturally in Persian', function () {
  assert.strictEqual(T.money(15000), '⁦۱۵٬۰۰۰$⁩');
  assert.strictEqual(T.money(-250), '⁦−۲۵۰$⁩');
  assert.strictEqual(T.clock(0), '۰۸:۰۰');
  assert.strictEqual(T.clock(479), '۱۵:۵۹');
  assert.strictEqual(T.clock(485), '۰۸:۰۵');
  assert.strictEqual(T.duration(30), '۳۰ دقیقه');
  assert.strictEqual(T.duration(240), '۴ ساعت');
  assert.strictEqual(T.duration(480 + 120), '۱ روز و ۲ ساعت');
  assert.strictEqual(T.t('goal.of', { v: '۱', n: '۲' }), '۱ از ۲');
  assert.strictEqual(T.t('no.such.key'), 'no.such.key');
});

/** Rendered text must never show a raw key, a placeholder or a broken number. */
function assertClean(html, where) {
  var text = html.replace(/<[^>]*>/g, ' ');
  ['undefined', 'NaN', 'Infinity', 'null', '[object'].forEach(function (bad) {
    assert.ok(text.indexOf(bad) < 0, where + ' shows "' + bad + '": ' + text.slice(Math.max(0, text.indexOf(bad) - 80), text.indexOf(bad) + 40));
  });
  var raw = text.match(/\{[a-z]+\}|\b(log|err|goal|orders|plan|buy|workers|report|machine|status|time|tag)\.[a-zA-Z.]+/);
  assert.ok(!raw, where + ' shows a raw key or placeholder: ' + (raw && raw[0]));
}

test('ui: every panel and log line renders cleanly through whole chapters', function () {
  var ui = { planProduct: 'headphone', planQty: 10, buyQty: { components: 60, casing: 30 } };
  h.CHAPTERS.forEach(function (id) {
    var s = h.game(id, 7);
    var checks = 0;
    function check() {
      ['orders', 'plan', 'buy', 'workers', 'report'].forEach(function (p) { assertClean(FM.Panels[p](s, ui), id + ' ' + p); });
      FM.Config.of(s).line.forEach(function (m) { assertClean(FM.Panels.machine(s, m), id + ' machine ' + m); });
      checks++;
    }
    check();
    while (s.status === 'running') {
      FM.Bots.smart(s);
      FM.Engine.advance(s, 120);
      check();
    }
    s.log.forEach(function (e) { assertClean(T.logText(e), id + ' log ' + e.key); });
    assert.ok(checks > 3);
  });
});
