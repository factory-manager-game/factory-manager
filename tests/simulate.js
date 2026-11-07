/**
 * Headless balance test. Plays many games with simple bot strategies
 * and prints win rate, final cash and score, so the numbers in
 * js/config.js can be tuned with evidence.
 *
 * Run:  node tests/simulate.js [games]
 */
'use strict';

global.window = global;
var path = require('path');
var root = path.join(__dirname, '..', 'js');
['config.js', 'utils.js', 'engine/state.js', 'engine/production.js', 'engine/market.js',
  'engine/finance.js', 'engine/actions.js', 'engine/engine.js'
].forEach(function (f) { require(path.join(root, f)); });

var FM = global.FM;
var A = FM.Actions;
var C = FM.CONFIG;

function inLine(s, product) {
  var n = 0;
  ['test', 'packaging'].forEach(function (b) { s.buffers[b].forEach(function (u) { if (u.product === product) n++; }); });
  C.line.forEach(function (id) { var j = s.machines[id].job; if (j && j.product === product) n++; });
  s.queue.forEach(function (b) { if (b.product === product) n += b.qty - b.started; });
  return n;
}

function backlogMinutes(s) {
  var min = 0;
  s.orders.forEach(function (o) { min += o.qty * C.products[o.product].times.assembly; });
  return min / FM.Production.speedFactor(s.machines.assembly);
}

/** A sensible player: plans by order, buys just in time, maintains, grows staff. */
function smartBot(s, opts) {
  opts = opts || {};
  s.orders.slice().sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (o) {
    if (FM.Market.stockOf(s, o.product) >= o.qty) A.deliverOrder(s, o.id);
  });

  s.offers.slice().forEach(function (o) {
    var cap = C.game.minutesPerDay * 1.3;
    if (backlogMinutes(s) + o.qty * C.products[o.product].times.assembly / FM.Production.speedFactor(s.machines.assembly) < cap) A.acceptOffer(s, o.id);
  });

  ['headphone', 'speaker'].forEach(function (p) {
    var need = 0;
    s.orders.forEach(function (o) { if (o.product === p) need += o.qty; });
    var short = need - FM.Market.stockOf(s, p) - inLine(s, p);
    if (short > 0) A.addBatch(s, p, short);
  });

  var needC = 0, needK = 0;
  s.queue.forEach(function (b) {
    var bom = C.products[b.product].bom;
    needC += (b.qty - b.started) * bom.components;
    needK += (b.qty - b.started) * bom.casing;
  });
  var incoming = { components: 0, casing: 0 };
  s.incoming.forEach(function (d) { incoming[d.material] += d.qty; });
  [['components', needC + 60], ['casing', needK + 30]].forEach(function (pair) {
    var have = s.materials[pair[0]] + incoming[pair[0]];
    if (have < pair[1]) {
      var express = s.materials[pair[0]] < 6;
      A.buyMaterial(s, pair[0], Math.ceil((pair[1] - have) / 10) * 10, express);
    }
  });

  C.line.forEach(function (id) {
    var m = s.machines[id];
    if (!opts.noMaintenance && m.health < 50 && !m.down) A.maintain(s, id);
    if (opts.mode) A.setMode(s, id, opts.mode);
  });

  if (!opts.noHiring) {
    if (s.day >= 3 && s.machines.assembly.operators < 2 && s.cash > 4000) { A.hire(s); A.changeOperators(s, 'assembly', 1); }
    if (s.day >= 10 && s.machines.test.operators < 2 && s.cash > 8000) { A.hire(s); A.changeOperators(s, 'test', 1); }
  }
}

function idleBot() {}

function play(seed, bot, opts) {
  var s = FM.Engine.newGame(seed);
  while (s.status === 'running') {
    bot(s, opts);
    FM.Engine.advance(s, 30);
  }
  return s;
}

function report(name, bot, opts, games) {
  var wins = 0, cash = 0, score = 0, reasons = {}, sat = 0, q = 0, oee = 0, days = 0;
  for (var seed = 1; seed <= games; seed++) {
    var s = play(seed, bot, opts);
    var sc = FM.Finance.score(s);
    if (s.status === 'won') wins++;
    reasons[s.endReason] = (reasons[s.endReason] || 0) + 1;
    cash += s.cash; score += sc.total; sat += s.satisfaction; q += sc.kpis.quality; oee += sc.kpis.oee; days += s.day;
  }
  console.log(name.padEnd(22),
    'win', (wins / games * 100).toFixed(0).padStart(3) + '%',
    '| cash', Math.round(cash / games).toString().padStart(6),
    '| score', (score / games).toFixed(0).padStart(3),
    '| sat', (sat / games).toFixed(0).padStart(3),
    '| Q', (q / games * 100).toFixed(1),
    '| OEE', (oee / games * 100).toFixed(1),
    '| days', (days / games).toFixed(1),
    '|', JSON.stringify(reasons));
}

var games = parseInt(process.argv[2], 10) || 30;
console.log('Games per strategy:', games, '| goal cash:', C.game.goalCash);
report('smart', smartBot, {}, games);
report('smart, strict QC', function (s) { A.setQcMode(s, 'strict'); smartBot(s); }, {}, games);
report('smart, all fast', smartBot, { mode: 'fast' }, games);
report('smart, no maintenance', smartBot, { noMaintenance: true }, games);
report('smart, no hiring', smartBot, { noHiring: true }, games);
report('idle', idleBot, {}, games);
