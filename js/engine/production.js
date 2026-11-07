/**
 * Production line: assembly -> test -> packaging.
 * Each machine is advanced one working minute at a time.
 *
 * Core trade-offs modelled here:
 *  - faster modes = more output, but more wear, defects and energy
 *  - low health = more defects and more breakdowns (preventive maintenance helps)
 *  - switching product on assembly costs setup time (batching helps)
 *  - stricter QC catches more defects but slows the test machine
 *  - full buffers block upstream machines; empty buffers starve downstream ones
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function cfg() { return FM.CONFIG; }

  function speedFactor(m) {
    var C = cfg();
    return C.machineModes[m.mode].speed * C.machine.operatorFactor[m.operators];
  }

  /** Minutes one unit takes on this machine with the current settings. */
  function unitTime(state, m, product) {
    var C = cfg();
    var base = C.products[product].times[m.id];
    if (m.id === 'test') base *= C.quality.qcModes[state.qcMode].timeMult;
    return base / speedFactor(m);
  }

  function defectChance(m) {
    var C = cfg();
    var p = C.quality.baseDefect
      + C.machineModes[m.mode].defect
      + (1 - m.health / 100) * C.quality.healthDefect;
    return U.clamp(p, 0.005, 0.6);
  }

  function detectionChance(state, m) {
    var C = cfg();
    var d = C.quality.qcModes[state.qcMode].detection * C.machineModes[m.mode].detect;
    return U.clamp(d, 0, 0.99);
  }

  // ---------- starting a job ----------

  function hasMaterials(state, product) {
    var bom = cfg().products[product].bom;
    return state.materials.components >= bom.components && state.materials.casing >= bom.casing;
  }

  function consumeMaterials(state, product) {
    var bom = cfg().products[product].bom;
    state.materials.components -= bom.components;
    state.materials.casing -= bom.casing;
  }

  function startAssembly(state, m) {
    var C = cfg();
    var batch = null;
    for (var i = 0; i < state.queue.length; i++) {
      if (state.queue[i].started < state.queue[i].qty) { batch = state.queue[i]; break; }
    }
    if (!batch) { m.status = 'idle'; return; }
    if (state.buffers.test.length >= C.bufferCapacity) { m.status = 'blocked'; return; }

    if (m.currentProduct && m.currentProduct !== batch.product) {
      m.down = { reason: 'setup', left: C.setupMinutes, total: C.setupMinutes, product: batch.product };
      m.status = 'setup';
      S.log(state, 'info', 'log.setupStart', { machine: m.id, product: batch.product });
      return;
    }
    if (!hasMaterials(state, batch.product)) { m.status = 'starved'; return; }

    m.currentProduct = batch.product;
    consumeMaterials(state, batch.product);
    batch.started++;
    if (batch.started >= batch.qty) {
      state.queue.splice(state.queue.indexOf(batch), 1);
    }
    state.rev++;

    var time = unitTime(state, m, batch.product);
    m.job = { product: batch.product, left: time, total: time, defective: U.rand(state) < defectChance(m) };
  }

  function startFromBuffer(state, m, buffer, outputFull) {
    if (buffer.length === 0) { m.status = 'starved'; return; }
    if (outputFull) { m.status = 'blocked'; return; }
    var unit = buffer.shift();
    var time = unitTime(state, m, unit.product);
    m.job = { product: unit.product, left: time, total: time, defective: unit.defective };
  }

  function tryStart(state, m) {
    var C = cfg();
    if (m.id === 'assembly') startAssembly(state, m);
    else if (m.id === 'test') startFromBuffer(state, m, state.buffers.test, state.buffers.packaging.length >= C.bufferCapacity);
    else startFromBuffer(state, m, state.buffers.packaging, S.finishedTotal(state) >= C.warehouse.finishedCapacity);
  }

  // ---------- finishing a job ----------

  function completeJob(state, m) {
    var C = cfg();
    var job = m.job;
    m.job = null;
    m.stats.completed++;

    if (m.id === 'assembly') {
      state.stats.assembled++;
      state.buffers.test.push({ product: job.product, defective: job.defective });
    } else if (m.id === 'test') {
      if (job.defective && U.rand(state) < detectionChance(state, m)) {
        state.stats.scrapped++;
      } else {
        state.buffers.packaging.push({ product: job.product, defective: job.defective });
      }
    } else {
      var damage = Math.max(0, C.machineModes[m.mode].defect) * C.quality.packagingDamage;
      var defective = job.defective || U.rand(state) < damage;
      state.finished[job.product][defective ? 'defective' : 'good']++;
      state.stats.packed++;
      state.rev++;
    }
  }

  function finishDowntime(state, m) {
    var C = cfg();
    var d = m.down;
    m.down = null;
    if (d.reason === 'setup') {
      m.currentProduct = d.product;
      S.log(state, 'info', 'log.setupDone', { machine: m.id, product: d.product });
    } else if (d.reason === 'breakdown') {
      m.health = Math.max(m.health, C.machine.healthAfterRepair);
      m.warnedLowHealth = false;
      S.log(state, 'good', 'log.repaired', { machine: m.id });
    } else {
      m.health = 100;
      m.warnedLowHealth = false;
      S.log(state, 'good', 'log.maintDone', { machine: m.id });
    }
  }

  // ---------- running ----------

  function wearAndRisk(state, m) {
    var C = cfg();
    var mode = C.machineModes[m.mode];
    m.health = Math.max(0, m.health - C.machine.baseWearPerMinute * mode.wear);
    S.spend(state, C.machine.energyCostPerMinute * mode.energy, 'energy');

    if (!m.warnedLowHealth && m.health < C.machine.lowHealthWarning) {
      m.warnedLowHealth = true;
      S.log(state, 'warn', 'log.lowHealth', { machine: m.id }, true);
    }

    var worn = 1 - m.health / 100;
    var hazard = C.machine.baseHazard + worn * worn * C.machine.wearHazard;
    if (U.rand(state) < hazard) {
      var mins = U.randInt(state, C.machine.repairMinutes[0], C.machine.repairMinutes[1]);
      var cost = U.randInt(state, C.machine.repairCost[0], C.machine.repairCost[1]);
      S.spend(state, cost, 'maintenance');
      state.stats.breakdowns++;
      m.down = { reason: 'breakdown', left: mins, total: mins };
      m.status = 'broken';
      S.log(state, 'bad', 'log.breakdown', { machine: m.id, cost: cost, hours: Math.round(mins / 60 * 10) / 10 }, true);
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

    if (m.operators < 1) { m.status = 'noOperator'; return; }

    if (!m.job) {
      tryStart(state, m);
      if (!m.job) return;
    }

    m.status = 'running';
    m.stats.busy++;
    if (wearAndRisk(state, m)) return;   // broke down this minute; the job resumes after repair

    m.job.left -= 1;
    if (m.job.left <= 0) completeJob(state, m);
  }

  /** Advances the whole line by one minute, downstream first so freed space is used right away. */
  function step(state) {
    var line = cfg().line;
    for (var i = line.length - 1; i >= 0; i--) stepMachine(state, state.machines[line[i]]);
  }

  FM.Production = {
    step: step,
    unitTime: unitTime,
    defectChance: defectChance,
    detectionChance: detectionChance,
    speedFactor: speedFactor
  };
})(window.FM = window.FM || {});
