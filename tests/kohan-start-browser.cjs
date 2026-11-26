// Responsive and functional regression checks; serve the repository at localhost:8000.
'use strict';
const assert = require('node:assert/strict');
const pup = require('puppeteer-core');
const BASE = 'http://localhost:8000/';
const URL = BASE + 'games/kohan-diyar.html';
const overlap = (a,b) => a.left < b.right-1 && a.right > b.left+1 && a.top < b.bottom-1 && a.bottom > b.top+1;
(async () => {
  const pkg = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome = pkg?.default || pkg;
  const browser = await pup.launch({executablePath:process.env.CHROME_PATH || await chrome.executablePath(),args:chrome?.args || ['--no-sandbox']});
  try {
    for (const width of [360,768,1366]) for (const theme of ['light','dark']) {
      const page = await browser.newPage();
      const errors=[];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
      await page.setViewport({width,height:900});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setBypassServiceWorker(true);
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('hk_no_stats','1'); window.__csp=[];
        document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective));
      });
      await page.goto(URL,{waitUntil:'load'});
      await page.evaluate(t => { document.querySelector('#intro-screen').style.display='none'; document.body.dataset.theme=t; },theme);
      const data = await page.evaluate(() => {
        const b = s => { const r=document.querySelector(s).getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}; };
        return {width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,hero:b('.journey-hero'),film:b('.journey-film'),video:b('#startVideo'),setup:b('.journey-setup'),map:b('.start-map-wrapper'),csp:window.__csp,markers:document.querySelectorAll('#startCityMarkers .city-marker').length};
      });
      assert.equal(data.width,data.viewport, `${width} ${theme}: horizontal overflow`);
      assert.ok(!overlap(data.hero,data.film) && !overlap(data.setup,data.map), `${width} ${theme}: cards overlap`);
      assert.ok(data.film.bottom <= data.setup.top && data.video.width > 0, 'film must precede the game');
      assert.equal(data.markers,5);
      assert.deepEqual(data.csp,[]);
      await page.click('.journey-film-footer a');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'journeySetupHeading');
      await page.evaluate(()=>document.querySelector('#startVideo source').dispatchEvent(new Event('error')));
      assert.equal(await page.$eval('#introVideoError', e=>e.hidden),false);
      await page.evaluate(()=>document.getElementById('startVideo').dispatchEvent(new Event('loadedmetadata')));
      assert.equal(await page.$eval('#introVideoError', e=>e.hidden),true);
      await page.$eval('#startMapContainer',e=>e.scrollIntoView({block:'center'}));
      await page.click('.start-map-wrapper .atlas-samarkand');
      assert.match(await page.$eval('#provincePopup',e=>e.textContent),/ازبکستان/);
      await page.keyboard.press('Escape');
      assert.equal(await page.$('#provincePopup'),null);
      await page.type('#studentNameInput','Student');
      await page.click('[data-id="nasir"]');
      await page.click('.journey-actions .start-btn');
      const game = await page.evaluate(() => {
        const b = el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}; };
        const buttons=[...document.querySelectorAll('#map-section .game-map-link')].map(b);
        return {buttons, width:document.documentElement.scrollWidth, viewport:document.documentElement.clientWidth, comboHidden:document.getElementById('combo-display').hidden};
      });
      assert.equal(game.width,game.viewport, `${width} ${theme}: game overflow`);
      assert.ok(game.buttons.every(button=>button.height>=44), 'map buttons must have full-sized touch targets');
      assert.ok(!overlap(game.buttons[0],game.buttons[1]), 'map buttons must not overlap');
      assert.equal(game.comboHidden,true,'zero combo does not reserve header space');
      await page.evaluate(()=>{state.combo=2;updateHeader()});
      assert.equal(await page.$eval('#combo-display',e=>e.hidden),false,'combo becomes visible after scoring');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    const page=await browser.newPage();
    await page.setViewport({width:360,height:900});
    await page.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
    await page.goto(URL,{waitUntil:'load'});
    await page.evaluate(()=>{document.querySelector('#intro-screen').style.display='none';const v=document.getElementById('startVideo');const pause=v.pause.bind(v);v.pause=()=>{window.__videoPaused=true;pause()}});
    await page.type('#studentNameInput','Student');
    await page.click('[data-id="nasir"]');
    await page.click('.journey-actions .start-btn');
    assert.equal(await page.evaluate(()=>window.__videoPaused),true,'starting stops video');
    assert.equal(await page.evaluate(()=>state.commander),'nasir');
    assert.ok(await page.evaluate(()=>localStorage.getItem('ftah_iran_progress_v1')),'checkpoint is saved');
    await page.reload({waitUntil:'load'});
    await page.evaluate(()=>{document.querySelector('#intro-screen').style.display='none';const v=document.getElementById('startVideo');const pause=v.pause.bind(v);v.pause=()=>{window.__videoPaused=true;pause()}});
    await page.click('#resumeBtn');
    assert.equal(await page.evaluate(()=>window.__videoPaused),true,'resuming also stops video');
    assert.equal(await page.evaluate(()=>state.commander),'nasir');
    await page.close();
    console.log('Kohan start: responsive layout, optional video, interactions and resume OK');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
