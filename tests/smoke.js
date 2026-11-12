var FM = require('./load');
['ch1','ch2','ch3','ch4','ch5','free'].forEach(function (id) {
  var t0 = Date.now();
  var s = FM.Engine.newGame(id, 7);
  FM.Bots.playToEnd(s, FM.Bots.smart);
  var k = FM.Finance.kpis(s);
  console.log(id, s.status, s.result.reason, 'stars', s.result.stars, 'day', s.day, 'cash', Math.round(s.cash), 'profit', Math.round(k.profit), 'Q', k.quality.toFixed(3), 'OEE', k.oee.toFixed(2), 'workers', s.workers.length, 'events', JSON.stringify(s.events.history.map(function(e){return e.type+(e.dropped?'(x)':'')})), (Date.now()-t0)+'ms');
  console.log('   goals', JSON.stringify(s.result.goals.map(function(g){return g.type+':'+g.value+'/'+g.target})));
});
