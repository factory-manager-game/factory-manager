'use strict';
var H = require('./helpers');
var FM = H.FM;
var D = FM.Engine.dispatch;

test('actions: locked features are refused in chapter 1', function () {
  var s = H.game('ch1');
  assert.strictEqual(D(s, 'hire').reason, 'err.locked');
  assert.strictEqual(D(s, 'buyMaterial', 'components', 10, true).reason, 'err.locked');
  assert.strictEqual(D(s, 'setMode', 'assembly', 'fast').reason, 'err.invalid');
  assert.strictEqual(D(s, 'addBatch', 'speaker', 5).reason, 'err.invalid');
  assert.strictEqual(s.actionLog.length, 0, 'failed actions are not logged');
});

test('actions: buying respects warehouse space and cash', function () {
  var s = H.game('free');
  assert.strictEqual(D(s, 'buyMaterial', 'components', 700).reason, 'err.rawFull');
  s.cash = 50;
  assert.strictEqual(D(s, 'buyMaterial', 'components', 100).reason, 'err.cash');
  s.cash = 5000;
  assert.ok(D(s, 'buyMaterial', 'components', 100).ok);
  FM.Engine.advance(s, 240);
  assert.strictEqual(s.materials.components, 220);
});

test('actions: at most two operators per machine; hired names are unique', function () {
  var s = H.game('free');
  D(s, 'hire'); D(s, 'hire');
  assert.ok(D(s, 'changeOperators', 'assembly', 1).ok);
  assert.strictEqual(D(s, 'changeOperators', 'assembly', 1).reason, 'err.operatorLimit');
  var names = s.workers.map(function (w) { return w.name; });
  assert.strictEqual(new Set(names).size, names.length);
});

test('orders: late delivery is cut, cancellation charges a fee', function () {
  var s = H.game('free');
  s.offers = [];
  var o = { id: 999, product: 'headphone', qty: 2, unitPrice: 100, createdAt: 0, expiresAt: 999, dueAt: 10, scripted: false, tag: null };
  s.offers.push(o);
  D(s, 'acceptOffer', 999);
  s.finished.headphone.good = 2;
  FM.Engine.advance(s, 20);
  var cash = s.cash;
  D(s, 'deliverOrder', 999);
  assert.strictEqual(Math.round(s.cash - cash), Math.round(2 * 100 * 0.85));
  assert.strictEqual(s.stats.ordersLate, 1);

  var o2 = { id: 1000, product: 'headphone', qty: 5, unitPrice: 100, createdAt: s.t, expiresAt: s.t + 10, dueAt: s.t + 5, scripted: true, tag: null };
  s.offers.push(o2);
  D(s, 'acceptOffer', 1000);
  FM.Engine.advance(s, 5 + FM.Config.of(s).orders.cancelAfterLateMinutes + 1);
  assert.strictEqual(s.stats.ordersCancelled, 1);
  assert.strictEqual(s.stats.scriptedMissed, 1);
});

test('orders: scripted orders appear on time and count as missed if they expire', function () {
  var s = H.game('ch2');
  assert.strictEqual(s.offers.length, 1, 'first order is there at the start');
  FM.Engine.advance(s, 240);
  assert.strictEqual(s.offers.length, 2);
  FM.Engine.advance(s, 2 * 480);
  assert.ok(s.stats.scriptedMissed >= 1);
});

test('workforce: fatigue grows on a busy machine and recovers overnight', function () {
  var s = H.game('free');
  s.offers = [];
  D(s, 'addBatch', 'headphone', 60);
  var w = s.workers.filter(function (x) { return x.station === 'assembly'; })[0];
  var f0 = w.fatigue;
  FM.Engine.advance(s, 479);
  assert.ok(w.fatigue > f0 + 10, 'fatigue ' + w.fatigue);
  var before = w.fatigue;
  FM.Engine.advance(s, 1);
  assert.ok(w.fatigue < before, 'recovered overnight');
});

test('workforce: morale scales speed between 90% and 110%', function () {
  var s = H.game('free');
  s.morale = 0; assert.ok(Math.abs(FM.Workforce.moraleFactor(s) - 0.9) < 1e-9);
  s.morale = 100; assert.ok(Math.abs(FM.Workforce.moraleFactor(s) - 1.1) < 1e-9);
});

test('goals: chapter 2 ends early once every order is delivered', function () {
  var s = H.botGame('ch2', 5);
  assert.strictEqual(s.status, 'won');
  assert.ok(s.t < FM.Config.of('ch2').days * 480, 'ended before the last minute');
});

test('goals: stars need no late orders for two and the quest for three', function () {
  var s = H.game('ch1');
  assert.strictEqual(FM.Goals.stars(s, false), 0);
  assert.strictEqual(FM.Goals.stars(s, true), 2);
  s.flags.questBest = true;
  assert.strictEqual(FM.Goals.stars(s, true), 3);
  s.stats.ordersLate = 1;
  assert.strictEqual(FM.Goals.stars(s, true), 1);
});

test('goals: doing nothing loses every chapter', function () {
  H.CHAPTERS.forEach(function (id) {
    var s = H.game(id, 3);
    FM.Bots.playToEnd(s, FM.Bots.idle);
    assert.strictEqual(s.status, 'lost', id);
  });
});
