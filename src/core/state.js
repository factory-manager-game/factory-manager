/**
 * Game state: creation, event log, money helpers.
 * The state is plain JSON. Only engine code changes it; the UI only reads it.
 */
(function (FM) {
  'use strict';

  function createMachine(id, health) {
    return {
      id: id,
      mode: 'normal',
      health: health,
      status: 'idle',      // running | idle | starved | blocked | noOperator | broken | maintenance | setup
      job: null,           // { product, left, total, defective }
      down: null,          // { reason: 'breakdown' | 'maintenance' | 'setup', left, total, product? }
      currentProduct: null,
      carry: 0,
      warnedHealth: false,
      stats: { elapsed: 0, busy: 0, down: 0, setup: 0, completed: 0, defects: 0, made: 0 },
      recent: [],          // 1 = defective, for the last few units this machine made
      warnedDefects: false
    };
  }

  function emptyDay() {
    return {
      revenue: 0, materials: 0, wages: 0, overhead: 0, energy: 0, maintenance: 0,
      holding: 0, hiring: 0, penalties: 0, refunds: 0
    };
  }

  function createState(chapterId, seed) {
    var C = FM.Config.of(chapterId);
    seed = (seed === undefined ? Math.floor(Math.random() * 1e9) : seed) | 0;

    var machines = {};
    C.line.forEach(function (id) { machines[id] = createMachine(id, C.start.health[id] !== undefined ? C.start.health[id] : 100); });

    var state = {
      version: 2,
      chapterId: chapterId,
      seed: seed,
      rngState: seed,
      t: 0,
      day: 1,
      status: 'running',            // running | won | lost
      result: null,                 // { won, reason, stars, goals } when finished

      cash: C.start.cash,
      satisfaction: C.start.satisfaction,
      morale: C.start.morale,

      materials: { components: C.start.materials.components, casing: C.start.materials.casing },
      prices: { components: C.materials.components.basePrice, casing: C.materials.casing.basePrice },
      priceHistory: [],             // one entry per day: { components, casing }
      incoming: [],                 // { id, material, qty, arriveAt, express, delayed }
      shortageUntil: -1,

      queue: [],                    // { id, product, qty, started }
      buffers: { test: [], packaging: [] },
      machines: machines,
      qcMode: C.start.qcMode,

      workers: [],                  // { id, name, station, fatigue, absentUntil, warned }
      hiresUsed: 0,

      finished: { headphone: { good: 0, defective: 0 }, speaker: { good: 0, defective: 0 } },

      scriptIndex: 0,               // next scripted order to release
      scriptedEventsDone: {},
      offers: [],                   // { id, product, qty, unitPrice, createdAt, expiresAt, dueAt, scripted, tag }
      orders: [],                   // accepted offers + { acceptedAt, late }

      events: { pending: null, cooldownUntil: 0, history: [] },
      people: { karimi: { trust: 50 } },
      flags: {},

      today: emptyDay(),
      totals: emptyDay(),
      history: [],
      cashSeries: [{ t: 0, cash: C.start.cash }],

      stats: {
        assembled: 0, scrapped: 0, scrapValue: 0, returned: 0, packed: 0, shipped: 0, soldWholesale: 0,
        delivered: { headphone: 0, speaker: 0 },
        ordersOnTime: 0, ordersLate: 0, ordersCancelled: 0, offersDeclined: 0, offersExpired: 0,
        scriptedMissed: 0, breakdowns: 0, maintenances: 0, absences: 0,
        fillSum: 0, fillSamples: 0
      },

      actionLog: [],                // every successful player action: { t, name, args }
      nextId: 1,
      log: [],
      rev: 0
    };

    C.start.workers.forEach(function (w) {
      state.workers.push({
        id: state.nextId++, name: w.name, station: w.station || null,
        fatigue: w.fatigue || 10, absentUntil: -1, warned: false
      });
    });
    return state;
  }

  var MAX_LOG = 100;

  /** Adds an event to the log. type: info | good | warn | bad. toast: show as a popup too. */
  function log(state, type, key, params, toast) {
    state.log.unshift({ id: state.nextId++, t: state.t, type: type, key: key, params: params || {}, toast: !!toast });
    if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
    state.rev++;
  }

  function nextId(state) { return state.nextId++; }

  function finishedTotal(state) {
    var f = state.finished;
    return f.headphone.good + f.headphone.defective + f.speaker.good + f.speaker.defective;
  }

  function rawTotal(state, includeIncoming) {
    var total = state.materials.components + state.materials.casing;
    if (includeIncoming) state.incoming.forEach(function (d) { total += d.qty; });
    return total;
  }

  function spend(state, amount, category) {
    if (!(amount > 0)) return;
    state.cash -= amount;
    state.today[category] += amount;
    state.totals[category] += amount;
  }

  function earn(state, amount) {
    if (!(amount > 0)) return;
    state.cash += amount;
    state.today.revenue += amount;
    state.totals.revenue += amount;
  }

  function totalCosts(day) {
    var c = 0;
    Object.keys(day).forEach(function (k) { if (k !== 'revenue') c += day[k]; });
    return c;
  }

  FM.State = {
    create: createState,
    emptyDay: emptyDay,
    log: log,
    nextId: nextId,
    finishedTotal: finishedTotal,
    rawTotal: rawTotal,
    spend: spend,
    earn: earn,
    totalCosts: totalCosts
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
