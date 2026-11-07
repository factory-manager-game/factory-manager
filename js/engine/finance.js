/**
 * Finance and performance: end-of-day settlement, KPIs, final score.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function cfg() { return FM.CONFIG; }

  function warehouseFill(state) {
    var W = cfg().warehouse;
    var raw = S.rawTotal(state, false) / W.rawCapacity;
    var fin = S.finishedTotal(state) / W.finishedCapacity;
    return (raw + fin) / 2;
  }

  /** Called every working minute for averages and the cash chart. */
  function sample(state) {
    if (state.t % 30 === 0) state.cashSeries.push({ t: state.t, cash: Math.round(state.cash) });
    if (state.t % 60 === 0) {
      state.stats.fillSum += warehouseFill(state);
      state.stats.fillSamples++;
    }
  }

  // ---------- KPIs ----------

  /** OEE of one machine = availability x performance x quality. */
  function machineOee(state, m) {
    var st = m.stats;
    if (st.elapsed === 0) return { availability: 1, performance: 0, oee: 0, utilization: 0 };
    var planned = st.elapsed;
    var uptime = planned - st.down - st.setup;
    var availability = uptime / planned;
    var performance = uptime > 0 ? st.busy / uptime : 0;
    var q = quality(state);
    return {
      availability: availability,
      performance: performance,
      quality: q,
      oee: availability * performance * q,
      utilization: st.busy / planned
    };
  }

  /** Share of produced units that did not end as scrap or customer returns. */
  function quality(state) {
    var made = state.stats.assembled;
    if (made === 0) return 1;
    return U.clamp(1 - (state.stats.scrapped + state.stats.returned) / made, 0, 1);
  }

  /**
   * The line is as productive as its bottleneck, so the productivity KPI is
   * the OEE of the most loaded machine (theory of constraints).
   */
  function bottleneck(state) {
    var best = null;
    var bestLoad = -1;
    cfg().line.forEach(function (id) {
      var m = state.machines[id];
      var load = m.stats.elapsed ? (m.stats.busy + m.stats.down + m.stats.setup) / m.stats.elapsed : 0;
      if (load > bestLoad) { bestLoad = load; best = m; }
    });
    return best;
  }

  function kpis(state) {
    var C = cfg();
    var b = bottleneck(state);
    var avgFill = state.stats.fillSamples ? state.stats.fillSum / state.stats.fillSamples : warehouseFill(state);
    return {
      cash: state.cash,
      profit: state.cash - C.game.startCash,
      oee: b ? machineOee(state, b).oee : 0,
      bottleneck: b ? b.id : null,
      quality: quality(state),
      fill: warehouseFill(state),
      avgFill: avgFill,
      satisfaction: state.satisfaction
    };
  }

  function score(state) {
    var C = cfg();
    var Sc = C.score;
    var k = kpis(state);
    var goalProfit = C.game.goalCash - C.game.startCash;

    var parts = {
      profit: U.clamp(k.profit / goalProfit, 0, 1) * 100,
      productivity: U.clamp(k.oee / Sc.oeeTarget, 0, 1) * 100,
      quality: U.clamp((k.quality - Sc.qualityFloor) / (1 - Sc.qualityFloor), 0, 1) * 100,
      inventory: U.clamp(1 - (k.avgFill - Sc.inventoryIdealFill) / (Sc.inventoryZeroFill - Sc.inventoryIdealFill), 0, 1) * 100,
      satisfaction: k.satisfaction
    };

    var total = 0;
    Object.keys(Sc.weights).forEach(function (key) { total += parts[key] * Sc.weights[key]; });
    total = Math.round(total);

    var grade = 'D';
    for (var i = 0; i < Sc.grades.length; i++) {
      if (total >= Sc.grades[i][0]) { grade = Sc.grades[i][1]; break; }
    }
    return { total: total, grade: grade, parts: parts, kpis: k };
  }

  // ---------- end of day ----------

  function endOfDay(state) {
    var C = cfg();
    var W = C.warehouse;

    S.spend(state, state.workers * C.workforce.wagePerDay, 'wages');
    S.spend(state, C.overheadPerDay, 'overhead');
    var holding = S.rawTotal(state, false) * W.rawHoldingCost + S.finishedTotal(state) * W.finishedHoldingCost;
    S.spend(state, Math.round(holding), 'holding');

    var today = state.today;
    var costs = 0;
    Object.keys(today).forEach(function (k) { if (k !== 'revenue') costs += today[k]; });

    var k = kpis(state);
    state.history.push({
      day: state.day,
      revenue: Math.round(today.revenue),
      costs: Math.round(costs),
      profit: Math.round(today.revenue - costs),
      breakdown: Object.assign({}, today),
      cash: Math.round(state.cash),
      oee: k.oee,
      quality: k.quality,
      satisfaction: state.satisfaction
    });
    state.cashSeries.push({ t: state.t, cash: Math.round(state.cash) });
    S.log(state, today.revenue - costs >= 0 ? 'good' : 'warn', 'log.dayEnd',
      { day: state.day, profit: Math.round(today.revenue - costs) }, true);

    state.today = S.emptyDay();

    if (state.cash < 0) return end(state, 'lost', 'bankrupt');
    if (state.day >= C.game.days) {
      return state.cash >= C.game.goalCash ? end(state, 'won', 'goal') : end(state, 'lost', 'goalMissed');
    }

    state.day++;
    FM.Market.updatePrices(state);
    var O = C.orders;
    var gap = O.dailyDriftTarget - state.satisfaction;
    FM.Market.changeSatisfaction(state, Math.sign(gap) * Math.min(Math.abs(gap), O.dailyDrift));
    S.log(state, 'info', 'log.newDay', { day: state.day });
  }

  function end(state, status, reason) {
    state.status = status;
    state.endReason = reason;
    state.rev++;
  }

  FM.Finance = {
    sample: sample,
    endOfDay: endOfDay,
    end: end,
    kpis: kpis,
    score: score,
    machineOee: machineOee,
    quality: quality,
    bottleneck: bottleneck,
    warehouseFill: warehouseFill
  };
})(window.FM = window.FM || {});
