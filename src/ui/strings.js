/**
 * Every text the player sees, in Persian, plus number and time formatting.
 * t('key', { name: value }) fills {name} placeholders.
 * tests/unit/strings.test.js checks that every key used in src/ exists here.
 */
(function (FM) {
  'use strict';

  var S = {
    // ---------- names ----------
    'machine.assembly': 'مونتاژ',
    'machine.test': 'تست',
    'machine.packaging': 'بسته‌بندی',
    'product.headphone': 'هدفون',
    'product.speaker': 'اسپیکر',
    'mat.components': 'قطعه‌ی الکترونیکی',
    'mat.casing': 'بدنه',
    'mode.slow': 'آرام',
    'mode.normal': 'عادی',
    'mode.fast': 'سریع',
    'qc.light': 'سبک',
    'qc.standard': 'استاندارد',
    'qc.strict': 'سخت‌گیرانه',

    // ---------- machine status ----------
    'status.running': 'در حال کار',
    'status.idle': 'بیکار',
    'status.starved': 'منتظر ورودی',
    'status.starvedMat': 'کمبود مواد',
    'status.blocked': 'خروجی پر است',
    'status.noOperator': 'بدون اپراتور',
    'status.broken': 'خراب',
    'status.maintenance': 'در حال نگهداری',
    'status.setup': 'تعویض محصول',

    // ---------- floor ----------
    'scene.queue': '{n} در صف',
    'scene.queueEmpty': 'صف خالی',
    'scene.components': 'قطعه: {n}',
    'scene.casing': 'بدنه: {n}',
    'scene.incoming': 'در راه: {n}',
    'scene.stock': 'انبار کالا: {n}',
    'scene.rest': 'استراحت، {n} نفر',
    'tag.bigHeadphones': 'سفارش بزرگ هدفون',
    'tag.bigSpeakers': 'سفارش بزرگ اسپیکر',
    'customer.zendegani': 'خانم زندگانی',

    // ---------- HUD ----------
    'hud.back': 'بازگشت',
    'hud.day': 'روز {day} از {days}',
    'hud.cash': 'نقدینگی',
    'hud.satisfaction': 'رضایت مشتری',
    'hud.morale': 'روحیه‌ی تیم',
    'hud.pause': 'توقف',
    'hud.play': 'ادامه',
    'hud.speed': 'سرعت {x}',
    'hud.goals': 'هدف مرحله',

    // ---------- goals ----------
    'goal.deliverScripted': 'تحویل همه‌ی سفارش‌ها',
    'goal.deliverUnits': 'تحویل {target} واحد',
    'goal.deliverTag': 'تحویل {tag}',
    'goal.cashAboveStart': 'نقدینگی بیشتر از {target}',
    'goal.cash': 'نقدینگی {target}',
    'goal.profit': 'سود دست‌کم {target}',
    'goal.quality': 'کیفیت دست‌کم {target}',
    'goal.oee': 'OEE گلوگاه دست‌کم {target}',
    'goal.noCancelled': 'هیچ سفارشی از دست نرود',
    'goal.of': '{v} از {n}',

    // ---------- dock & panels ----------
    'dock.orders': 'سفارش‌ها',
    'dock.buy': 'خرید',
    'dock.plan': 'تولید',
    'dock.workers': 'کارگرها',
    'dock.report': 'گزارش',
    'panel.close': 'بستن',

    'orders.offers': 'پیشنهادها',
    'orders.active': 'در جریان',
    'orders.noOffers': 'فعلاً پیشنهاد تازه‌ای نیست.',
    'orders.noActive': 'سفارش فعالی نداری.',
    'orders.units': '{n} {product}',
    'orders.each': '{p} هر عدد',
    'orders.total': 'مبلغ',
    'orders.due': 'مهلت',
    'orders.left': '{v} مانده',
    'orders.overdue': '{v} دیرکرد',
    'orders.expires': 'اعتبار پیشنهاد: {v}',
    'orders.accept': 'قبول',
    'orders.decline': 'رد',
    'orders.deliver': 'تحویل',
    'orders.stock': 'موجودی {have} از {need}',
    'orders.plan': 'به صف تولید',
    'orders.planned': '{n} {product} به صف تولید اضافه شد.',
    'orders.covered': 'برای این سفارش چیزی کم نیست.',
    'orders.late': 'دیر شده',
    'orders.big': 'سفارش بزرگ',

    'plan.title': 'صف تولید',
    'plan.add': 'افزودن به صف',
    'plan.qty': 'تعداد',
    'plan.empty': 'صف خالی است؛ دسته‌ای اضافه کن یا از سفارش‌ها «به صف تولید» بزن.',
    'plan.progress': '{done} از {qty} شروع شده',
    'plan.up': 'جلوتر',
    'plan.remove': 'حذف',
    'plan.bom': 'هر {product}: {c} قطعه و {k} بدنه',
    'plan.setupHint': 'عوض کردن محصول روی مونتاژ {m} دقیقه وقت می‌گیرد؛ دسته‌های هم‌نوع را پشت هم بگذار.',

    'buy.title': 'خرید مواد اولیه',
    'buy.stock': 'موجودی',
    'buy.price': 'قیمت امروز',
    'buy.standard': 'عادی، ۴ ساعت',
    'buy.express': 'فوری، ۳۰ دقیقه',
    'buy.space': 'جای خالی انبار: {n}',
    'buy.incoming': 'در راه',
    'buy.arrives': '{v} دیگر',
    'buy.nothingIncoming': 'محموله‌ای در راه نیست.',
    'buy.shortage': 'کمبود در بازار: فقط خرید فوری ممکن است.',
    'buy.wholesale': 'فروش عمده‌ی مازاد',
    'buy.sell': 'فروش {n} عدد',

    'workers.title': 'کارگرها',
    'workers.rest': 'استراحت',
    'workers.fatigue': 'خستگی {v}',
    'workers.absent': 'غایب تا {v}',
    'workers.hire': 'استخدام ({cost})',
    'workers.fire': 'تعدیل',
    'workers.wages': 'دستمزد روزانه‌ی کل: {v}',
    'workers.moveHint': 'روی اسم هر نفر بزن و دستگاهش را انتخاب کن.',
    'workers.station': 'محل کار',

    'machine.health': 'سلامت',
    'machine.operators': 'اپراتور',
    'machine.speed': 'سرعت',
    'machine.qc': 'سطح کنترل کیفیت',
    'machine.maintain': 'نگهداری ({cost})',
    'machine.addOperator': 'اپراتور دیگر',
    'machine.removeOperator': 'یک نفر کمتر',
    'machine.perUnit': 'هر {product}: {v} دقیقه',
    'machine.defect': 'احتمال عیب: {v}',
    'machine.detect': 'تشخیص عیب: {v}',
    'machine.utilization': 'بهره‌برداری: {v}',
    'machine.queue': 'در صف: {n}',

    'report.title': 'گزارش تا این لحظه',
    'report.revenue': 'درآمد',
    'report.costs': 'هزینه‌ها',
    'report.profit': 'سود',
    'report.quality': 'کیفیت',
    'report.oee': 'OEE گلوگاه ({m})',
    'report.fill': 'پرشدگی انبار',
    'report.cost.materials': 'مواد اولیه',
    'report.cost.wages': 'دستمزد',
    'report.cost.overhead': 'سربار ثابت',
    'report.cost.energy': 'انرژی',
    'report.cost.maintenance': 'نگهداری و تعمیر',
    'report.cost.holding': 'نگهداری انبار',
    'report.cost.hiring': 'استخدام و تعدیل',
    'report.cost.penalties': 'جریمه',
    'report.cost.refunds': 'مرجوعی',

    'time.endOfDay': 'پایان روز {d}',
    'time.at': 'روز {d}، ساعت {clock}',
    'orders.scripted': 'سفارش مرحله',
    'orders.spare': 'اضافه: {n}',
    'orders.inFlow': '{n} در خط',
    'orders.wholesaleHint': 'محصول اضافه را می‌شود ارزان‌تر به عمده‌فروش داد تا انبار خالی شود.',
    'plan.canMake': 'با موجودی فعلی: {n} عدد',
    'buy.expressTag': 'فوری',
    'buy.delayed': 'تأخیر',
    'workers.count': 'تعداد',
    'workers.wagesShort': 'دستمزد روزانه',
    'workers.hireHint': 'دستمزد هر نفر {wage} در روز',
    'workers.absentShort': 'غایب',
    'report.costsTitle': 'هزینه‌ها به تفکیک',
    'report.days': 'روزها',
    'report.day': 'روز',
    'report.log': 'رویدادها',

    // ---------- menus ----------
    'menu.title': 'مدیر کارخانه',
    'menu.subtitle': 'بازی مدیریت کارخانه برای آموزش مهندسی صنایع',
    'menu.chapter': 'مرحله‌ی {n}',
    'menu.free': 'حالت آزاد',
    'menu.play': 'شروع',
    'menu.days': '{n} روز',
    'menu.leaveTitle': 'از مرحله بیرون می‌روی؟',
    'menu.leaveText': 'پیشرفت این مرحله ذخیره نمی‌شود.',
    'menu.leave': 'بیرون رفتن',
    'modal.cancel': 'نه، می‌مانم',
    'mentor.name': 'اوستا امید',
    'workers.fireTitle': '{name} تعدیل شود؟',
    'workers.fireText': 'تعدیل {cost} هزینه دارد و روحیه‌ی بقیه‌ی تیم را پایین می‌آورد.',
    'end.onTime': 'سفارش به‌موقع',
    'menu.devNote': 'نقشه‌ی مرحله‌ها و داستان در نسخه‌ی بعدی می‌آید.',
    'end.won': 'مرحله تمام شد!',
    'end.lost': 'این بار نشد',
    'end.reason.goals': 'همه‌ی هدف‌ها انجام شد.',
    'end.reason.goalsMissed': 'روزها تمام شد و همه‌ی هدف‌ها انجام نشد.',
    'end.reason.bankrupt': 'نقدینگی آخر روز منفی شد.',
    'end.reason.customers': 'رضایت مشتری‌ها خیلی پایین آمد.',
    'end.again': 'دوباره',
    'end.menu': 'فهرست مرحله‌ها',

    // ---------- errors ----------
    'err.gameOver': 'مرحله تمام شده است.',
    'err.invalid': 'این کار ممکن نیست.',
    'err.qty': 'تعداد را درست وارد کن.',
    'err.locked': 'این امکان در این مرحله باز نیست.',
    'err.shortage': 'کمبود در بازار: فقط خرید فوری ممکن است.',
    'err.rawFull': 'انبار مواد اولیه جا ندارد.',
    'err.cash': 'نقدینگی کافی نیست.',
    'err.queueFull': 'صف تولید پر است (حداکثر ۸ دسته).',
    'err.batchStarted': 'دسته‌ی جلویی شروع شده است.',
    'err.noChange': 'همین الان همین است.',
    'err.machineBusy': 'دستگاه الان متوقف است.',
    'err.operatorLimit': 'هر دستگاه حداکثر ۲ اپراتور دارد.',
    'err.noFreeWorker': 'کارگر آزادی نیست؛ اول استخدام کن یا کسی را جابه‌جا کن.',
    'err.maxWorkers': 'به سقف کارکنان رسیده‌ای.',
    'err.lastWorker': 'آخرین کارگر را نمی‌شود تعدیل کرد.',
    'err.stock': 'موجودی کافی نیست.',

    // ---------- log ----------
    'log.intro.ch1': 'به کارخانه خوش آمدی! دو سفارش هدفون داریم. سفارش‌ها را قبول کن، صف تولید را پر کن و به‌موقع تحویل بده.',
    'log.intro.ch2': 'این هفته ۱۶۰ هدفون باید تحویل بدهیم. ببین کجای خط گیر می‌کند.',
    'log.intro.ch3': 'مرجوعی‌ها زیاد شده و این هفته بازرس کیفیت سر می‌زند. هم سفارش‌ها را برسان، هم کیفیت را بالا نگه دار.',
    'log.intro.ch4': 'سفارش‌ها معلوم‌اند؛ این بار کار اصلی خرید درست مواد است.',
    'log.intro.ch5': 'دستگاه‌ها فرسوده‌اند و یک سفارش بزرگ در راه است.',
    'log.intro.free': 'حالت آزاد: ۳۰ روز وقت داری نقدینگی را به ۴۵٬۰۰۰ دلار برسانی.',
    'log.newDay': 'روز {day} شروع شد.',
    'log.dayEnd': 'پایان روز {day}. سود خالص: {profit}',
    'log.buy': 'خرید {qty} {mat}: {cost}',
    'log.arrived': '{qty} {mat} به انبار رسید.',
    'log.newOffer': 'پیشنهاد تازه: {qty} {product} به قیمت {price}',
    'log.offerExpired': 'پیشنهاد {qty} {product} از دست رفت.',
    'log.accepted': 'سفارش {qty} {product} قبول شد.',
    'log.declined': 'سفارش {qty} {product} رد شد.',
    'log.orderLate': 'سفارش {qty} {product} دیر شد!',
    'log.cancelled': 'مشتری سفارش {qty} {product} را لغو کرد. جریمه: {fee}',
    'log.delivered': '{qty} {product} به‌موقع تحویل شد: {revenue}',
    'log.deliveredLate': '{qty} {product} با تأخیر تحویل شد: {revenue} ({cut}٪ کمتر)',
    'log.returns': '{n} محصول معیوب مرجوع شد: {refund}',
    'log.sold': '{qty} {product} عمده فروخته شد: {revenue}',
    'log.setupStart': '{machine} برای {product} آماده می‌شود.',
    'log.setupDone': '{machine} آماده‌ی ساخت {product} است.',
    'log.lowHealth': 'سلامت دستگاه {machine} پایین است؛ خطر خرابی و عیب بالاست.',
    'log.defectRate': 'نرخ عیب {machine} به {pct}٪ رسیده است.',
    'log.breakdown': 'دستگاه {machine} خراب شد! تعمیر {hours} ساعت و {cost}.',
    'log.repaired': 'دستگاه {machine} تعمیر شد.',
    'log.maintStart': 'نگهداری {machine} شروع شد ({cost}).',
    'log.maintDone': 'نگهداری {machine} تمام شد؛ سلامت ۱۰۰٪.',
    'log.tired': '{name} خیلی خسته است.',
    'log.absent': '{name} تا {hours} ساعت دیگر سر کار نمی‌آید.',
    'log.hired': '{name} استخدام شد.',
    'log.fired': '{name} تعدیل شد.',
    'log.chapterWon': 'مرحله با موفقیت تمام شد.',
    'log.chapterLost': 'مرحله تمام شد.',
    'log.ev.supplierDelayWarn': 'آقای کریمی خبر داد محموله‌ی بعدی یک روز دیرتر می‌رسد.',
    'log.ev.supplierDelay': 'محموله‌ی {qty} {mat} یک روز عقب افتاد.',
    'log.ev.demandSurgeWarn': 'خبر بازار: به‌زودی سفارش‌های بیشتری می‌رسد.',
    'log.ev.absenceWarn': '{name} حالش خوب نیست؛ اگر استراحت نکند ممکن است غیبت کند.',
    'log.ev.shortageWarn': 'قیمت قطعه دو روز پشت سر هم بالا رفته؛ فردا کمبود در بازار است.',
    'log.ev.shortage': 'کمبود در بازار: امروز فقط خرید فوری ممکن است.',
    'log.ev.inspectionNotice': 'فردا ظهر مهندس نیک‌نام برای بازرسی کیفیت می‌آید.',
    'log.ev.inspectionPass': 'بازرسی با کیفیت {quality}٪ قبول شد.',
    'log.ev.inspectionFail': 'بازرسی رد شد (کیفیت {quality}٪). جریمه: {fine}',
    'log.ev.bigOrderNotice': 'خانم زندگانی خبر داد فردا یک سفارش بزرگ می‌فرستد.'
  };

  var faDigits = '۰۱۲۳۴۵۶۷۸۹';
  var nf0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

  function t(key, params) {
    var s = S[key];
    if (s === undefined) return key;
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return params[k] !== undefined ? params[k] : '{' + k + '}'; });
  }

  function num(n, digits) { return (digits ? nf1 : nf0).format(n); }
  function digits(str) { return String(str).replace(/\d/g, function (d) { return faDigits[+d]; }); }

  /** Money, isolated left-to-right so the sign and $ sit correctly inside Persian text. */
  function money(n) {
    var sign = n < 0 ? '−' : '';
    return '⁦' + sign + num(Math.abs(Math.round(n))) + '$⁩';
  }

  /** Money with an explicit + or − sign, kept inside the same left-to-right run. */
  function signed(n) {
    return '\u2066' + (n < 0 ? '−' : '+') + num(Math.abs(Math.round(n))) + '$\u2069';
  }

  function pct(v, d) { return num(v * 100, d) + '٪'; }

  function clock(t) {
    var p = FM.util.splitTime(t);
    return digits(String(p.hour).padStart(2, '0') + ':' + String(p.minute).padStart(2, '0'));
  }

  /** Working minutes as "۳ ساعت" or "۴۵ دقیقه" or "۱ روز و ۲ ساعت". */
  function duration(min) {
    min = Math.max(0, Math.ceil(min));
    var day = FM.util.MINUTES_PER_DAY;
    if (min >= day) {
      var d = Math.floor(min / day), h = Math.round((min % day) / 60);
      return num(d) + ' روز' + (h ? ' و ' + num(h) + ' ساعت' : '');
    }
    if (min >= 60) return num(Math.round(min / 60)) + ' ساعت';
    return num(min) + ' دقیقه';
  }

  /** Fills a log entry's parameters with names, money and Persian digits. */
  function logText(entry) {
    var p = {};
    Object.keys(entry.params).forEach(function (k) { p[k] = entry.params[k]; });
    if (p.machine) p.machine = t('machine.' + p.machine);
    if (p.product) p.product = t('product.' + p.product);
    if (p.mat) p.mat = t('mat.' + p.mat);
    if (typeof p.revenue === 'number') p.revenue = signed(p.revenue);
    if (typeof p.refund === 'number') p.refund = signed(-p.refund);
    ['cost', 'fee', 'fine', 'price', 'profit'].forEach(function (k) { if (typeof p[k] === 'number') p[k] = money(p[k]); });
    ['qty', 'n', 'day', 'cut', 'pct', 'quality'].forEach(function (k) { if (typeof p[k] === 'number') p[k] = num(p[k]); });
    if (typeof p.hours === 'number') p.hours = num(p.hours, 1);
    return t(entry.key, p);
  }

  FM.Text = { t: t, has: function (k) { return S[k] !== undefined; }, num: num, digits: digits, money: money, signed: signed, pct: pct, clock: clock, duration: duration, logText: logText };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
