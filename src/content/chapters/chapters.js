/**
 * The five chapters and free play. Numbers follow the game design document
 * (docs/DESIGN.md) and are checked by tests/balance.js.
 * Times are working minutes from the start of the chapter: day N starts at (N-1)*480.
 */
(function (FM) {
  'use strict';

  var DAY = 480;
  function at(day, hour) { return (day - 1) * DAY + Math.round((hour - 8) * 60); }

  var LOCKED = {
    hiring: false, express: false, wholesale: false, maintenance: false,
    breakdowns: false, priceDrift: false, randomOffers: false, events: []
  };

  function features(over) {
    var f = {};
    Object.keys(LOCKED).forEach(function (k) { f[k] = LOCKED[k]; });
    Object.keys(over || {}).forEach(function (k) { f[k] = over[k]; });
    return f;
  }

  // ---------- 1 · راه‌اندازی خط ----------
  FM.Chapters.register({
    id: 'ch1', order: 1, number: 1,
    title: 'راه‌اندازی خط', concept: 'جریان تولید و صف بین دستگاه‌ها', quest: 'q1',
    config: {
      days: 2,
      introKey: 'log.intro.ch1',
      start: { cash: 6000, materials: { components: 80, casing: 40 } },
      features: features({ products: ['headphone'], modes: ['normal'], qcModes: ['standard'] }),
      orders: {
        script: [
          { at: at(1, 8), product: 'headphone', qty: 15, dueDay: 1, unitPrice: 115 },
          { at: at(1, 10), product: 'headphone', qty: 15, dueDay: 2, unitPrice: 120 }
        ]
      },
      goals: [{ type: 'deliverScripted' }, { type: 'cashAboveStart' }]
    }
  });

  // ---------- 2 · گلوگاه ----------
  FM.Chapters.register({
    id: 'ch2', order: 2, number: 2,
    title: 'گلوگاه', concept: 'ظرفیت، گلوگاه و OEE', quest: 'q2',
    config: {
      days: 5,
      endEarly: true,
      introKey: 'log.intro.ch2',
      start: {
        cash: 8000, materials: { components: 80, casing: 40 },
        workers: [
          { name: 'نازنین', station: 'assembly' },
          { name: 'پوریا', station: 'test', fatigue: 55 },
          { name: 'مهراد', station: 'packaging' }
        ]
      },
      features: features({
        products: ['headphone'], modes: ['slow', 'normal', 'fast'], qcModes: ['standard'],
        hiring: true, events: ['operatorAbsence', 'demandSurge']
      }),
      // The test machine in this factory is an older model.
      products: { headphone: { times: { test: 14 } } },
      orders: {
        script: [
          { at: at(1, 8), product: 'headphone', qty: 25, dueDay: 2 },
          { at: at(1, 12), product: 'headphone', qty: 30, dueDay: 3 },
          { at: at(2, 8), product: 'headphone', qty: 35, dueDay: 4 },
          { at: at(3, 8), product: 'headphone', qty: 35, dueDay: 5 },
          { at: at(4, 8), product: 'headphone', qty: 35, dueDay: 5 }
        ]
      },
      goals: [{ type: 'deliverScripted' }]
    }
  });

  // ---------- 3 · کیفیت ----------
  FM.Chapters.register({
    id: 'ch3', order: 3, number: 3,
    title: 'کیفیت', concept: 'کنترل کیفیت، ۵ چرا و Setup', quest: 'q3',
    config: {
      days: 5,
      introKey: 'log.intro.ch3',
      start: {
        cash: 10000, materials: { components: 100, casing: 50 },
        health: { assembly: 65, test: 65, packaging: 65 },
        workers: [
          { name: 'نازنین', station: 'assembly' },
          { name: 'کاوه', station: 'assembly' },
          { name: 'پوریا', station: 'test' },
          { name: 'مهراد', station: 'packaging' }
        ]
      },
      features: features({
        products: ['headphone', 'speaker'], modes: ['slow', 'normal', 'fast'], qcModes: ['light', 'standard', 'strict'],
        hiring: true, maintenance: true, events: ['operatorAbsence']
      }),
      orders: {
        script: [
          { at: at(1, 8), product: 'headphone', qty: 30, dueDay: 2 },
          { at: at(1, 8), product: 'speaker', qty: 10, dueDay: 2 },
          { at: at(2, 8), product: 'headphone', qty: 30, dueDay: 3 },
          { at: at(3, 8), product: 'speaker', qty: 15, dueDay: 4 },
          { at: at(3, 8), product: 'headphone', qty: 30, dueDay: 4 },
          { at: at(4, 8), product: 'headphone', qty: 25, dueDay: 5 },
          { at: at(4, 8), product: 'speaker', qty: 10, dueDay: 5 }
        ]
      },
      scripted: [
        { at: at(2, 8), type: 'message', key: 'log.ev.inspectionNotice', tone: 'warn' },
        { at: at(3, 12), type: 'inspection', minQuality: 0.92, fine: 1000, satisfaction: -10 }
      ],
      goals: [{ type: 'deliverScripted' }, { type: 'quality', min: 0.94 }]
    }
  });

  // ---------- 4 · موجودی ----------
  FM.Chapters.register({
    id: 'ch4', order: 4, number: 4,
    title: 'موجودی', concept: 'نقطه‌ی سفارش، هزینه‌ی نگهداری و زمان تحویل', quest: 'q4',
    config: {
      days: 6,
      introKey: 'log.intro.ch4',
      start: {
        cash: 8000, materials: { components: 40, casing: 20 },
        workers: [
          { name: 'نازنین', station: 'assembly' },
          { name: 'کاوه', station: 'assembly' },
          { name: 'پوریا', station: 'test' },
          { name: 'مهراد', station: 'packaging' }
        ]
      },
      features: features({
        products: ['headphone', 'speaker'], modes: ['slow', 'normal', 'fast'], qcModes: ['light', 'standard', 'strict'],
        hiring: true, express: true, wholesale: true, maintenance: true, priceDrift: true,
        events: ['supplierDelay', 'demandSurge', 'operatorAbsence', 'materialShortage']
      }),
      warehouse: { rawCapacity: 400 },
      // Steady, known demand: the challenge here is buying, not selling.
      orders: {
        script: [
          { at: at(1, 8), product: 'headphone', qty: 25, dueDay: 2 },
          { at: at(1, 8), product: 'speaker', qty: 10, dueDay: 3 },
          { at: at(2, 8), product: 'headphone', qty: 30, dueDay: 3 },
          { at: at(2, 8), product: 'speaker', qty: 10, dueDay: 4 },
          { at: at(3, 8), product: 'headphone', qty: 30, dueDay: 4 },
          { at: at(3, 8), product: 'speaker', qty: 10, dueDay: 5 },
          { at: at(4, 8), product: 'headphone', qty: 30, dueDay: 5 },
          { at: at(4, 8), product: 'speaker', qty: 10, dueDay: 6 },
          { at: at(5, 8), product: 'headphone', qty: 30, dueDay: 6 },
          { at: at(5, 8), product: 'speaker', qty: 10, dueDay: 6 }
        ]
      },
      goals: [{ type: 'profit', min: 5500 }, { type: 'noCancelled' }]
    }
  });

  // ---------- 5 · نگهداری ----------
  FM.Chapters.register({
    id: 'ch5', order: 5, number: 5,
    title: 'نگهداری', concept: 'نگهداری پیشگیرانه و منحنی وان حمام', quest: 'q5',
    config: {
      days: 7,
      introKey: 'log.intro.ch5',
      start: {
        cash: 12000, materials: { components: 120, casing: 60 },
        health: { assembly: 70, test: 70, packaging: 70 },
        workers: [
          { name: 'نازنین', station: 'assembly' },
          { name: 'کاوه', station: 'assembly' },
          { name: 'پوریا', station: 'test' },
          { name: 'مهراد', station: 'packaging' }
        ]
      },
      features: features({
        products: ['headphone', 'speaker'], modes: ['slow', 'normal', 'fast'], qcModes: ['light', 'standard', 'strict'],
        hiring: true, express: true, wholesale: true, maintenance: true, breakdowns: true, priceDrift: true,
        events: ['supplierDelay', 'demandSurge', 'operatorAbsence', 'materialShortage']
      }),
      orders: {
        script: [
          { at: at(1, 8), product: 'headphone', qty: 25, dueDay: 2 },
          { at: at(1, 8), product: 'speaker', qty: 10, dueDay: 3 },
          { at: at(2, 8), product: 'headphone', qty: 25, dueDay: 3 },
          { at: at(2, 8), product: 'speaker', qty: 10, dueDay: 4 },
          { at: at(3, 8), product: 'headphone', qty: 25, dueDay: 4 },
          { at: at(4, 8), product: 'headphone', qty: 60, dueDay: 7, unitPrice: 110, tag: 'bigHeadphones', customer: 'zendegani' },
          { at: at(4, 8), product: 'speaker', qty: 20, dueDay: 7, unitPrice: 195, tag: 'bigSpeakers', customer: 'zendegani' },
          { at: at(4, 8), product: 'headphone', qty: 20, dueDay: 5 },
          { at: at(5, 8), product: 'speaker', qty: 10, dueDay: 6 },
          { at: at(6, 8), product: 'headphone', qty: 20, dueDay: 7 }
        ]
      },
      scripted: [
        { at: at(3, 15), type: 'message', key: 'log.ev.bigOrderNotice', tone: 'info' }
      ],
      goals: [{ type: 'deliverTag', tag: 'bigHeadphones' }, { type: 'deliverTag', tag: 'bigSpeakers' }, { type: 'oee', min: 0.6 }]
    }
  });

  // ---------- حالت آزاد ----------
  FM.Chapters.register({
    id: 'free', order: 99, number: 0,
    title: 'حالت آزاد', concept: 'همه‌ی مفاهیم با هم', quest: null,
    config: {
      days: 30,
      introKey: 'log.intro.free',
      goals: [{ type: 'cash', min: 45000 }]
    }
  });
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
