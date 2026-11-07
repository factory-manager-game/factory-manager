/**
 * Game state: creation and the event log.
 * The state is a plain, serializable object. Only the engine changes it;
 * the UI reads it.
 */
(function (FM) {
  'use strict';

  function createMachine(id) {
    return {
      id: id,
      mode: 'normal',
      operators: 1,
      health: 100,
      status: 'idle',      // running | idle | starved | blocked | noOperator | broken | maintenance | setup
      job: null,           // { product, left, total, defective }
      down: null,          // { reason: 'breakdown' | 'maintenance' | 'setup', left, total, product? }
      currentProduct: null,
      warnedLowHealth: false,
      stats: { elapsed: 0, busy: 0, down: 0, setup: 0, completed: 0 }
    };
  }

  function emptyDay() {
    return {
      revenue: 0, materials: 0, wages: 0, overhead: 0, energy: 0,
      maintenance: 0, holding: 0, hiring: 0, penalties: 0, refunds: 0
    };
  }

  function createState(seed) {
    var C = FM.CONFIG;
    seed = (seed === undefined ? Math.floor(Math.random() * 1e9) : seed) | 0;

    var machines = {};
    C.line.forEach(function (id) { machines[id] = createMachine(id); });

    var state = {
      version: 1,
      seed: seed,
      rngState: seed,
      t: 0,                         // absolute working minute since the start
      day: 1,
      status: 'running',            // running | won | lost
      endReason: null,              // goal | bankrupt | customers | goalMissed

      cash: C.game.startCash,
      satisfaction: C.game.startSatisfaction,

      materials: { components: C.materials.components.start, casing: C.materials.casing.start },
      prices: { components: C.materials.components.basePrice, casing: C.materials.casing.basePrice },
      incoming: [],                 // { id, material, qty, arriveAt, express }

      queue: [],                    // production batches { id, product, qty, started }
      buffers: { test: [], packaging: [] },   // WIP waiting in front of a machine
      machines: machines,
      qcMode: 'standard',
      workers: C.workforce.startWorkers,

      finished: {
        headphone: { good: 0, defective: 0 },
        speaker: { good: 0, defective: 0 }
      },

      offers: [],                   // { id, product, qty, unitPrice, createdAt, expiresAt, dueAt }
      orders: [],                   // accepted offers + { acceptedAt, late }

      today: emptyDay(),
      history: [],                  // one summary per finished day
      cashSeries: [{ t: 0, cash: C.game.startCash }],

      stats: {
        assembled: 0, scrapped: 0, returned: 0, packed: 0, shipped: 0, soldMarket: 0,
        ordersOnTime: 0, ordersLate: 0, ordersCancelled: 0, offersDeclined: 0,
        breakdowns: 0, maintenances: 0,
        fillSum: 0, fillSamples: 0,
        revenue: 0, costs: 0
      },

      nextId: 1,
      log: [],
      rev: 0                        // bumped when lists change, so the UI knows to redraw
    };

    return state;
  }

  var MAX_LOG = 80;

  /** Adds an event. type: info | good | warn | bad. toast: also show a popup. */
  function log(state, type, key, params, toast) {
    state.log.unshift({ id: state.nextId++, t: state.t, type: type, key: key, params: params || {}, toast: !!toast });
    if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
    state.rev++;
  }

  function nextId(state) {
    return state.nextId++;
  }

  function unassignedWorkers(state) {
    var used = 0;
    for (var id in state.machines) used += state.machines[id].operators;
    return state.workers - used;
  }

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
    state.cash -= amount;
    state.today[category] += amount;
    state.stats.costs += amount;
  }

  function earn(state, amount) {
    state.cash += amount;
    state.today.revenue += amount;
    state.stats.revenue += amount;
  }

  FM.State = {
    create: createState,
    emptyDay: emptyDay,
    log: log,
    nextId: nextId,
    unassignedWorkers: unassignedWorkers,
    finishedTotal: finishedTotal,
    rawTotal: rawTotal,
    spend: spend,
    earn: earn
  };
})(window.FM = window.FM || {});
