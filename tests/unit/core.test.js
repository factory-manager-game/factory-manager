'use strict';
var H = require('./helpers');
var FM = H.FM;
var U = FM.util;

test('util: the same seed gives the same random sequence', function () {
  var a = { rngState: 42 }, b = { rngState: 42 };
  for (var i = 0; i < 100; i++) assert.strictEqual(U.rand(a), U.rand(b));
  var r = U.rand(a);
  assert.ok(r >= 0 && r < 1);
});

test('util: deepMerge merges objects and replaces arrays without touching the base', function () {
  var base = { a: { x: 1, y: 2 }, list: [1, 2] };
  var out = U.deepMerge(base, { a: { y: 3 }, list: [9] });
  assert.deepStrictEqual(out, { a: { x: 1, y: 3 }, list: [9] });
  assert.deepStrictEqual(base, { a: { x: 1, y: 2 }, list: [1, 2] });
});

test('config: chapter overrides apply only to that chapter', function () {
  assert.strictEqual(FM.Config.of('ch2').products.headphone.times.test, 14);
  assert.strictEqual(FM.Config.of('ch3').products.headphone.times.test, 7);
  assert.strictEqual(FM.Config.BASE.products.headphone.times.test, 7);
  assert.strictEqual(FM.Config.of('ch2').products.headphone.times.assembly, 12);
});

test('every chapter has valid goals and scripted orders', function () {
  H.CHAPTERS.forEach(function (id) {
    var cfg = FM.Config.of(id);
    assert.ok(cfg.goals.length > 0, id + ' has goals');
    (cfg.orders.script || []).forEach(function (o, i) {
      assert.ok(cfg.features.products.indexOf(o.product) >= 0, id + ' order ' + i + ' uses an allowed product');
      assert.ok(o.dueDay >= 1 && o.dueDay <= cfg.days, id + ' order ' + i + ' is due inside the chapter');
      assert.ok(U.dayEnd(o.dueDay) > o.at, id + ' order ' + i + ' is due after it arrives');
      if (i > 0) assert.ok(o.at >= cfg.orders.script[i - 1].at, id + ' scripted orders are in time order');
    });
    cfg.start.workers.forEach(function (w) { assert.ok(!w.station || cfg.line.indexOf(w.station) >= 0); });
  });
});

test('state: a new game is clean and JSON-serialisable', function () {
  H.CHAPTERS.forEach(function (id) {
    var s = H.game(id);
    assert.strictEqual(s.status, 'running');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s)), s);
    H.assertFinite(s);
  });
});
