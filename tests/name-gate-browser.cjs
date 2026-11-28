// Serve the repo on localhost:8000. Install puppeteer-core and @sparticuz/chromium, or supply CHROME_PATH.
// Every game page must block play until the student's name is entered once; the name is then reused
// by every other game, fills the game's own name field, and can be changed from the ♿ tools menu.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'http://localhost:8000/';
const KEY = 'hakimestan_student_name';
const root = path.join(__dirname, '..');
const games = fs.readdirSync(path.join(root, 'games')).filter(f => f.endsWith('.html') && !/teacher/.test(f)).map(f => 'games/' + f)
  .concat(fs.readdirSync(path.join(root, 'games/lab2d-apps')).filter(f => f.endsWith('.html')).map(f => 'games/lab2d-apps/' + f));

async function prepare(page, width) {
  await page.setViewport({width, height: 760});
  await page.setBypassServiceWorker(true);
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    if (u.includes('script.google')) return r.respond({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"ok":true}'});
    return r.abort();
  });
  await page.evaluateOnNewDocument(() => localStorage.setItem('hk_no_stats', '1'));
}

(async () => {
  const pup = require('puppeteer-core');
  const pkg = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome = pkg?.default || pkg;
  const browser = await pup.launch({executablePath: process.env.CHROME_PATH || await chrome.executablePath(), args: chrome?.args || ['--no-sandbox']});
  try {
    // 1) Each game, in a fresh profile, is blocked until a name is entered.
    for (const [i, g] of games.entries()) {
      const width = [320, 390, 1280][i % 3];
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await prepare(page, width);
      await page.goto(BASE + g, {waitUntil: 'load'});
      await page.waitForSelector('#hk-name-gate', {timeout: 5000});
      const s = await page.evaluate(() => {
        const gate = document.getElementById('hk-name-gate'), card = gate.querySelector('.hkng-card').getBoundingClientRect();
        const hit = document.elementFromPoint(innerWidth / 2, innerHeight - 4);
        const others = [...document.body.children].filter(e => e !== gate && !['SCRIPT', 'STYLE'].includes(e.tagName));
        return {
          role: gate.getAttribute('role'), modal: gate.getAttribute('aria-modal'), focus: document.activeElement.id,
          fits: card.left >= 0 && card.right <= innerWidth + 0.5 && card.top >= 0, overflow: document.documentElement.scrollWidth - innerWidth,
          covered: gate.contains(hit), inert: others.every(e => e instanceof HTMLElement ? e.inert : e.getAttribute('aria-hidden') === 'true'), skip: !!gate.querySelector('.hkng-cancel')
        };
      });
      assert.deepEqual(s, {role: 'dialog', modal: 'true', focus: 'hkngInput', fits: true, overflow: 0, covered: true, inert: true, skip: false}, `${g} @${width}`);
      // keyboard focus stays inside the dialog
      for (let t = 0; t < 4; t++) await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => document.getElementById('hk-name-gate').contains(document.activeElement)), `${g}: focus trapped`);
      await page.keyboard.press('Escape');
      assert.ok(await page.$('#hk-name-gate'), `${g}: Escape cannot skip`);
      await page.focus('#hkngInput');
      await page.keyboard.press('Enter');
      assert.match(await page.$eval('#hkngError', e => e.textContent), /اسمت را بنویس/, `${g}: empty name refused`);
      await page.type('#hkngInput', 'سارا احمدی');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.getElementById('hk-name-gate'), {timeout: 3000});
      const after = await page.evaluate(k => ({
        stored: localStorage.getItem(k), open: document.documentElement.classList.contains('hkng-open'),
        inert: [...document.body.children].some(e => e.inert || e.hasAttribute('data-hkng-hidden')),
        fields: [...document.querySelectorAll('#nameInput,#studentNameInput,#gameStudentName,#profNameInput,#nameInp,#myName,#studentName,#nameIn,#playerName,#f-name,#studentIdentity')]
          .filter(e => e.tagName === 'INPUT').map(e => e.value)
      }), KEY);
      assert.equal(after.stored, 'سارا احمدی', `${g}: saved`);
      assert.equal(after.open, false, `${g}: scroll lock released`);
      assert.equal(after.inert, false, `${g}: game usable`);
      assert.ok(after.fields.every(v => v === 'سارا احمدی'), `${g}: game name fields prefilled ${JSON.stringify(after.fields)}`);
      assert.deepEqual(errors, [], `${g}: no page errors`);
      await ctx.close();
    }

    // 2) Entered once → reused by every other game; changeable from the ♿ menu.
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await prepare(page, 390);
    await page.goto(BASE + 'games/hakim-quest.html', {waitUntil: 'load'});
    await page.waitForSelector('#hkngInput');
    await page.type('#hkngInput', 'Sara Ahmadi');
    await page.click('#hk-name-gate .hkng-go');
    await page.waitForFunction(() => !document.getElementById('hk-name-gate'));
    for (const g of ['games/math-stats.html', 'games/kohan-diyar.html', 'games/math-time-mission.html', 'games/lab2d-apps/hakim-pulley.html']) {
      await page.goto(BASE + g, {waitUntil: 'load'});
      await new Promise(r => setTimeout(r, 300));
      assert.equal(await page.$('#hk-name-gate'), null, `${g}: name already known`);
      assert.equal(await page.evaluate(() => HakimStudent.get()), 'Sara Ahmadi');
    }
    await page.goto(BASE + 'games/math-stats.html', {waitUntil: 'load'});
    await page.waitForSelector('#studentNameInput');
    assert.equal(await page.$eval('#studentNameInput', e => e.value), 'Sara Ahmadi', 'app.js profile uses the site name');
    await page.goto(BASE + 'games/hakim-cards.html', {waitUntil: 'load'});
    await page.click('#a11y-fab');
    await page.click('#a11y-tools [data-student-name]');
    await page.waitForSelector('#hk-name-gate .hkng-cancel');
    assert.equal(await page.$eval('#hkngInput', e => e.value), 'Sara Ahmadi');
    await page.keyboard.press('Escape');
    assert.equal(await page.$('#hk-name-gate'), null, 'edit dialog closes with Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'a11y-fab', 'focus returns to the menu button');
    await page.click('#a11y-fab');
    await page.click('#a11y-tools [data-student-name]');
    await page.waitForSelector('#hkngInput');
    await page.$eval('#hkngInput', e => { e.value = ''; });
    await page.type('#hkngInput', 'Sara Rezaei');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('hk-name-gate'));
    assert.equal(await page.$eval('#nameInput', e => e.value), 'Sara Rezaei', 'edit syncs the game field');
    await page.goto(BASE + 'games/math-geometry.html', {waitUntil: 'load'});
    await page.waitForSelector('#playerName');
    assert.equal(await page.$eval('#playerName', e => e.value), 'Sara Rezaei', 'profile-per-name game follows the edit');
    // the lobby is not gated and its chat reads the same key
    await page.goto(BASE + 'index.html', {waitUntil: 'load'});
    assert.equal(await page.$('#hk-name-gate'), null, 'lobby is not gated');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), 'Sara Rezaei');
    await ctx.close();
    console.log(`Name gate (browser): ${games.length} games blocked until a name is entered; reuse, sync and editing OK`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
