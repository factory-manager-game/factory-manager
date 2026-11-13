/**
 * Balance test: plays every chapter with several bot strategies over many seeds
 * and checks the acceptance rules from the design document.
 *
 *   node tests/balance.js [seeds]         report + exit code 1 if a rule fails
 */
'use strict';

var FM = require('./load');

var SEEDS = parseInt(process.argv[2], 10) || 60;
var ONLY = process.argv[3] ? process.argv[3].split(',') : null;

var STRATEGIES = {
  smart:        { policy: FM.Bots.smart, opts: {} },
  idle:         { policy: FM.Bots.idle, opts: {} },
  allFast:      { policy: FM.Bots.smart, opts: { mode: 'fast' } },
  alwaysExpress:{ policy: FM.Bots.smart, opts: { alwaysExpress: true } },
  acceptAll:    { policy: FM.Bots.smart, opts: { acceptAll: true } },
  noMaintenance:{ policy: FM.Bots.smart, opts: { noMaintenance: true } },
  noHiring:     { policy: FM.Bots.smart, opts: { noHiring: true } },
  lightQc:      { policy: FM.Bots.smart, opts: { qc: 'light' } }
};

function run(chapterId, name) {
  var st = STRATEGIES[name];
  var r = { win: 0, stars: [0, 0, 0, 0], profit: 0, cash: 0, reasons: {} };
  for (var seed = 1; seed <= SEEDS; seed++) {
    var s = FM.Engine.newGame(chapterId, seed * 7919);
    FM.Bots.playToEnd(s, st.policy, st.opts);
    if (s.status === 'won') r.win++;
    r.stars[s.result.stars]++;
    r.profit += FM.Finance.profit(s);
    r.cash += s.cash;
    r.reasons[s.result.reason] = (r.reasons[s.result.reason] || 0) + 1;
  }
  r.winRate = r.win / SEEDS;
  r.twoStarRate = (r.stars[2] + r.stars[3]) / SEEDS;
  r.profit /= SEEDS;
  r.cash /= SEEDS;
  return r;
}

function pct(x) { return (x * 100).toFixed(0).padStart(3) + '%'; }

var failures = [];
function rule(ok, text) { if (!ok) failures.push(text); }

console.log('Seeds per strategy: ' + SEEDS + '\n');
FM.Chapters.list().filter(function (ch) { return !ONLY || ONLY.indexOf(ch.id) >= 0; }).forEach(function (ch) {
  console.log('== ' + ch.id + ' · ' + ch.title);
  var res = {};
  Object.keys(STRATEGIES).forEach(function (name) {
    var r = res[name] = run(ch.id, name);
    console.log('  ' + name.padEnd(14) + ' win ' + pct(r.winRate) + ' | 2★ ' + pct(r.twoStarRate) +
      ' | profit ' + String(Math.round(r.profit)).padStart(6) + ' | ' + JSON.stringify(r.reasons));
  });
  rule(res.smart.winRate >= 0.95, ch.id + ': smart bot should win at least 95% (got ' + pct(res.smart.winRate) + ')');
  rule(res.idle.winRate === 0, ch.id + ': doing nothing must always lose');
  console.log('');
});

if (failures.length) {
  console.log('FAILED:\n  ' + failures.join('\n  '));
  process.exitCode = 1;
} else {
  console.log('All balance rules passed.');
}
