/**
 * Event director: unexpected but explainable events.
 *
 * Breakdowns and defect spikes are not rolled here: they come straight from machine
 * health, speed and morale in production.js, with their own warnings.
 * The director handles events that come from outside the line:
 *   supplierDelay     a standard delivery arrives a day late   (more likely when supplier trust is low)
 *   demandSurge       two extra, better-paid offers           (only when satisfaction is high)
 *   operatorAbsence   an exhausted or demoralised worker is away for half a day
 *   materialShortage  after two days of rising prices, standard purchases stop for a day
 *
 * Fairness: one event at a time, a warning before it lands, half a day of calm after it,
 * nothing in the first two hours, and a look-ahead: before committing an event the director
 * plays the rest of the chapter with the reference bot; if the event would make the goals
 * impossible even for the bot, it is dropped.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;
  var W = FM.Workforce;

  function C(state) { return FM.Config.of(state); }

  // ---------- event types ----------

  var TYPES = {
    supplierDelay: {
      chance: function (state, E) {
        var pending = state.incoming.filter(function (d) { return !d.express && !d.delayed && d.arriveAt - state.t > E.warnBefore; });
        if (!pending.length) return 0;
        var trust = state.people.karimi.trust;
        return E.chance * (1.5 - trust / 100);      // trust 50 -> x1, 100 -> x0.5, 0 -> x1.5
      },
      plan: function (state, E) {
        var d = state.incoming.filter(function (x) { return !x.express && !x.delayed && x.arriveAt - state.t > E.warnBefore; })[0];
        return { target: d.id, fireAt: d.arriveAt - E.warnBefore };
      },
      warn: function (state, ev) {
        S.log(state, 'warn', 'log.ev.supplierDelayWarn', {}, true);
      },
      apply: function (state, ev, E) {
        var d = state.incoming.filter(function (x) { return x.id === ev.target; })[0];
        if (!d) return false;
        d.arriveAt += E.delay;
        d.delayed = true;
        S.log(state, 'bad', 'log.ev.supplierDelay', { qty: d.qty, mat: d.material }, true);
        return true;
      },
    },

    demandSurge: {
      chance: function (state, E) {
        return state.satisfaction >= E.minSatisfaction ? E.chance : 0;
      },
      plan: function (state, E) { return { fireAt: state.t + E.warnBefore }; },
      warn: function (state) { S.log(state, 'info', 'log.ev.demandSurgeWarn', {}, true); },
      apply: function (state, ev, E) {
        for (var i = 0; i < E.offers; i++) FM.Market.addOffer(state, FM.Market.randomOffer(state, E.priceBonus));
        return true;
      }
    },

    operatorAbsence: {
      candidate: function (state) {
        var F = C(state).workforce.fatigue;
        var list = state.workers.filter(function (w) {
          return w.station && W.isPresent(state, w) && (w.fatigue >= F.absenceRiskAt || state.morale < C(state).morale.lowAt);
        });
        list.sort(function (a, b) { return b.fatigue - a.fatigue || a.id - b.id; });
        return list[0] || null;
      },
      chance: function (state, E) { return TYPES.operatorAbsence.candidate(state) ? E.chance : 0; },
      plan: function (state, E) { return { target: TYPES.operatorAbsence.candidate(state).id, fireAt: state.t + E.warnBefore }; },
      warn: function (state, ev) {
        var w = state.workers.filter(function (x) { return x.id === ev.target; })[0];
        if (w) S.log(state, 'warn', 'log.ev.absenceWarn', { name: w.name }, true);
      },
      apply: function (state, ev) {
        var w = state.workers.filter(function (x) { return x.id === ev.target; })[0];
        var F = C(state).workforce.fatigue;
        // The player may have let the worker rest in the meantime: then nothing happens.
        if (!w || !w.station || (w.fatigue < F.absenceRiskAt && state.morale >= C(state).morale.lowAt)) return false;
        W.makeAbsent(state, w, C(state).workforce.absenceMinutes);
        w.fatigue = Math.max(0, w.fatigue - 30);
        return true;
      }
    }
  };

  /** Shortage is a day-level event: checked when a new day starts. */
  function checkShortage(state) {
    var cfg = C(state);
    if (cfg.features.events.indexOf('materialShortage') < 0) return;
    var h = state.priceHistory;
    if (h.length < 2) return;
    var p0 = h[h.length - 2].components, p1 = h[h.length - 1].components, p2 = state.prices.components;
    var E = cfg.events.materialShortage;
    var last = state.flags.lastShortageDay || -Infinity;
    if (p2 > p1 && p1 > p0 && p2 >= p0 * (1 + E.minRise) && state.day - last >= E.minGapDays &&
        state.t >= state.shortageUntil && !state.flags.shortageWarned) {
      // Two rises in a row: warn now, the shortage starts tomorrow morning.
      state.flags.shortageWarned = true;
      state.flags.shortageAt = state.t + U.MINUTES_PER_DAY;
      S.log(state, 'warn', 'log.ev.shortageWarn', {}, true);
    }
  }

  function tickShortage(state) {
    if (state.flags.shortageAt !== undefined && state.t >= state.flags.shortageAt) {
      state.shortageUntil = state.t + C(state).events.materialShortage.minutes;
      state.flags.lastShortageDay = state.day;
      delete state.flags.shortageAt;
      state.flags.shortageWarned = false;
      state.events.history.push({ type: 'materialShortage', t: state.t });
      S.log(state, 'bad', 'log.ev.shortage', {}, true);
    }
  }

  // ---------- fairness look-ahead ----------

  /** Plays the rest of the chapter with the reference bot from a copy of the state. */
  function botWins(copy) {
    copy.lookahead = true;          // stops nested look-aheads and keeps copies quiet
    FM.Bots.playToEnd(copy, FM.Bots.smart);
    return copy.status === 'won';
  }

  function fairToFire(state, type, ev) {
    var copy = U.clone(state);
    var E = C(state).events[type];
    if (TYPES[type].apply(copy, ev, E) === false) return true;
    return botWins(copy);
  }

  // ---------- director ----------

  function tick(state) {
    var cfg = C(state);
    var E = cfg.events;
    tickShortage(state);

    var p = state.events.pending;
    if (p && state.t >= p.fireAt) {
      var applied = TYPES[p.type].apply(state, p, E[p.type]);
      state.events.pending = null;
      state.events.cooldownUntil = state.t + E.cooldown;
      if (applied !== false) state.events.history.push({ type: p.type, t: state.t });
      state.rev++;
    }

    if (state.lookahead) return;   // copies used for look-ahead never start new events
    if (state.events.pending || state.t < E.quietStart || state.t < state.events.cooldownUntil) return;
    if (state.t % E.checkEvery !== 0) return;

    var enabled = cfg.features.events.filter(function (k) { return TYPES[k]; });
    for (var i = 0; i < enabled.length; i++) {
      var type = enabled[i];
      var chance = TYPES[type].chance(state, E[type]);
      if (!(chance > 0) || U.rand(state) >= chance) continue;
      var ev = TYPES[type].plan(state, E[type]);
      ev.type = type;
      if (!fairToFire(state, type, ev)) {
        state.events.history.push({ type: type, t: state.t, dropped: true });
        continue;
      }
      state.events.pending = ev;
      TYPES[type].warn(state, ev);
      state.rev++;
      return;
    }
  }

  // ---------- scripted chapter events ----------

  var SCRIPTED = {
    inspection: function (state, e) {
      var q = FM.Finance.quality(state);
      if (q < e.minQuality) {
        S.spend(state, e.fine, 'penalties');
        FM.Market.changeSatisfaction(state, e.satisfaction);
        S.log(state, 'bad', 'log.ev.inspectionFail', { quality: Math.round(q * 100), fine: e.fine }, true);
      } else {
        S.log(state, 'good', 'log.ev.inspectionPass', { quality: Math.round(q * 100) }, true);
      }
    },
    message: function (state, e) {
      S.log(state, e.tone || 'info', e.key, e.params || {}, true);
    }
  };

  function runScripted(state) {
    var list = C(state).scripted || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var key = 's' + i;
      if (!state.scriptedEventsDone[key] && state.t >= e.at) {
        state.scriptedEventsDone[key] = true;
        SCRIPTED[e.type](state, e);
      }
    }
  }

  FM.Events = { tick: tick, runScripted: runScripted, checkShortage: checkShortage, TYPES: TYPES };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
