/**
 * Browser test: plays the real page in Chrome on a desktop and a phone screen.
 *
 *   npm i --no-save playwright-core && node tests/browser.js
 *
 * Uses the installed Google Chrome (or CHROME_PATH). Checks:
 *  - no console errors or page errors anywhere;
 *  - chapter 1 can be won with clicks only (accept, plan, deliver);
 *  - every chapter runs to its end screen in the page while the reference bot plays;
 *  - every sheet and machine popover opens; nothing overflows the phone screen sideways.
 */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var chromium = require('playwright-core').chromium;

var ROOT = path.join(__dirname, '..');
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}

var failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); console.log((ok ? '  ✓ ' : '  ✗ ') + msg); }

async function startChapter(page, id) {
  await page.click('[data-act="start"][data-id="' + id + '"]');
  await page.waitForSelector('[data-act="modalStart"]');
  await page.click('[data-act="modalStart"]');
}

async function backToMenu(page) {
  await page.click('[data-act="modalMenu"]');
  await page.waitForSelector('#menu:not([hidden])');
}

/** Chapter 1 with clicks only: accept offers, put shortfalls in the plan, deliver what is ready. */
async function playChapterOneByHand(page, label) {
  await startChapter(page, 'ch1');
  await page.evaluate(function () { FM.app.rate = 40; });
  await page.click('[data-sheet="orders"]');
  for (var i = 0; i < 400; i++) {
    if (await page.$('[data-act="modalAgain"]')) break;
    var sel = '#sheet [data-act="accept"], #sheet [data-act="planFor"], #sheet [data-act="deliver"]:not([disabled])';
    if (await page.$(sel)) {
      // The list re-renders as the game runs; a button that vanished is simply looked up again.
      try { await page.locator(sel).first().click({ timeout: 1000 }); } catch (e) { /* retry next round */ }
    } else {
      await page.waitForTimeout(100);
    }
  }
  var result = await page.evaluate(function () { return FM.app.state.result; });
  check(result && result.won, label + ': chapter 1 won by clicking (' + JSON.stringify(result && { won: result.won, reason: result.reason, stars: result.stars }) + ')');
  check(result && result.stars >= 2, label + ': chapter 1 with every order on time');
  check(!!(await page.$('.end.won .stars')), label + ': win screen shows stars');
  await backToMenu(page);
}

/** The reference bot plays a chapter inside the page; the end screen must appear. */
async function playWithBot(page, id, label) {
  await startChapter(page, id);
  await page.evaluate(function () {
    FM.app.rate = 900;
    FM.app.speed = 4;
    window.__bot = setInterval(function () { if (FM.app.state && FM.app.state.status === 'running') FM.Bots.smart(FM.app.state); }, 15);
  });
  await page.waitForSelector('[data-act="modalAgain"]', { timeout: 120000 });
  var r = await page.evaluate(function () { clearInterval(window.__bot); return FM.app.state.result; });
  check(!!r, label + ': ' + id + ' reaches its end screen (' + (r.won ? 'won' : 'lost: ' + r.reason) + ', day ' + r.day + ')');
  await backToMenu(page);
}

async function tourPanels(page, label, width) {
  await startChapter(page, 'ch5');
  await page.evaluate(function () { FM.app.rate = 60; });
  await page.waitForTimeout(1500);
  var sheets = ['orders', 'plan', 'buy', 'workers', 'report'];
  for (var i = 0; i < sheets.length; i++) {
    await page.click('[data-sheet="' + sheets[i] + '"]');
    await page.waitForTimeout(250);
    var title = await page.textContent('#sheet-title');
    check(!!title && !(await page.isHidden('#sheet')), label + ': sheet ' + sheets[i] + ' opens');
  }
  await page.click('[data-act="closeSheet"]');
  var machines = ['assembly', 'test', 'packaging'];
  for (var j = 0; j < machines.length; j++) {
    await page.evaluate(function (m) {
      document.querySelector('[data-machine="' + m + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, machines[j]);
    await page.waitForTimeout(250);
    var box = await page.$eval('#pop', function (el) { var r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, hidden: el.hidden }; });
    check(!box.hidden && box.l >= 0 && box.r <= width + 1, label + ': ' + machines[j] + ' popover opens inside the screen');
  }
  // A popover action: send one worker away and back.
  await page.click('#pop [data-act="ops"][data-d="-1"]');
  await page.click('#pop [data-act="ops"][data-d="1"]');
  var overflow = await page.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
  check(overflow <= 0, label + ': page does not scroll sideways (' + overflow + 'px)');
  await page.click('[data-act="back"]');
  await page.click('[data-act="modalOk"]');
  await page.waitForSelector('#menu:not([hidden])');
}

(async function main() {
  var server = await serve();
  var url = 'http://127.0.0.1:' + server.address().port + '/index.html';
  var browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
  var screens = [{ label: 'desktop', viewport: { width: 1280, height: 800 } }, { label: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }];
  var shots = process.env.SHOTS;
  try {
    for (var i = 0; i < screens.length; i++) {
      var sc = screens[i];
      var ctx = await browser.newContext({ viewport: sc.viewport, isMobile: !!sc.isMobile, hasTouch: !!sc.hasTouch, deviceScaleFactor: 1 });
      var page = await ctx.newPage();
      var errors = [];
      page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', function (e) { errors.push(String(e)); });
      console.log(sc.label);
      await page.goto(url);
      await page.waitForSelector('.chapter-card');
      check((await page.$$('.chapter-card')).length === 6, sc.label + ': menu lists 5 chapters and free play');
      if (shots) await page.screenshot({ path: path.join(shots, sc.label + '-menu.png') });
      await playChapterOneByHand(page, sc.label);
      await tourPanels(page, sc.label, sc.viewport.width);
      if (sc.label === 'desktop') {
        var ids = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'free'];
        for (var k = 0; k < ids.length; k++) await playWithBot(page, ids[k], sc.label);
      }
      check(errors.length === 0, sc.label + ': no console or page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
      await ctx.close();
    }
  } catch (e) {
    failures.push(String(e && e.stack || e));
    console.log(e);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures.length ? '\n' + failures.length + ' browser check(s) failed' : '\nall browser checks passed');
  process.exitCode = failures.length ? 1 : 0;
})();
