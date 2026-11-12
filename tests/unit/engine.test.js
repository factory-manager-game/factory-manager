'use strict';
var H = require('./helpers');
var FM = H.FM;

test('engine: replaying the action log rebuilds exactly the same game', function () {
  H.CHAPTERS.forEach(function (id) {
    var a = H.botGame(id, 777);
    var b = FM.Engine.replay(id, 777, a.actionLog);
    assert.strictEqual(JSON.stringify(b), JSON.stringify(a), id + ' replay differs');
  });
});

test('engine: replay with a changed decision gives a different, valid game', function () {
  var a = H.botGame('ch2', 11);
  var hires = a.actionLog.filter(function (e) { return e.name === 'hire'; }).length;
  assert.ok(hires > 0, 'the bot hired someone');
  var b = FM.Engine.replay('ch2', 11, a.actionLog, { transform: function (e) { return e.name === 'hire' ? null : e; } });
  assert.notStrictEqual(JSON.stringify(b), JSON.stringify(a));
  H.assertFinite(b);
});

test('finance: profit always equals cash change (Profit = Revenue - Total Costs)', function () {
  H.CHAPTERS.forEach(function (id) {
    [1, 2, 3].forEach(function (seed) {
      var s = H.botGame(id, seed);
      var start = FM.Config.of(id).start.cash;
      assert.ok(Math.abs((s.cash - start) - FM.Finance.profit(s)) < 1e-6, id + '/' + seed);
      var daily = s.history.reduce(function (a, d) { return a + d.profit; }, 0);
      assert.ok(Math.abs(daily - FM.Finance.profit(s)) <= s.history.length, id + '/' + seed + ' daily reports add up: ' + daily + ' vs ' + FM.Finance.profit(s));
    });
  });
});

test('events: none in the quiet start, at most one pending, never into an impossible chapter', function () {
  ['ch4', 'ch5', 'free'].forEach(function (id) {
    for (var seed = 1; seed <= 4; seed++) {
      var s = H.game(id, seed);
      while (s.status === 'running') {
        if (s.t % 30 === 0) FM.Bots.smart(s);
        FM.Engine.stepMinute(s);
        if (s.events.pending) assert.ok(s.t >= FM.Config.of(id).events.quietStart);
      }
      s.events.history.forEach(function (e) {
        if (!e.dropped && e.type !== 'materialShortage') assert.ok(e.t >= FM.Config.of(id).events.quietStart);
      });
    }
  });
});

test('events: an absence only hits a tired or demoralised worker', function () {
  var s = H.game('free', 5);
  var w = s.workers[0];
  w.fatigue = 20; s.morale = 70;
  var ev = { type: 'operatorAbsence', target: w.id };
  assert.strictEqual(FM.Events.TYPES.operatorAbsence.apply(s, ev), false);
  w.fatigue = 95;
  assert.notStrictEqual(FM.Events.TYPES.operatorAbsence.apply(s, ev), false);
  assert.ok(w.absentUntil > s.t);
});

test('fuzz: random actions never break the state', function () {
  var names = ['buyMaterial', 'addBatch', 'removeBatch', 'moveBatchUp', 'setMode', 'maintain', 'setQcMode',
    'assignWorker', 'changeOperators', 'hire', 'fire', 'acceptOffer', 'declineOffer', 'deliverOrder', 'sellWholesale'];
  H.CHAPTERS.forEach(function (id) {
    for (var seed = 1; seed <= 3; seed++) {
      var s = H.game(id, seed);
      var r = { rngState: seed * 31 };
      var pick = function (list) { return list.length ? list[Math.floor(FM.util.rand(r) * list.length)] : undefined; };
      while (s.status === 'running') {
        if (s.t % 15 === 0) {
          var name = pick(names);
          var args = {
            buyMaterial: [pick(['components', 'casing']), pick([5, 40, 300]), pick([true, false])],
            addBatch: [pick(['headphone', 'speaker']), pick([1, 10, 50])],
            removeBatch: [(pick(s.queue) || {}).id],
            moveBatchUp: [(pick(s.queue) || {}).id],
            setMode: [pick(['assembly', 'test', 'packaging']), pick(['slow', 'normal', 'fast'])],
            maintain: [pick(['assembly', 'test', 'packaging'])],
            setQcMode: [pick(['light', 'standard', 'strict'])],
            assignWorker: [(pick(s.workers) || {}).id, pick(['assembly', 'test', 'packaging', null])],
            changeOperators: [pick(['assembly', 'test', 'packaging']), pick([1, -1])],
            hire: [], fire: [(pick(s.workers) || {}).id],
            acceptOffer: [(pick(s.offers) || {}).id], declineOffer: [(pick(s.offers) || {}).id],
            deliverOrder: [(pick(s.orders) || {}).id],
            sellWholesale: [pick(['headphone', 'speaker']), pick([1, 5])]
          }[name];
          FM.Engine.dispatch.apply(null, [s, name].concat(args));
        }
        FM.Engine.stepMinute(s);
        assert.ok(s.materials.components >= 0 && s.materials.casing >= 0);
        assert.ok(s.finished.headphone.good >= 0 && s.finished.speaker.good >= 0);
        assert.ok(s.buffers.test.length <= 20 && s.buffers.packaging.length <= 20);
        ['assembly', 'test', 'packaging'].forEach(function (m) {
          assert.ok(FM.Workforce.assignedTo(s, m).length <= 2);
        });
      }
      H.assertFinite(s);
      var start = FM.Config.of(id).start.cash;
      assert.ok(Math.abs((s.cash - start) - FM.Finance.profit(s)) < 1e-6, 'money adds up under random play');
    }
  });
});
