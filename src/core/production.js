/**
 * Production line: assembly -> test -> packaging, one working minute at a time.
 *
 * Trade-offs modelled here:
 *  - faster modes: more output, more wear, defects, energy and fatigue
 *  - low health: more defects and (when enabled) more breakdowns
 *  - product changeover on assembly costs setup time
 *  - stricter QC catches more defects but slows the test machine
 *  - full buffers block upstream machines; empty buffers starve downstream ones
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;
  var W = FM.Workforce;

  function C(state) { return FM.Config.of(state); }

  function speedFactor(state, m) {
    return C(state).machineModes[m.mode].speed * W.crewFactor(state, m.id);
  }

  /** Base minutes for one unit, before speed: depends on product, machine and QC level. */
  function baseTime(state, machineId, product) {
    var cfg = C(state);
    var t = cfg.products[product].times[machineId];
    if (machineId === 'test') t *= cfg.quality.qcModes[state.qcMode].timeMult;
    return t;
  }

  /** Minutes for one unit with the current crew and mode (Infinity with no crew). */
  function unitTime(state, m, product) {
    var f = speedFactor(state, m);
    return f > 0 ? baseTime(state, m.id, product) / f : Infinity;
  }

  function defectChance(state, m) {
    var cfg = C(state);
    var p = cfg.quality.baseDefect + cfg.machineModes[m.mode].defect + (1 - m.health / 100) * cfg.quality.healthDefect;
    if (state.morale < cfg.morale.lowAt) p += cfg.morale.lowDefect;
    return U.clamp(p, 0.005, 0.6);
  }

  function detectionChance(state, m) {
    var cfg = C(state);
    return U.clamp(cfg.quality.qcModes[state.qcMode].detection * cfg.machineModes[m.mode].detect, 0, 0.99);
  }

  // ---------- starting a job ----------

  function hasMaterials(state, product) {
    var bom = C(state).products[product].bom;
    return state.materials.components >= bom.components && state.materials.casing >= bom.casing;
  }

  function takeCarry(m) {
    var c = m.carry || 0;
    m.carry = 0;
    return c;
  }

  function startAssembly(state, m) {
    var cfg = C(state);
    var batch = null;
    for (var i = 0; i < state.queue.length; i++) {
      if (state.queue[i].started < state.queue[i].qty) { batch = state.queue[i]; break; }
    }
    if (!batch) { m.status = 'idle'; return; }
    if (state.buffers.test.length >= cfg.bufferCapacity) { m.status = 'blocked'; return; }

    if (m.currentProduct && m.currentProduct !== batch.product) {
      m.down = { reason: 'setup', left: cfg.setupMinutes, total: cfg.setupMinutes, product: batch.product };
      m.status = 'setup';
      S.log(state, 'info', 'log.setupStart', { machine: m.id, product: batch.product });
      return;
    }
    if (!hasMaterials(state, batch.product)) { m.status = 'starved'; return; }

    var bom = cfg.products[batch.product].bom;
    state.materials.components -= bom.components;
    state.materials.casing -= bom.casing;
    m.currentProduct = batch.product;
    batch.started++;
    if (batch.started >= batch.qty) state.queue.splice(state.queue.indexOf(batch), 1);
    state.rev++;

    var work = baseTime(state, m.id, batch.product);
    m.job = { product: batch.product, left: work - takeCarry(m), total: work, defective: U.rand(state) < defectChance(state, m) };
  }

  function startFromBuffer(state, m, buffer, outputFull) {
    if (!buffer.length) { m.status = 'starved'; return; }
    if (outputFull) { m.status = 'blocked'; return; }
    var unit = buffer.shift();
    var work = baseTime(state, m.id, unit.product);
    m.job = { product: unit.product, left: work - takeCarry(m), total: work, defective: unit.defective };
  }

  function tryStart(state, m) {
    var cfg = C(state);
    if (m.id === 'assembly') startAssembly(state, m);
    else if (m.id === 'test') startFromBuffer(state, m, state.buffers.test, state.buffers.packaging.length >= cfg.bufferCapacity);
    else startFromBuffer(state, m, state.buffers.packaging, S.finishedTotal(state) >= cfg.warehouse.finishedCapacity);
  }

  // ---------- finishing ----------

  function materialValue(state, product) {
    var cfg = C(state);
    var bom = cfg.products[product].bom;
    return bom.components * cfg.materials.components.basePrice + bom.casing * cfg.materials.casing.basePrice;
  }

  /** Tracks the last N units of a machine; warns once when the defect rate climbs past the limit. */
  function noteMade(state, m, defective) {
    var Q = C(state).quality;
    m.stats.made++;
    if (defective) m.stats.defects++;
    m.recent.push(defective ? 1 : 0);
    if (m.recent.length > Q.warnWindow) m.recent.shift();
    var rate = FM.util.sum(m.recent) / m.recent.length;
    if (m.recent.length === Q.warnWindow && rate > Q.warnDefectRate) {
      if (!m.warnedDefects) {
        m.warnedDefects = true;
        S.log(state, 'warn', 'log.defectRate', { machine: m.id, pct: Math.round(rate * 100) }, true);
      }
    } else if (rate <= Q.warnDefectRate / 2) {
      m.warnedDefects = false;
    }
  }

  function completeJob(state, m) {
    var cfg = C(state);
    var job = m.job;
    m.job = null;
    m.stats.completed++;

    if (m.id === 'assembly') {
      state.stats.assembled++;
      noteMade(state, m, job.defective);
      state.buffers.test.push({ product: job.product, defective: job.defective });
    } else if (m.id === 'test') {
      if (job.defective && U.rand(state) < detectionChance(state, m)) {
        state.stats.scrapped++;
        state.stats.scrapValue += materialValue(state, job.product);
      } else {
        state.buffers.packaging.push({ product: job.product, defective: job.defective });
      }
    } else {
      var damage = Math.max(0, cfg.machineModes[m.mode].defect) * cfg.quality.packagingDamage;
      var defective = job.defective || U.rand(state) < damage;
      if (defective && !job.defective) noteMade(state, m, true); else noteMade(state, m, false);
      state.finished[job.product][defective ? 'defective' : 'good']++;
      state.stats.packed++;
      state.rev++;
    }
  }

  function finishDowntime(state, m) {
    var cfg = C(state);
    var d = m.down;
    m.down = null;
    if (d.reason === 'setup') {
      m.currentProduct = d.product;
      S.log(state, 'info', 'log.setupDone', { machine: m.id, product: d.product });
    } else if (d.reason === 'breakdown') {
      m.health = Math.max(m.health, cfg.machine.healthAfterRepair);
      m.warnedHealth = false;
      S.log(state, 'good', 'log.repaired', { machine: m.id });
    } else {
      m.health = 100;
      m.warnedHealth = false;
      S.log(state, 'good', 'log.maintDone', { machine: m.id });
    }
  }

  /** Wear, energy and breakdown risk for one busy minute. Returns true if the machine broke. */
  function wearAndRisk(state, m) {
    var cfg = C(state);
    var mode = cfg.machineModes[m.mode];
    m.health = Math.max(0, m.health - cfg.machine.baseWearPerMinute * mode.wear);
    S.spend(state, cfg.machine.energyCostPerMinute * mode.energy, 'energy');

    if (!m.warnedHealth && m.health < cfg.machine.warnHealth) {
      m.warnedHealth = true;
      S.log(state, 'warn', 'log.lowHealth', { machine: m.id }, true);
    }
    if (!cfg.features.breakdowns) return false;

    var worn = 1 - m.health / 100;
    var hazard = cfg.machine.baseHazard + worn * worn * cfg.machine.wearHazard;
    if (U.rand(state) < hazard) {
      var mins = U.randInt(state, cfg.machine.repairMinutes[0], cfg.machine.repairMinutes[1]);
      var cost = U.randInt(state, cfg.machine.repairCost[0], cfg.machine.repairCost[1]);
      S.spend(state, cost, 'maintenance');
      state.stats.breakdowns++;
      m.down = { reason: 'breakdown', left: mins, total: mins };
      m.status = 'broken';
      S.log(state, 'bad', 'log.breakdown', { machine: m.id, cost: cost, hours: Math.round(mins / 6) / 10 }, true);
      return true;
    }
    return false;
  }

  function stepMachine(state, m) {
    m.stats.elapsed++;

    if (m.down) {
      if (m.down.reason === 'setup') m.stats.setup++; else m.stats.down++;
      m.status = m.down.reason === 'breakdown' ? 'broken' : m.down.reason;
      m.down.left--;
      if (m.down.left <= 0) finishDowntime(state, m);
      return;
    }

    if (W.operatorsAt(state, m.id).length === 0) { m.status = 'noOperator'; return; }

    if (!m.job) {
      tryStart(state, m);
      if (!m.job) { m.carry = 0; return; }
    }

    m.status = 'running';
    m.stats.busy++;
    W.tireCrew(state, m);
    if (wearAndRisk(state, m)) return;   // the job resumes after repair

    // A job is measured in base minutes; each busy minute does `speedFactor` of them,
    // so moving an operator or changing the mode takes effect immediately.
    m.job.left -= speedFactor(state, m);
    if (m.job.left <= 0) {
      // Work done past the end of this unit carries over to the next one,
      // so whole-minute steps do not round every unit up.
      m.carry = Math.min(-m.job.left, 1);
      completeJob(state, m);
    }
  }

  /** Advances the whole line one minute, downstream first so freed space is used at once. */
  function step(state) {
    var line = C(state).line;
    for (var i = line.length - 1; i >= 0; i--) stepMachine(state, state.machines[line[i]]);
  }

  FM.Production = {
    step: step,
    unitTime: unitTime,
    baseTime: baseTime,
    speedFactor: speedFactor,
    defectChance: defectChance,
    detectionChance: detectionChance,
    materialValue: materialValue
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
