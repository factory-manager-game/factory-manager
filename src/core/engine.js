/**
 * Engine entry point: new game, time, actions, replay.
 * No DOM access: the same code runs in the browser and in Node tests.
 *
 * Determinism: a game is fully defined by (chapterId, seed, actionLog). Actions are
 * applied between minutes and recorded with the minute they happened at, so
 * replay(chapterId, seed, actionLog) rebuilds the exact same state. Decision analysis
 * uses this to replay a chapter with one decision changed.
 */
(function (FM) {
  'use strict';

  var U = FM.util;

  function newGame(chapterId, seed) {
    var state = FM.State.create(chapterId, seed);
    FM.Market.releaseScripted(state);
    var intro = FM.Config.of(chapterId).introKey;
    if (intro) FM.State.log(state, 'info', intro, {});
    return state;
  }

  function stepMinute(state) {
    if (state.status !== 'running') return;
    state.t++;
    FM.Market.processIncoming(state);
    FM.Production.step(state);
    FM.Market.stepOrders(state);
    FM.Events.runScripted(state);
    FM.Events.tick(state);
    FM.Finance.sample(state);
    FM.Goals.checkDuring(state);
    if (state.status !== 'running') return;

    if (state.t >= U.dayEnd(state.day)) {
      FM.Finance.settleDay(state);
      if (!FM.Goals.checkEndOfDay(state)) {
        FM.Finance.startNextDay(state);
        FM.Events.checkShortage(state);
      }
    }
  }

  function advance(state, minutes) {
    for (var i = 0; i < minutes && state.status === 'running'; i++) stepMinute(state);
  }

  /** Runs a player action and records it if it succeeded. */
  function dispatch(state, name) {
    var fn = FM.Actions[name];
    if (!fn) throw new Error('Unknown action: ' + name);
    var args = Array.prototype.slice.call(arguments, 2);
    var res = fn.apply(null, [state].concat(args));
    if (res.ok) state.actionLog.push({ t: state.t, name: name, args: U.clone(args) });
    return res;
  }

  /**
   * Rebuilds a game from its seed and action log. `until` (optional) stops at that minute.
   * `transform(entry)` may return a changed entry, null to drop it, or an array to insert several.
   */
  function replay(chapterId, seed, actionLog, options) {
    options = options || {};
    var state = newGame(chapterId, seed);
    var i = 0;
    var log = [];
    actionLog.forEach(function (e) {
      var out = options.transform ? options.transform(e) : e;
      if (out === null || out === undefined) return;
      (Array.isArray(out) ? out : [out]).forEach(function (x) { log.push(x); });
    });
    var until = options.until === undefined ? Infinity : options.until;
    while (state.status === 'running' && state.t <= until) {
      while (i < log.length && log[i].t === state.t) {
        dispatch.apply(null, [state, log[i].name].concat(log[i].args));
        i++;
      }
      if (i < log.length && log[i].t < state.t) { i++; continue; }   // an entry that could not be placed
      if (state.t === until) break;
      if (options.policy && state.t % 30 === 0) options.policy(state);
      stepMinute(state);
    }
    return state;
  }

  FM.Engine = { newGame: newGame, stepMinute: stepMinute, advance: advance, dispatch: dispatch, replay: replay };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
