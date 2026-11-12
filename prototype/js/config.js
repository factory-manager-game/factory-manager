/**
 * Factory Manager — game configuration.
 * Every balancing number lives here, so the rules can be tuned
 * without touching the engine code.
 * Time unit: one "working minute". A working day is one 8-hour shift (480 min).
 */
(function (FM) {
  'use strict';

  FM.CONFIG = {
    game: {
      days: 30,                 // game length in working days
      shiftStartHour: 8,        // the shift runs 08:00 to 16:00
      minutesPerDay: 480,
      startCash: 15000,
      goalCash: 45000,          // cash needed at the end of the last day to win
      startSatisfaction: 70,
      minSatisfaction: 15,      // at or below this, customers leave and the game is lost
      realSecondsPerDay: 24     // at 1x speed, one working day takes this many real seconds
    },

    speeds: [1, 2, 4],

    materials: {
      components: { basePrice: 10, dailyDrift: 0.08, min: 0.75, max: 1.35, start: 120 },
      casing:     { basePrice: 14, dailyDrift: 0.07, min: 0.75, max: 1.35, start: 60 }
    },

    delivery: {
      standard: { leadMinutes: 240, surcharge: 0 },   // arrives 4 working hours later
      express:  { leadMinutes: 30,  surcharge: 0.4 }  // arrives in 30 minutes, 40% more expensive
    },

    warehouse: {
      rawCapacity: 800,         // total raw units (components + casing), including incoming
      finishedCapacity: 250,    // total finished units
      rawHoldingCost: 0.3,      // per unit per day
      finishedHoldingCost: 1.0  // per unit per day
    },

    products: {
      headphone: {
        bom: { components: 2, casing: 1 },
        basePrice: 105,
        marketPrice: 58,
        times: { assembly: 12, test: 7, packaging: 6 }  // minutes per unit, 1 operator, normal mode
      },
      speaker: {
        bom: { components: 3, casing: 2 },
        basePrice: 185,
        marketPrice: 100,
        times: { assembly: 20, test: 10, packaging: 9 }
      }
    },

    line: ['assembly', 'test', 'packaging'],  // fixed flow order
    bufferCapacity: 20,                       // WIP between two machines
    setupMinutes: 30,                         // product changeover on the assembly machine

    machineModes: {
      //        speed   wear   defect   energy   detection (test machine only)
      slow:   { speed: 0.8, wear: 0.6, defect: -0.015, energy: 0.8, detect: 1.05 },
      normal: { speed: 1.0, wear: 1.0, defect: 0,      energy: 1.0, detect: 1.0 },
      fast:   { speed: 1.3, wear: 2.5, defect: 0.07,   energy: 1.5, detect: 0.88 }
    },

    machine: {
      baseWearPerMinute: 0.02,     // health lost per busy minute in normal mode
      baseHazard: 0.00002,         // breakdown chance per busy minute at full health
      wearHazard: 0.002,           // added chance, scaled by (1 - health)^2
      repairMinutes: [120, 240],
      repairCost: [450, 750],
      healthAfterRepair: 75,
      maintenanceMinutes: 60,
      maintenanceCost: 180,
      lowHealthWarning: 40,
      energyCostPerMinute: 0.25,
      maxOperators: 2,
      operatorFactor: [0, 1, 1.45]  // speed multiplier by number of operators
    },

    quality: {
      baseDefect: 0.03,         // chance a unit is defective at assembly
      healthDefect: 0.10,       // added defect chance, scaled by (1 - health)
      packagingDamage: 0.4,     // share of mode.defect that applies at packaging (fast mode only)
      qcModes: {
        light:    { detection: 0.40, timeMult: 0.6 },
        standard: { detection: 0.75, timeMult: 1.0 },
        strict:   { detection: 0.95, timeMult: 1.5 }
      }
    },

    workforce: {
      startWorkers: 3,
      maxWorkers: 10,
      wagePerDay: 130,
      hireCost: 250,
      severance: 150
    },

    overheadPerDay: 350,        // rent, insurance, admin

    orders: {
      baseOffersPerDay: 1.6,
      offersGrowthPerDay: 0.06,
      maxOpenOffers: 4,
      offerLifetime: 240,       // minutes an offer stays open
      productMix: { headphone: 0.6, speaker: 0.4 },
      qty: { headphone: [10, 35], speaker: [6, 20] },
      dueDays: [2, 5],
      priceSpread: [0.88, 1.15],
      rushBonus: 0.10,          // extra price for orders due within 2 days
      onTimeSatisfaction: 2.5,
      lateSatisfaction: -6,
      latePenaltyPerDay: 0.15,  // price cut per started day late
      minLatePriceFactor: 0.5,
      cancelAfterLateMinutes: 720,  // 1.5 working days past due
      cancelSatisfaction: -15,
      cancelPenalty: 0.10,      // fee as a share of order value
      returnSatisfactionPerUnit: -2,
      returnHandling: 0.5,      // extra cost per returned unit (shipping, warranty), share of price
      maxReturnSatisfaction: -12,
      declineSatisfaction: 0,
      dailyDriftTarget: 60,     // satisfaction slowly fades toward this each day
      dailyDrift: 1.5
    },

    score: {
      weights: { profit: 0.35, productivity: 0.20, quality: 0.15, inventory: 0.10, satisfaction: 0.20 },
      oeeTarget: 0.80,          // bottleneck OEE that earns full productivity points
      qualityFloor: 0.80,       // quality at or below this earns zero points
      inventoryIdealFill: 0.15, // average warehouse fill that still earns full points
      inventoryZeroFill: 0.90,
      grades: [[90, 'S'], [80, 'A'], [65, 'B'], [50, 'C'], [0, 'D']]
    }
  };
})(window.FM = window.FM || {});
