/**
 * Shared helpers: seeded randomness, math, time, objects.
 * The random generator keeps its state inside the game state, so a game
 * is fully reproducible from (chapter, seed, list of player actions).
 */
(function (FM) {
  'use strict';

  var MINUTES_PER_DAY = 480;
  var SHIFT_START_HOUR = 8;

  /** Float in [0, 1); advances state.rngState (mulberry32). */
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

  /** Picks a key from { key: weight }. */
  function weightedPick(state, weights) {
    var keys = Object.keys(weights);
    var total = 0;
    keys.forEach(function (k) { total += weights[k]; });
    var r = rand(state) * total;
    for (var i = 0; i < keys.length; i++) {
      r -= weights[keys[i]];
      if (r < 0) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round2(v) { return Math.round(v * 100) / 100; }

  /** Absolute working minute -> { day, hour, minute, inDay }. Day 1 starts at t = 0. */
  function splitTime(t) {
    var day = Math.floor(t / MINUTES_PER_DAY) + 1;
    var inDay = t % MINUTES_PER_DAY;
    return { day: day, inDay: inDay, hour: SHIFT_START_HOUR + Math.floor(inDay / 60), minute: inDay % 60 };
  }

  function dayStart(day) { return (day - 1) * MINUTES_PER_DAY; }
  function dayEnd(day) { return day * MINUTES_PER_DAY; }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /** Deep merge: objects merge key by key, arrays and scalars replace. Returns a new object. */
  function deepMerge(base, over) {
    if (!isPlainObject(base) || !isPlainObject(over)) return clone(over === undefined ? base : over);
    var out = clone(base);
    Object.keys(over).forEach(function (k) {
      out[k] = isPlainObject(out[k]) && isPlainObject(over[k]) ? deepMerge(out[k], over[k]) : clone(over[k]);
    });
    return out;
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function sum(list, fn) {
    var s = 0;
    for (var i = 0; i < list.length; i++) s += fn ? fn(list[i]) : list[i];
    return s;
  }

  FM.util = {
    MINUTES_PER_DAY: MINUTES_PER_DAY,
    SHIFT_START_HOUR: SHIFT_START_HOUR,
    rand: rand,
    randInt: randInt,
    randRange: randRange,
    weightedPick: weightedPick,
    clamp: clamp,
    round2: round2,
    splitTime: splitTime,
    dayStart: dayStart,
    dayEnd: dayEnd,
    deepMerge: deepMerge,
    clone: clone,
    sum: sum
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
