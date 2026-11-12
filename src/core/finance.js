/**
 * Finance and performance: end-of-day settlement, KPIs, score.
 * Profit = Revenue - Total Costs, where Total Costs is the sum of every cost category in state.totals.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function C(state) { return FM.Config.of(state); }

  function warehouseFill(state) {
    var W = C(state).warehouse;
    return (S.rawTotal(state, false) / W.rawCapacity + S.finishedTotal(state) / W.finishedCapacity) / 2;
  }

  function sample(state) {
    if (state.t % 30 === 0) state.cashSeries.push({ t: state.t, cash: Math.round(state.cash) });
    if (state.t % 60 === 0) {
      state.stats.fillSum += warehouseFill(state);
      state.stats.fillSamples++;
    }
  }

  // ---------- KPIs ----------

  /** Share of assembled units that did not end as scrap or customer returns. */
  function quality(state) {
    var made = state.stats.assembled;
    if (made === 0) return 1;
    return U.clamp(1 - (state.stats.scrapped + state.stats.returned) / made, 0, 1);
  }

  /** OEE of one machine = availability x performance x quality. */
  function machineOee(state, m) {
    var st = m.stats;
    if (st.elapsed === 0) return { availability: 1, performance: 0, quality: quality(state), oee: 0, utilization: 0 };
    var uptime = st.elapsed - st.down - st.setup;
    var availability = uptime / st.elapsed;
    var performance = uptime > 0 ? st.busy / uptime : 0;
    var q = quality(state);
    return { availability: availability, performance: performance, quality: q, oee: availability * performance * q, utilization: st.busy / st.elapsed };
  }

  /** The most loaded machine (busy + down + setup share): the line's constraint. */
  function bottleneck(state) {
    var best = null, bestLoad = -1;
    C(state).line.forEach(function (id) {
      var m = state.machines[id];
      var load = m.stats.elapsed ? (m.stats.busy + m.stats.down + m.stats.setup) / m.stats.elapsed : 0;
      if (load > bestLoad) { bestLoad = load; best = m; }
    });
    return best;
  }

  function profit(state) {
    return state.totals.revenue - S.totalCosts(state.totals);
  }

  function kpis(state) {
    var b = bottleneck(state);
    return {
      cash: state.cash,
      profit: profit(state),
      revenue: state.totals.revenue,
      costs: S.totalCosts(state.totals),
      oee: b ? machineOee(state, b).oee : 0,
      bottleneck: b ? b.id : null,
      quality: quality(state),
      fill: warehouseFill(state),
      avgFill: state.stats.fillSamples ? state.stats.fillSum / state.stats.fillSamples : warehouseFill(state),
      satisfaction: state.satisfaction,
      morale: state.morale
    };
  }

  function score(state, profitTarget) {
    var Sc = C(state).score;
    var k = kpis(state);
    var parts = {
      profit: U.clamp(k.profit / Math.max(1, profitTarget || 1), 0, 1) * 100,
      productivity: U.clamp(k.oee / Sc.oeeTarget, 0, 1) * 100,
      quality: U.clamp((k.quality - Sc.qualityFloor) / (1 - Sc.qualityFloor), 0, 1) * 100,
      inventory: U.clamp(1 - (k.avgFill - Sc.inventoryIdealFill) / (Sc.inventoryZeroFill - Sc.inventoryIdealFill), 0, 1) * 100,
      satisfaction: k.satisfaction
    };
    var total = 0;
    Object.keys(Sc.weights).forEach(function (key) { total += parts[key] * Sc.weights[key]; });
    return { total: Math.round(total), parts: parts, kpis: k };
  }

  // ---------- end of day ----------

  /** Wages, overhead and holding costs; returns the day's summary. */
  function settleDay(state) {
    var cfg = C(state);
    var W = cfg.warehouse;
    S.spend(state, state.workers.length * cfg.workforce.wagePerDay, 'wages');
    S.spend(state, cfg.overheadPerDay, 'overhead');
    S.spend(state, Math.round(S.rawTotal(state, false) * W.rawHoldingCost + S.finishedTotal(state) * W.finishedHoldingCost), 'holding');

    var costs = S.totalCosts(state.today);
    var k = kpis(state);
    var summary = {
      day: state.day,
      revenue: Math.round(state.today.revenue),
      costs: Math.round(costs),
      profit: Math.round(state.today.revenue - costs),
      breakdown: U.clone(state.today),
      cash: Math.round(state.cash),
      oee: k.oee, quality: k.quality, satisfaction: state.satisfaction, morale: state.morale
    };
    state.history.push(summary);
    state.cashSeries.push({ t: state.t, cash: Math.round(state.cash) });
    S.log(state, summary.profit >= 0 ? 'good' : 'warn', 'log.dayEnd', { day: state.day, profit: summary.profit }, true);
    state.today = S.emptyDay();
    return summary;
  }

  /** Overnight changes that happen when a new day starts. */
  function startNextDay(state) {
    var cfg = C(state);
    state.day++;
    FM.Market.updatePrices(state);
    FM.Workforce.endOfDay(state);
    var O = cfg.orders;
    var gap = O.dailyDriftTarget - state.satisfaction;
    FM.Market.changeSatisfaction(state, Math.sign(gap) * Math.min(Math.abs(gap), O.dailyDrift));
    S.log(state, 'info', 'log.newDay', { day: state.day });
  }

  FM.Finance = {
    sample: sample,
    settleDay: settleDay,
    startNextDay: startNextDay,
    kpis: kpis,
    score: score,
    profit: profit,
    quality: quality,
    machineOee: machineOee,
    bottleneck: bottleneck,
    warehouseFill: warehouseFill
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
