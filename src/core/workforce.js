/**
 * Workforce: who stands at which machine, fatigue, absence and team morale.
 *
 *  - fatigue (0..100) grows while a worker's machine runs, faster in fast mode
 *    and when alone; it recovers overnight. Above 60 the worker slows down.
 *  - morale (0..100) is one team number: it scales every machine's speed
 *    between 90% and 110%, and below 40 it adds defects.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function C(state) { return FM.Config.of(state); }

  function isPresent(state, w) { return w.absentUntil <= state.t; }

  /** Present workers standing at a machine. */
  function operatorsAt(state, machineId) {
    return state.workers.filter(function (w) { return w.station === machineId && isPresent(state, w); });
  }

  /** Everyone assigned to a machine, present or not. */
  function assignedTo(state, machineId) {
    return state.workers.filter(function (w) { return w.station === machineId; });
  }

  function unassigned(state) {
    return state.workers.filter(function (w) { return !w.station; });
  }

  function fatigueFactor(state, w) {
    var F = C(state).workforce.fatigue;
    if (w.fatigue <= F.slowFrom) return 1;
    return 1 - (w.fatigue - F.slowFrom) / (100 - F.slowFrom) * F.maxSlow;
  }

  function moraleFactor(state) {
    var M = C(state).morale;
    return M.speedMin + (M.speedMax - M.speedMin) * state.morale / 100;
  }

  /** Crew speed multiplier for a machine: headcount x average fatigue x morale. */
  function crewFactor(state, machineId) {
    var cfg = C(state);
    var ops = operatorsAt(state, machineId);
    var n = Math.min(ops.length, cfg.machine.maxOperators);
    if (n === 0) return 0;
    var fat = U.sum(ops.slice(0, n), function (w) { return fatigueFactor(state, w); }) / n;
    return cfg.machine.operatorFactor[n] * fat * moraleFactor(state);
  }

  /** Called once per minute for each running machine. */
  function tireCrew(state, m) {
    var cfg = C(state);
    var F = cfg.workforce.fatigue;
    var ops = operatorsAt(state, m.id);
    if (!ops.length) return;
    var mult = cfg.machineModes[m.mode].fatigue * (ops.length === 1 ? F.soloMult : F.pairMult);
    ops.forEach(function (w) {
      w.fatigue = Math.min(100, w.fatigue + F.perBusyMinute * mult);
      if (!w.warned && w.fatigue >= F.warnAt) {
        w.warned = true;
        S.log(state, 'warn', 'log.tired', { name: w.name }, true);
      }
    });
  }

  function changeMorale(state, delta) {
    state.morale = U.clamp(Math.round((state.morale + delta) * 10) / 10, 0, 100);
  }

  /** Overnight: rest, morale drifts back toward its everyday level. */
  function endOfDay(state) {
    var cfg = C(state);
    var F = cfg.workforce.fatigue;
    state.workers.forEach(function (w) {
      w.fatigue = Math.max(0, w.fatigue - F.overnightRecovery);
      if (w.fatigue < F.warnAt - 10) w.warned = false;
    });
    var M = cfg.morale;
    var gap = M.dailyTarget - state.morale;
    changeMorale(state, Math.sign(gap) * Math.min(Math.abs(gap), M.dailyDrift));
  }

  function makeAbsent(state, w, minutes) {
    w.absentUntil = state.t + minutes;
    state.stats.absences++;
    state.rev++;
    S.log(state, 'bad', 'log.absent', { name: w.name, hours: Math.round(minutes / 60) }, true);
  }

  FM.Workforce = {
    operatorsAt: operatorsAt,
    assignedTo: assignedTo,
    unassigned: unassigned,
    isPresent: isPresent,
    crewFactor: crewFactor,
    fatigueFactor: fatigueFactor,
    moraleFactor: moraleFactor,
    tireCrew: tireCrew,
    changeMorale: changeMorale,
    endOfDay: endOfDay,
    makeAbsent: makeAbsent
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
