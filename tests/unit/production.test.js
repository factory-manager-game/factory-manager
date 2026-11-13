'use strict';
var H = require('./helpers');
var FM = H.FM;
var D = FM.Engine.dispatch;

function setupLine(id) {
  var s = H.game(id || 'free');
  s.offers = []; s.orders = [];
  return s;
}

test('production: a batch flows through all three machines into stock', function () {
  var s = setupLine();
  D(s, 'addBatch', 'headphone', 5);
  FM.Engine.advance(s, 200);
  assert.strictEqual(FM.Market.stockOf(s, 'headphone') + s.stats.scrapped, 5);
  assert.strictEqual(s.stats.assembled, 5);
  assert.strictEqual(s.materials.components, 120 - 10);
  assert.strictEqual(s.materials.casing, 60 - 5);
});

test('production: a second operator makes a machine 45% faster', function () {
  var one = setupLine(), two = setupLine();
  D(two, 'hire');
  D(two, 'assignWorker', two.workers[3].id, 'assembly');
  two.morale = one.morale;   // hiring lifts morale; compare crews only
  var f1 = FM.Production.speedFactor(one, one.machines.assembly);
  var f2 = FM.Production.speedFactor(two, two.machines.assembly);
  assert.ok(Math.abs(f2 / f1 - 1.45) < 1e-9, 'ratio ' + f2 / f1);
});

test('production: units take their base time on average (no rounding loss)', function () {
  var s = setupLine();
  D(s, 'addBatch', 'headphone', 30);
  var start = s.t;
  while (s.stats.assembled < 30) FM.Engine.stepMinute(s);
  var perUnit = (s.t - start) / 30;
  var expected = FM.Production.unitTime(s, s.machines.assembly, 'headphone');
  assert.ok(Math.abs(perUnit - expected) < 0.6, 'per unit ' + perUnit + ' expected ' + expected);
});

test('production: switching product costs a setup on assembly', function () {
  var s = setupLine();
  D(s, 'addBatch', 'headphone', 1);
  D(s, 'addBatch', 'speaker', 1);
  FM.Engine.advance(s, 120);
  assert.strictEqual(s.machines.assembly.stats.setup, FM.Config.of(s).setupMinutes);
});

test('production: a machine without operators stops', function () {
  var s = setupLine();
  var w = s.workers.filter(function (x) { return x.station === 'assembly'; })[0];
  D(s, 'assignWorker', w.id, null);
  D(s, 'addBatch', 'headphone', 5);
  FM.Engine.advance(s, 60);
  assert.strictEqual(s.machines.assembly.status, 'noOperator');
  assert.strictEqual(s.stats.assembled, 0);
});

test('production: a full buffer blocks the machine before it', function () {
  var s = setupLine();
  ['test', 'packaging'].forEach(function (id) {
    var w = s.workers.filter(function (x) { return x.station === id; })[0];
    D(s, 'assignWorker', w.id, null);
  });
  D(s, 'addBatch', 'headphone', 40);
  FM.Engine.advance(s, 400);
  assert.strictEqual(s.buffers.test.length, FM.Config.of(s).bufferCapacity);
  assert.strictEqual(s.machines.assembly.status, 'blocked');
});

test('production: no breakdowns when the chapter disables them, even at low health', function () {
  var s = H.botGame('ch3', 99);
  assert.strictEqual(s.stats.breakdowns, 0);
});

test('production: low health raises the defect chance', function () {
  var s = setupLine();
  var m = s.machines.assembly;
  var healthy = FM.Production.defectChance(s, m);
  m.health = 30;
  assert.ok(FM.Production.defectChance(s, m) > healthy + 0.05);
});
