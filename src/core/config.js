/**
 * Central configuration: every economic and balancing number in the game.
 * A chapter overrides only what it needs (see src/content/chapters) and
 * FM.Config.of(chapterId) returns the merged result.
 *
 * Units: money in dollars, time in working minutes (a day = one 480-minute shift).
 */
(function (FM) {
  'use strict';

  var BASE = {
    days: 30,
    endEarly: false,              // chapter may end as soon as all its goals are met

    start: {
      cash: 15000,
      satisfaction: 70,
      morale: 70,
      qcMode: 'standard',
      materials: { components: 120, casing: 60 },
      health: { assembly: 100, test: 100, packaging: 100 },
      workers: [
        { name: 'نازنین', station: 'assembly' },
        { name: 'پوریا', station: 'test' },
        { name: 'مهراد', station: 'packaging' }
      ]
    },

    // What the player may use in this chapter.
    features: {
      products: ['headphone', 'speaker'],
      modes: ['slow', 'normal', 'fast'],
      qcModes: ['light', 'standard', 'strict'],
      hiring: true,
      express: true,
      wholesale: true,
      maintenance: true,
      breakdowns: true,
      priceDrift: true,
      randomOffers: true,
      events: ['supplierDelay', 'demandSurge', 'operatorAbsence', 'materialShortage']
    },

    lose: {
      minSatisfaction: 15         // at or below: customers leave
    },

    materials: {
      components: { basePrice: 10, dailyDrift: 0.08, min: 0.75, max: 1.35 },
      casing:     { basePrice: 14, dailyDrift: 0.07, min: 0.75, max: 1.35 }
    },

    delivery: {
      standard: { leadMinutes: 240, surcharge: 0 },
      express:  { leadMinutes: 30,  surcharge: 0.4 }
    },

    warehouse: {
      rawCapacity: 800,           // raw units including incoming deliveries
      finishedCapacity: 250,
      rawHoldingCost: 0.3,        // per unit per day
      finishedHoldingCost: 1.0
    },

    products: {
      headphone: {
        bom: { components: 2, casing: 1 },
        basePrice: 105,
        wholesalePrice: 58,
        times: { assembly: 12, test: 7, packaging: 6 }   // minutes per unit: 1 operator, normal mode, rested, morale 50
      },
      speaker: {
        bom: { components: 3, casing: 2 },
        basePrice: 185,
        wholesalePrice: 100,
        times: { assembly: 20, test: 10, packaging: 9 }
      }
    },

    line: ['assembly', 'test', 'packaging'],
    bufferCapacity: 20,
    setupMinutes: 30,

    machineModes: {
      slow:   { speed: 0.8, wear: 0.6, defect: -0.015, energy: 0.8, detect: 1.05, fatigue: 0.7 },
      normal: { speed: 1.0, wear: 1.0, defect: 0,      energy: 1.0, detect: 1.0,  fatigue: 1.0 },
      fast:   { speed: 1.3, wear: 2.5, defect: 0.07,   energy: 1.5, detect: 0.88, fatigue: 1.6 }
    },

    machine: {
      baseWearPerMinute: 0.02,
      baseHazard: 0.00002,
      wearHazard: 0.002,
      repairMinutes: [120, 240],
      repairCost: [450, 750],
      healthAfterRepair: 75,
      maintenanceMinutes: 60,
      maintenanceCost: 180,
      warnHealth: 40,
      energyCostPerMinute: 0.25,
      maxOperators: 2,
      operatorFactor: [0, 1, 1.45]
    },

    quality: {
      baseDefect: 0.03,
      healthDefect: 0.10,
      packagingDamage: 0.4,
      warnDefectRate: 0.08,       // defect rate over the last 20 units that turns the machine panel red
      warnWindow: 20,
      qcModes: {
        light:    { detection: 0.40, timeMult: 0.6 },
        standard: { detection: 0.75, timeMult: 1.0 },
        strict:   { detection: 0.95, timeMult: 1.5 }
      }
    },

    workforce: {
      maxWorkers: 10,
      wagePerDay: 130,
      hireCost: 250,
      severance: 150,
      fatigue: {
        perBusyMinute: 0.03,
        soloMult: 1.2,            // alone on a machine
        pairMult: 0.8,            // sharing a machine
        overnightRecovery: 15,
        slowFrom: 60,             // above this, the worker slows down
        maxSlow: 0.2,             // at 100 fatigue: 20% slower
        warnAt: 70,
        absenceRiskAt: 85
      },
      absenceMinutes: 240,
      hiresPool: ['سارا', 'کاوه', 'مریم', 'بهزاد', 'الهام', 'آرش', 'نگار', 'فرهاد', 'شیرین', 'کامران']
    },

    morale: {
      speedMin: 0.9,              // speed multiplier at morale 0
      speedMax: 1.1,              // at morale 100
      lowAt: 40,
      lowDefect: 0.02,
      dailyTarget: 60,
      dailyDrift: 3,
      onHire: 3,
      onFire: -10
    },

    overheadPerDay: 350,

    orders: {
      baseOffersPerDay: 1.6,
      offersGrowthPerDay: 0.06,
      maxOpenOffers: 4,
      offerLifetime: 240,
      productMix: { headphone: 0.6, speaker: 0.4 },
      qty: { headphone: [10, 35], speaker: [6, 20] },
      dueDays: [2, 5],
      priceSpread: [0.88, 1.15],
      rushBonus: 0.10,
      onTimeSatisfaction: 2.5,
      lateSatisfaction: -6,
      latePenaltyPerDay: 0.15,
      minLatePriceFactor: 0.5,
      cancelAfterLateMinutes: 720,
      cancelSatisfaction: -15,
      cancelPenalty: 0.10,
      returnSatisfactionPerUnit: -2,
      maxReturnSatisfaction: -12,
      returnHandling: 0.5,
      dailyDriftTarget: 60,
      dailyDrift: 1.5
    },

    events: {
      checkEvery: 30,             // minutes between director checks
      quietStart: 120,            // no events in the first two hours of a chapter
      cooldown: 240,              // half a day of calm after an event
      supplierDelay:   { chance: 0.03, warnBefore: 120, delay: 480 },
      demandSurge:     { chance: 0.02, minSatisfaction: 75, warnBefore: 240, offers: 2, priceBonus: 0.10 },
      operatorAbsence: { chance: 0.10, warnBefore: 60 },
      materialShortage:{ surcharge: 0.8, minutes: 480, minRise: 0.08, minGapDays: 4 }
    },

    score: {
      weights: { profit: 0.35, productivity: 0.20, quality: 0.15, inventory: 0.10, satisfaction: 0.20 },
      oeeTarget: 0.80,
      qualityFloor: 0.80,
      inventoryIdealFill: 0.15,
      inventoryZeroFill: 0.90
    }
  };

  var cache = {};

  /** Merged config for a chapter. */
  function of(chapterOrState) {
    var id = typeof chapterOrState === 'string' ? chapterOrState : chapterOrState.chapterId;
    if (!cache[id]) {
      var chapter = FM.Chapters.get(id);
      cache[id] = FM.util.deepMerge(BASE, chapter.config || {});
    }
    return cache[id];
  }

  FM.Config = { BASE: BASE, of: of, clearCache: function () { cache = {}; } };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
