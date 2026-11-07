/**
 * Small shared helpers: seeded random numbers, math, time.
 * The random generator keeps its state inside the game state,
 * so a game is fully reproducible from its seed.
 */
(function (FM) {
  'use strict';

  /** Returns a float in [0, 1) and advances state.rngState (mulberry32). */
  function rand(state) {
    var a = (state.rngState = (state.rngState + 0x6D2B79F5) | 0);
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function randInt(state, lo, hi) {
    return lo + Math.floor(rand(state) * (hi - lo + 1));
  }

  function randRange(state, lo, hi) {
    return lo + rand(state) * (hi - lo);
  }

  /** Picks a key from an object of weights, e.g. { a: 0.6, b: 0.4 }. */
  function weightedPick(state, weights) {
    var keys = Object.keys(weights);
    var total = keys.reduce(function (s, k) { return s + weights[k]; }, 0);
    var r = rand(state) * total;
    for (var i = 0; i < keys.length; i++) {
      r -= weights[keys[i]];
      if (r < 0) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function round2(v) {
    return Math.round(v * 100) / 100;
  }

  /** Absolute working minute -> { day, hour, minute } */
  function splitTime(t) {
    var C = FM.CONFIG.game;
    var day = Math.floor(t / C.minutesPerDay) + 1;
    var inDay = t % C.minutesPerDay;
    var hour = C.shiftStartHour + Math.floor(inDay / 60);
    return { day: day, hour: hour, minute: inDay % 60 };
  }

  FM.util = {
    rand: rand,
    randInt: randInt,
    randRange: randRange,
    weightedPick: weightedPick,
    clamp: clamp,
    round2: round2,
    splitTime: splitTime
  };
})(window.FM = window.FM || {});
