/**
 * Chapter goals, stars and the end of a chapter.
 *
 * Goal types (chapter config `goals`):
 *   deliverScripted            every scripted order delivered (late counts, cancelled does not)
 *   deliverUnits {qty, product?}
 *   deliverTag {tag}           the scripted order with this tag delivered
 *   cashAboveStart             final cash higher than the starting budget
 *   profit {min}               revenue minus total costs
 *   quality {min}              evaluated at the end
 *   oee {min}                  bottleneck OEE, evaluated at the end
 *   noCancelled                no order cancelled
 *   cash {min}                 final cash
 *
 * Stars: 1 = all goals met; 2 = and no order was late or cancelled;
 *        3 = and the chapter's side quest reached its best ending (state.flags.questBest).
 */
(function (FM) {
  'use strict';

  var S = FM.State;

  function C(state) { return FM.Config.of(state); }

  // Goals that can only become true and stay true; a chapter whose goals are all of
  // these kinds may end early.
  var MONOTONIC = { deliverScripted: 1, deliverUnits: 1, deliverTag: 1 };

  function deliveredUnits(state, product) {
    var d = state.stats.delivered;
    return product ? d[product] : d.headphone + d.speaker;
  }

  function scriptedTotal(state) { return (C(state).orders.script || []).length; }

  function evaluateGoal(state, g) {
    var k = FM.Finance.kpis(state);
    var start = C(state).start.cash;
    switch (g.type) {
      case 'deliverScripted':
        return { value: state.flags.scriptedDelivered || 0, target: scriptedTotal(state) };
      case 'deliverUnits':
        return { value: deliveredUnits(state, g.product), target: g.qty };
      case 'deliverTag':
        return { value: (state.flags.tagsDelivered || {})[g.tag] ? 1 : 0, target: 1 };
      case 'cashAboveStart':
        return { value: Math.round(state.cash), target: start + 1 };
      case 'cash':
        return { value: Math.round(state.cash), target: g.min };
      case 'profit':
        return { value: Math.round(k.profit), target: g.min };
      case 'quality':
        return { value: Math.round(k.quality * 1000) / 1000, target: g.min };
      case 'oee':
        return { value: Math.round(k.oee * 1000) / 1000, target: g.min };
      case 'noCancelled':
        return { value: state.stats.ordersCancelled === 0 && state.stats.scriptedMissed === 0 ? 1 : 0, target: 1 };
      default:
        throw new Error('Unknown goal type: ' + g.type);
    }
  }

  function evaluate(state) {
    var goals = C(state).goals.map(function (g) {
      var r = evaluateGoal(state, g);
      return { type: g.type, params: g, value: r.value, target: r.target, done: r.value >= r.target };
    });
    return { goals: goals, allDone: goals.every(function (g) { return g.done; }) };
  }

  function canEndEarly(state) {
    var cfg = C(state);
    return cfg.endEarly && cfg.goals.every(function (g) { return MONOTONIC[g.type]; });
  }

  function stars(state, won) {
    if (!won) return 0;
    var s = 1;
    if (state.stats.ordersLate === 0 && state.stats.ordersCancelled === 0 && state.stats.scriptedMissed === 0) s = 2;
    if (s === 2 && state.flags.questBest) s = 3;
    return s;
  }

  function finish(state, won, reason) {
    if (state.status !== 'running') return;
    var ev = evaluate(state);
    state.status = won ? 'won' : 'lost';
    state.result = { won: won, reason: reason, stars: stars(state, won), goals: ev.goals, t: state.t, day: state.day };
    state.rev++;
    S.log(state, won ? 'good' : 'bad', won ? 'log.chapterWon' : 'log.chapterLost', { reason: reason }, true);
  }

  /** Called every minute after the line and orders have moved. */
  /** A chapter that ends during a shift still pays that day's wages, overhead and holding. */
  function finishMidDay(state, won, reason) {
    FM.Finance.settleDay(state);
    finish(state, won, reason);
  }

  function checkDuring(state) {
    if (state.satisfaction <= C(state).lose.minSatisfaction) return finishMidDay(state, false, 'customers');
    if (canEndEarly(state) && evaluate(state).allDone) finishMidDay(state, true, 'goals');
  }

  /** Called at the end of each day after wages and overhead. Returns true if the chapter ended. */
  function checkEndOfDay(state) {
    if (state.cash < 0) { finish(state, false, 'bankrupt'); return true; }
    if (state.day >= C(state).days) {
      var ok = evaluate(state).allDone;
      finish(state, ok, ok ? 'goals' : 'goalsMissed');
      return true;
    }
    return false;
  }

  FM.Goals = { evaluate: evaluate, finish: finish, checkDuring: checkDuring, checkEndOfDay: checkEndOfDay, stars: stars, canEndEarly: canEndEarly };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
