/**
 * Translations (fa / en) and number formatting.
 * t('key', { name: value }) replaces {name} placeholders.
 */
(function (FM) {
  'use strict';

  var dict = {
    fa: {
      'app.title': 'مدیر کارخانه',
      'app.subtitle': 'شبیه‌ساز کارخانه‌ی لوازم صوتی',
      'lang.switch': 'English',

      'time.day': 'روز {day} از {total}',
      'time.dayShort': 'روز {day}',
      'time.at': 'روز {day} · {clock}',
      'time.hoursLeft': '{h} ساعت مانده',
      'time.minutesLeft': '{m} دقیقه مانده',
      'time.overdue': '{h} ساعت دیرکرد',
      'speed.pause': 'توقف',
      'speed.play': 'ادامه',

      'kpi.cash': 'نقدینگی',
      'kpi.cashSub': 'هدف: {goal}',
      'kpi.profit': 'سود و زیان',
      'kpi.profitSub': 'دیروز: {v}',
      'kpi.oee': 'بهره‌وری (OEE)',
      'kpi.oeeSub': 'گلوگاه: {m}',
      'kpi.quality': 'کیفیت',
      'kpi.qualitySub': '{s} ضایعات · {r} مرجوعی',
      'kpi.inventory': 'پرشدگی انبار',
      'kpi.inventorySub': 'میانگین: {v}',
      'kpi.satisfaction': 'رضایت مشتری',
      'kpi.satisfactionSub': 'حداقل مجاز: {v}',

      'panel.line': 'خط تولید',
      'panel.orders': 'سفارش‌ها',
      'panel.plan': 'برنامه‌ی تولید',
      'panel.warehouse': 'انبار و خرید',
      'panel.workforce': 'نیروی انسانی',
      'panel.finance': 'مالی',
      'panel.log': 'رویدادها',

      'machine.assembly': 'مونتاژ',
      'machine.test': 'تست و کنترل کیفیت',
      'machine.packaging': 'بسته‌بندی',
      'status.running': 'در حال کار',
      'status.idle': 'بیکار — برنامه‌ی تولید خالی',
      'status.starved': 'منتظر ورودی',
      'status.starvedMat': 'کمبود مواد اولیه',
      'status.blocked': 'مسدود — خروجی پر است',
      'status.noOperator': 'بدون اپراتور',
      'status.broken': 'خراب — در حال تعمیر',
      'status.maintenance': 'در حال نگهداری',
      'status.setup': 'تغییر محصول (Setup)',
      'machine.health': 'سلامت',
      'machine.util': 'بهره‌برداری',
      'machine.operators': 'اپراتور',
      'machine.maintain': 'نگهداری ({cost})',
      'machine.defect': 'احتمال عیب: {v}',
      'machine.detect': 'تشخیص عیب: {v}',
      'machine.perUnit': '{v} دقیقه برای هر واحد',
      'machine.making': 'در حال ساخت: {p}',
      'machine.wip': 'صف: {n}/{cap}',
      'mode.slow': 'آرام',
      'mode.normal': 'عادی',
      'mode.fast': 'سریع',
      'qc.label': 'سطح کنترل کیفیت',
      'qc.light': 'سبک',
      'qc.standard': 'استاندارد',
      'qc.strict': 'سخت‌گیرانه',

      'product.headphone': 'هدفون',
      'product.speaker': 'اسپیکر',
      'mat.components': 'قطعات الکترونیکی',
      'mat.casing': 'بدنه',

      'orders.offers': 'پیشنهادها',
      'orders.active': 'در جریان',
      'orders.emptyOffers': 'فعلاً پیشنهاد تازه‌ای نیست. مشتری‌های راضی‌تر بیشتر سفارش می‌دهند.',
      'orders.emptyActive': 'سفارش فعالی نداری. از تب پیشنهادها سفارش قبول کن.',
      'orders.units': '{n} عدد',
      'orders.unitPrice': '{p} هر عدد',
      'orders.total': 'مبلغ کل',
      'orders.due': 'تحویل تا',
      'orders.expires': 'اعتبار پیشنهاد',
      'orders.accept': 'قبول',
      'orders.decline': 'رد',
      'orders.deliver': 'تحویل',
      'orders.stock': 'موجودی: {have}/{need}',
      'orders.late': 'دیرکرد',
      'orders.work': 'مونتاژ ≈ {h} ساعت',
      'orders.plan': 'به صف تولید',
      'orders.planned': 'کسری {n} عدد به صف اضافه شد.',
      'orders.covered': 'برای این سفارش کسری‌ای نیست.',

      'plan.product': 'محصول',
      'plan.qty': 'تعداد',
      'plan.add': 'افزودن به صف',
      'plan.empty': 'صف تولید خالی است. یک دسته (Batch) اضافه کن.',
      'plan.progress': '{done} از {qty} شروع شده',
      'plan.bom': 'هر {p}: {c} قطعه + {k} بدنه',
      'plan.hint': 'تعویض محصول روی مونتاژ {m} دقیقه Setup می‌خواهد؛ دسته‌های هم‌نوع را پشت هم بگذار.',
      'plan.up': 'بالا',
      'plan.remove': 'حذف',

      'wh.raw': 'مواد اولیه',
      'wh.finished': 'محصول نهایی',
      'wh.stock': 'موجودی',
      'wh.price': 'قیمت امروز',
      'wh.capacity': 'ظرفیت: {used}/{cap}',
      'wh.buy': 'خرید',
      'wh.express': 'فوری (+{p}٪)',
      'wh.standard': 'عادی (۴ ساعت)',
      'wh.incoming': 'در راه',
      'wh.arrives': 'رسیدن: {v}',
      'wh.noIncoming': 'محموله‌ای در راه نیست.',
      'wh.sell': 'فروش عمده',
      'wh.sellHint': 'فروش مازاد به عمده‌فروش با قیمت پایین؛ اثری روی رضایت ندارد.',
      'wh.holding': 'هزینه‌ی نگهداری روزانه: {v}',
      'wh.cost': 'هزینه: {v}',

      'wf.total': 'کل کارکنان',
      'wf.free': 'بدون پست',
      'wf.wage': 'دستمزد روزانه',
      'wf.hire': 'استخدام ({cost})',
      'wf.fire': 'تعدیل ({cost})',
      'wf.hint': 'هر دستگاه با ۲ اپراتور ۴۵٪ سریع‌تر کار می‌کند. نیروی بی‌پست هم حقوق می‌گیرد.',

      'fin.cashChart': 'روند نقدینگی',
      'fin.yesterday': 'صورت سود و زیان دیروز',
      'fin.noData': 'گزارش اولین روز، پایان شیفت ساعت ۱۶:۰۰ آماده می‌شود.',
      'fin.revenue': 'درآمد',
      'fin.materials': 'مواد اولیه',
      'fin.wages': 'دستمزد',
      'fin.overhead': 'سربار ثابت',
      'fin.energy': 'انرژی',
      'fin.maintenance': 'نگهداری و تعمیر',
      'fin.holding': 'نگهداری انبار',
      'fin.hiring': 'استخدام/تعدیل',
      'fin.penalties': 'جریمه',
      'fin.refunds': 'مرجوعی',
      'fin.net': 'سود خالص',

      'btn.start': 'شروع بازی',
      'btn.restart': 'بازی دوباره',
      'btn.close': 'بستن',
      'btn.help': 'راهنما',
      'btn.resume': 'ادامه‌ی بازی',

      'start.lead': 'تو مدیر یک کارخانه‌ی کوچک هدفون و اسپیکر هستی. {days} روز کاری وقت داری که نقدینگی را از {start} به {goal} برسانی.',
      'start.rule1': 'سفارش مشتری‌ها را قبول کن و به‌موقع تحویل بده.',
      'start.rule2': 'مواد اولیه بخر، دسته‌های تولید را در صف بگذار و خط را سرپا نگه دار.',
      'start.rule3': 'سرعت بالا یعنی تولید بیشتر، ولی خرابی و ضایعات بیشتر.',
      'start.rule4': 'اگر آخر روز نقدینگی منفی شود یا رضایت مشتری به {min} برسد، می‌بازی.',
      'start.keys': 'میان‌بر: Space توقف/ادامه · ۱، ۲، ۳ سرعت',

      'end.won': 'کارخانه سودآور شد!',
      'end.lost': 'بازی تمام شد',
      'end.goal': 'به هدف {goal} رسیدی.',
      'end.goalMissed': 'روز آخر تمام شد، ولی نقدینگی به {goal} نرسید.',
      'end.bankrupt': 'نقدینگی آخر روز منفی شد و کارخانه ورشکست شد.',
      'end.customers': 'رضایت مشتری‌ها خیلی پایین آمد و بازار را از دست دادی.',
      'end.score': 'امتیاز نهایی',
      'end.grade': 'رتبه',
      'end.parts.profit': 'سود',
      'end.parts.productivity': 'بهره‌وری',
      'end.parts.quality': 'کیفیت',
      'end.parts.inventory': 'مدیریت موجودی',
      'end.parts.satisfaction': 'رضایت مشتری',
      'end.stats': '{on} سفارش به‌موقع · {late} با تأخیر · {cancel} لغوشده · {bd} خرابی',

      'help.title': 'راهنما و مفاهیم',
      'help.flow': 'جریان تولید: مواد اولیه ← مونتاژ ← تست ← بسته‌بندی ← انبار محصول ← تحویل به مشتری. بین دستگاه‌ها صف (WIP) با ظرفیت ۲۰ هست؛ اگر پر شود دستگاه قبلی متوقف می‌شود.',
      'help.oee.t': 'OEE (اثربخشی کلی تجهیزات)',
      'help.oee.d': 'دسترس‌پذیری × عملکرد × کیفیت. شاخص بهره‌وری بازی، OEE گلوگاه است؛ یعنی دستگاهی که بیشترین بار را دارد و ظرفیت کل خط را تعیین می‌کند.',
      'help.bottleneck.t': 'گلوگاه',
      'help.bottleneck.d': 'سریع‌کردن دستگاهی که گلوگاه نیست خروجی را بالا نمی‌برد. اپراتور دوم یا حالت سریع را روی گلوگاه بگذار.',
      'help.pm.t': 'نگهداری پیشگیرانه',
      'help.pm.d': 'با کار کردن سلامت دستگاه کم می‌شود و احتمال عیب و خرابی بالا می‌رود. نگهداری ۱ ساعت و ۱۸۰ دلار؛ خرابی ۲ تا ۴ ساعت و ۴۵۰ تا ۷۵۰ دلار.',
      'help.setup.t': 'زمان راه‌اندازی (Setup)',
      'help.setup.d': 'هر بار مونتاژ از یک محصول به محصول دیگر برود ۳۰ دقیقه وقت می‌گیرد. تولید دسته‌ای این هزینه را کم می‌کند.',
      'help.qc.t': 'کنترل کیفیت',
      'help.qc.d': 'بازرسی سخت‌گیرانه عیب‌های بیشتری را می‌گیرد ولی تست را کند می‌کند. عیبی که به مشتری برسد مرجوع می‌شود: پول برمی‌گردد، ۵۰٪ هزینه‌ی اضافه دارد و رضایت کم می‌شود.',
      'help.inv.t': 'مدیریت موجودی',
      'help.inv.d': 'انبار پر هزینه‌ی نگهداری دارد و انبار خالی خط را متوقف می‌کند. قیمت مواد هر روز تغییر می‌کند؛ خرید فوری ۴۰٪ گران‌تر است.',
      'help.score.t': 'امتیاز نهایی',
      'help.score.d': 'سود ۳۵٪ · بهره‌وری ۲۰٪ · رضایت ۲۰٪ · کیفیت ۱۵٪ · موجودی ۱۰٪',

      'err.gameOver': 'بازی تمام شده است.',
      'err.invalid': 'درخواست نامعتبر است.',
      'err.qty': 'تعداد را درست وارد کن.',
      'err.rawFull': 'انبار مواد اولیه جا ندارد.',
      'err.cash': 'نقدینگی کافی نیست.',
      'err.queueFull': 'صف تولید پر است (حداکثر ۸ دسته).',
      'err.batchStarted': 'دسته‌ی بالایی شروع شده است.',
      'err.operatorLimit': 'هر دستگاه بین ۰ تا ۲ اپراتور دارد.',
      'err.noFreeWorker': 'نیروی بدون پست نداری؛ اول استخدام کن.',
      'err.machineBusy': 'دستگاه الان متوقف است.',
      'err.maxWorkers': 'به سقف کارکنان رسیده‌ای.',
      'err.unassignFirst': 'اول یک اپراتور را از دستگاه بردار.',
      'err.stock': 'موجودی کافی نیست.',

      'log.welcome': 'خوش آمدی! دو پیشنهاد سفارش منتظر توست.',
      'log.buy': 'خرید {qty} {mat} به مبلغ {cost}',
      'log.arrived': '{qty} {mat} به انبار رسید.',
      'log.breakdown': '{machine} خراب شد! تعمیر {hours} ساعت و {cost} هزینه.',
      'log.repaired': '{machine} تعمیر شد.',
      'log.maintStart': 'نگهداری {machine} شروع شد ({cost}).',
      'log.maintDone': 'نگهداری {machine} انجام شد؛ سلامت ۱۰۰٪.',
      'log.lowHealth': 'سلامت {machine} پایین است؛ خطر خرابی بالاست.',
      'log.setupStart': 'Setup {machine} برای {product} شروع شد.',
      'log.setupDone': '{machine} آماده‌ی تولید {product} شد.',
      'log.newOffer': 'پیشنهاد تازه: {qty} {product} به قیمت {price}',
      'log.offerExpired': 'پیشنهاد {qty} {product} منقضی شد.',
      'log.accepted': 'سفارش {qty} {product} قبول شد.',
      'log.declined': 'سفارش {qty} {product} رد شد.',
      'log.orderLate': 'سفارش {qty} {product} دیر شد!',
      'log.cancelled': 'مشتری سفارش {qty} {product} را لغو کرد. جریمه: {fee}',
      'log.delivered': '{qty} {product} به‌موقع تحویل شد: +{revenue}',
      'log.deliveredLate': '{qty} {product} با تأخیر تحویل شد: +{revenue} (‎−{cut}٪)',
      'log.returns': '{n} محصول معیوب مرجوع شد: −{refund}',
      'log.hired': 'یک نفر استخدام شد.',
      'log.fired': 'یک نفر تعدیل شد.',
      'log.sold': '{qty} {product} به عمده‌فروش فروخته شد: +{revenue}',
      'log.dayEnd': 'پایان روز {day}. سود خالص: {profit}',
      'log.newDay': 'روز {day} شروع شد.'
    },

    en: {
      'app.title': 'Factory Manager',
      'app.subtitle': 'Audio electronics plant simulator',
      'lang.switch': 'فارسی',

      'time.day': 'Day {day} of {total}',
      'time.dayShort': 'Day {day}',
      'time.at': 'Day {day} · {clock}',
      'time.hoursLeft': '{h}h left',
      'time.minutesLeft': '{m}m left',
      'time.overdue': '{h}h overdue',
      'speed.pause': 'Pause',
      'speed.play': 'Resume',

      'kpi.cash': 'Cash',
      'kpi.cashSub': 'Goal: {goal}',
      'kpi.profit': 'Profit / loss',
      'kpi.profitSub': 'Yesterday: {v}',
      'kpi.oee': 'Productivity (OEE)',
      'kpi.oeeSub': 'Bottleneck: {m}',
      'kpi.quality': 'Quality',
      'kpi.qualitySub': '{s} scrap · {r} returns',
      'kpi.inventory': 'Warehouse fill',
      'kpi.inventorySub': 'Average: {v}',
      'kpi.satisfaction': 'Customer satisfaction',
      'kpi.satisfactionSub': 'Minimum: {v}',

      'panel.line': 'Production line',
      'panel.orders': 'Orders',
      'panel.plan': 'Production plan',
      'panel.warehouse': 'Warehouse & purchasing',
      'panel.workforce': 'Workforce',
      'panel.finance': 'Finance',
      'panel.log': 'Events',

      'machine.assembly': 'Assembly',
      'machine.test': 'Test & QC',
      'machine.packaging': 'Packaging',
      'status.running': 'Running',
      'status.idle': 'Idle — plan is empty',
      'status.starved': 'Waiting for input',
      'status.starvedMat': 'Out of materials',
      'status.blocked': 'Blocked — output full',
      'status.noOperator': 'No operator',
      'status.broken': 'Broken — repairing',
      'status.maintenance': 'Under maintenance',
      'status.setup': 'Product changeover',
      'machine.health': 'Health',
      'machine.util': 'Utilization',
      'machine.operators': 'Operators',
      'machine.maintain': 'Maintain ({cost})',
      'machine.defect': 'Defect chance: {v}',
      'machine.detect': 'Detection: {v}',
      'machine.perUnit': '{v} min per unit',
      'machine.making': 'Making: {p}',
      'machine.wip': 'Queue: {n}/{cap}',
      'mode.slow': 'Slow',
      'mode.normal': 'Normal',
      'mode.fast': 'Fast',
      'qc.label': 'QC level',
      'qc.light': 'Light',
      'qc.standard': 'Standard',
      'qc.strict': 'Strict',

      'product.headphone': 'Headphones',
      'product.speaker': 'Speakers',
      'mat.components': 'Components',
      'mat.casing': 'Casings',

      'orders.offers': 'Offers',
      'orders.active': 'In progress',
      'orders.emptyOffers': 'No new offers right now. Happier customers order more often.',
      'orders.emptyActive': 'No active orders. Accept one from the Offers tab.',
      'orders.units': '{n} units',
      'orders.unitPrice': '{p} each',
      'orders.total': 'Total',
      'orders.due': 'Due',
      'orders.expires': 'Offer valid',
      'orders.accept': 'Accept',
      'orders.decline': 'Decline',
      'orders.deliver': 'Deliver',
      'orders.stock': 'Stock: {have}/{need}',
      'orders.late': 'Late',
      'orders.work': 'Assembly ≈ {h}h',
      'orders.plan': 'Queue it',
      'orders.planned': 'Queued the {n}-unit shortfall.',
      'orders.covered': 'This order is already covered.',

      'plan.product': 'Product',
      'plan.qty': 'Quantity',
      'plan.add': 'Add to queue',
      'plan.empty': 'The production queue is empty. Add a batch.',
      'plan.progress': '{done} of {qty} started',
      'plan.bom': 'Each {p}: {c} components + {k} casing',
      'plan.hint': 'Switching product on assembly takes {m} min of setup; keep batches of the same product together.',
      'plan.up': 'Up',
      'plan.remove': 'Remove',

      'wh.raw': 'Raw materials',
      'wh.finished': 'Finished goods',
      'wh.stock': 'Stock',
      'wh.price': 'Today’s price',
      'wh.capacity': 'Capacity: {used}/{cap}',
      'wh.buy': 'Buy',
      'wh.express': 'Express (+{p}%)',
      'wh.standard': 'Standard (4h)',
      'wh.incoming': 'Incoming',
      'wh.arrives': 'Arrives: {v}',
      'wh.noIncoming': 'Nothing on the way.',
      'wh.sell': 'Wholesale',
      'wh.sellHint': 'Sell surplus to a wholesaler at a low price; no effect on satisfaction.',
      'wh.holding': 'Daily holding cost: {v}',
      'wh.cost': 'Cost: {v}',

      'wf.total': 'Employees',
      'wf.free': 'Unassigned',
      'wf.wage': 'Daily wages',
      'wf.hire': 'Hire ({cost})',
      'wf.fire': 'Let go ({cost})',
      'wf.hint': 'A machine with 2 operators runs 45% faster. Unassigned staff are still paid.',

      'fin.cashChart': 'Cash over time',
      'fin.yesterday': 'Yesterday’s P&L',
      'fin.noData': 'The first daily report is ready at the end of the shift (16:00).',
      'fin.revenue': 'Revenue',
      'fin.materials': 'Materials',
      'fin.wages': 'Wages',
      'fin.overhead': 'Fixed overhead',
      'fin.energy': 'Energy',
      'fin.maintenance': 'Maintenance & repair',
      'fin.holding': 'Inventory holding',
      'fin.hiring': 'Hiring / severance',
      'fin.penalties': 'Penalties',
      'fin.refunds': 'Returns',
      'fin.net': 'Net profit',

      'btn.start': 'Start game',
      'btn.restart': 'Play again',
      'btn.close': 'Close',
      'btn.help': 'Help',
      'btn.resume': 'Resume',

      'start.lead': 'You run a small headphone and speaker factory. You have {days} working days to grow cash from {start} to {goal}.',
      'start.rule1': 'Accept customer orders and deliver them on time.',
      'start.rule2': 'Buy materials, queue production batches and keep the line running.',
      'start.rule3': 'Faster machines mean more output, but also more breakdowns and defects.',
      'start.rule4': 'You lose if cash is negative at the end of a day, or satisfaction drops to {min}.',
      'start.keys': 'Shortcuts: Space pause/resume · 1, 2, 3 speed',

      'end.won': 'Your factory is profitable!',
      'end.lost': 'Game over',
      'end.goal': 'You reached the {goal} goal.',
      'end.goalMissed': 'The last day ended, but cash did not reach {goal}.',
      'end.bankrupt': 'Cash was negative at the end of the day. The factory went bankrupt.',
      'end.customers': 'Customer satisfaction fell too low and you lost the market.',
      'end.score': 'Final score',
      'end.grade': 'Grade',
      'end.parts.profit': 'Profit',
      'end.parts.productivity': 'Productivity',
      'end.parts.quality': 'Quality',
      'end.parts.inventory': 'Inventory',
      'end.parts.satisfaction': 'Satisfaction',
      'end.stats': '{on} on time · {late} late · {cancel} cancelled · {bd} breakdowns',

      'help.title': 'Guide & concepts',
      'help.flow': 'Flow: materials → assembly → test → packaging → finished goods → customer. Each pair of machines has a WIP queue of 20; when it fills up, the machine before it stops.',
      'help.oee.t': 'OEE (Overall Equipment Effectiveness)',
      'help.oee.d': 'Availability × Performance × Quality. The productivity KPI is the OEE of the bottleneck, the most loaded machine, which sets the capacity of the whole line.',
      'help.bottleneck.t': 'Bottleneck',
      'help.bottleneck.d': 'Speeding up a machine that is not the bottleneck does not raise output. Put the second operator or fast mode on the bottleneck.',
      'help.pm.t': 'Preventive maintenance',
      'help.pm.d': 'Health drops as a machine works, raising defects and breakdown risk. Maintenance takes 1h and $180; a breakdown takes 2–4h and $450–750.',
      'help.setup.t': 'Setup time',
      'help.setup.d': 'Every switch between products on assembly takes 30 minutes. Batch production keeps this cost down.',
      'help.qc.t': 'Quality control',
      'help.qc.d': 'Strict inspection catches more defects but slows the test machine. A defect that reaches a customer is returned: refunded, plus 50% handling, and satisfaction drops.',
      'help.inv.t': 'Inventory management',
      'help.inv.d': 'A full warehouse costs holding fees; an empty one stops the line. Material prices change daily; express delivery costs 40% more.',
      'help.score.t': 'Final score',
      'help.score.d': 'Profit 35% · Productivity 20% · Satisfaction 20% · Quality 15% · Inventory 10%',

      'err.gameOver': 'The game is over.',
      'err.invalid': 'Invalid request.',
      'err.qty': 'Enter a valid quantity.',
      'err.rawFull': 'The raw-material warehouse is full.',
      'err.cash': 'Not enough cash.',
      'err.queueFull': 'The queue is full (max 8 batches).',
      'err.batchStarted': 'The batch above has already started.',
      'err.operatorLimit': 'Each machine takes 0 to 2 operators.',
      'err.noFreeWorker': 'No unassigned staff; hire someone first.',
      'err.machineBusy': 'The machine is already stopped.',
      'err.maxWorkers': 'You have reached the staff limit.',
      'err.unassignFirst': 'Remove an operator from a machine first.',
      'err.stock': 'Not enough stock.',

      'log.welcome': 'Welcome! Two order offers are waiting for you.',
      'log.buy': 'Bought {qty} {mat} for {cost}',
      'log.arrived': '{qty} {mat} arrived at the warehouse.',
      'log.breakdown': '{machine} broke down! Repair: {hours}h, {cost}.',
      'log.repaired': '{machine} is repaired.',
      'log.maintStart': 'Maintenance on {machine} started ({cost}).',
      'log.maintDone': 'Maintenance on {machine} done; health 100%.',
      'log.lowHealth': '{machine} health is low; breakdown risk is high.',
      'log.setupStart': '{machine} changing over to {product}.',
      'log.setupDone': '{machine} is ready for {product}.',
      'log.newOffer': 'New offer: {qty} {product} at {price}',
      'log.offerExpired': 'Offer for {qty} {product} expired.',
      'log.accepted': 'Accepted order: {qty} {product}.',
      'log.declined': 'Declined order: {qty} {product}.',
      'log.orderLate': 'Order for {qty} {product} is late!',
      'log.cancelled': 'Customer cancelled {qty} {product}. Penalty: {fee}',
      'log.delivered': 'Delivered {qty} {product} on time: +{revenue}',
      'log.deliveredLate': 'Delivered {qty} {product} late: +{revenue} (−{cut}%)',
      'log.returns': '{n} defective units returned: −{refund}',
      'log.hired': 'Hired one employee.',
      'log.fired': 'Let one employee go.',
      'log.sold': 'Sold {qty} {product} wholesale: +{revenue}',
      'log.dayEnd': 'End of day {day}. Net profit: {profit}',
      'log.newDay': 'Day {day} started.'
    }
  };

  var lang = 'fa';
  var numberFmt = {};

  function setLang(l) {
    lang = dict[l] ? l : 'fa';
    return lang;
  }

  function getLang() { return lang; }
  function dir() { return lang === 'fa' ? 'rtl' : 'ltr'; }

  function t(key, params) {
    var s = (dict[lang] && dict[lang][key]) || dict.en[key] || key;
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return params[k] !== undefined ? params[k] : '{' + k + '}'; });
  }

  function num(n, digits) {
    digits = digits || 0;
    var key = lang + digits;
    if (!numberFmt[key]) {
      numberFmt[key] = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US',
        { maximumFractionDigits: digits, minimumFractionDigits: digits });
    }
    return numberFmt[key].format(n);
  }

  /** Money, wrapped in direction isolates so it reads correctly inside RTL text. */
  function money(n) {
    var sign = n < 0 ? '−' : '';
    return '⁦' + sign + '$' + num(Math.abs(Math.round(n))) + '⁩';
  }

  function pct(v, digits) {
    return num(v * 100, digits || 0) + (lang === 'fa' ? '٪' : '%');
  }

  function clock(t) {
    var p = FM.util.splitTime(t);
    var hh = String(p.hour).padStart(2, '0');
    var mm = String(p.minute).padStart(2, '0');
    if (lang === 'fa') { hh = num(p.hour).padStart(2, '۰'); mm = num(p.minute).padStart(2, '۰'); }
    return hh + ':' + mm;
  }

  function when(t) {
    var p = FM.util.splitTime(Math.min(t, FM.CONFIG.game.days * FM.CONFIG.game.minutesPerDay - 1));
    return FM.i18n.t('time.at', { day: num(p.day), clock: clock(t) });
  }

  /** Translates log params that are ids (machine, product, material) and formats money. */
  function logText(entry) {
    var p = Object.assign({}, entry.params);
    if (p.machine) p.machine = t('machine.' + p.machine);
    if (p.product) p.product = t('product.' + p.product);
    if (p.mat) p.mat = t('mat.' + p.mat);
    ['cost', 'revenue', 'refund', 'fee', 'price', 'profit'].forEach(function (k) {
      if (p[k] !== undefined) p[k] = money(p[k]);
    });
    ['qty', 'n', 'day', 'hours', 'cut'].forEach(function (k) {
      if (typeof p[k] === 'number') p[k] = num(p[k], k === 'hours' ? 1 : 0);
    });
    return t(entry.key, p);
  }

  FM.i18n = { t: t, setLang: setLang, getLang: getLang, dir: dir, num: num, money: money, pct: pct, clock: clock, when: when, logText: logText };
})(window.FM = window.FM || {});
