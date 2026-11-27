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
      assert.equal(data.markers,6);
      assert.deepEqual(data.csp,[]);
      await page.click('.journey-film-footer a');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'journeySetupHeading');
      await page.evaluate(()=>document.querySelector('#startVideo source').dispatchEvent(new Event('error')));
      assert.equal(await page.$eval('#introVideoError', e=>e.hidden),false);
      await page.evaluate(()=>document.getElementById('startVideo').dispatchEvent(new Event('loadedmetadata')));
      assert.equal(await page.$eval('#introVideoError', e=>e.hidden),true);
      await page.$eval('#startMapContainer',e=>e.scrollIntoView({block:'center'}));
      const mapPosition = await page.evaluate(() => {
        const marker=document.querySelector('#start-city-4'), box=document.querySelector('#startMapContainer');
        const svg=box.querySelector('svg.iran-map-svg');
        const rect=marker.getBoundingClientRect(), label=marker.querySelector('.city-label').getBoundingClientRect(), bounds=box.getBoundingClientRect();
        const point=svg.createSVGPoint(); point.x=rect.left+rect.width/2; point.y=rect.top+rect.height/2;
        const inside=[...svg.querySelectorAll('path[data-province-key]')].some(path=>path.isPointInFill(point.matrixTransform(path.getScreenCTM().inverse())));
        return {inside, fits:label.left>=bounds.left && label.right<=bounds.right && label.top>=bounds.top && label.bottom<=bounds.bottom,
          overlaps:[...box.querySelectorAll('.city-marker:not(.samarkand-marker)')].some(e=>{const r=e.getBoundingClientRect();return label.left<r.right && label.right>r.left && label.top<r.bottom && label.bottom>r.top;})};
      });
      assert.equal(mapPosition.inside,false, 'Samarkand is outside Iranian province paths');
      assert.equal(mapPosition.fits,true, 'Samarkand label fits on map');
      assert.equal(mapPosition.overlaps,false, 'Samarkand label does not overlap another marker');
      await page.focus('#start-city-4');
      await page.keyboard.press('Enter');
      assert.match(await page.$eval('#provincePopup',e=>e.textContent),/ازبکستان/);
      await page.keyboard.press('Escape');
      assert.equal(await page.$('#provincePopup'),null);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'start-city-4');
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
      assert.match(await page.$eval('.timer-circle',e=>e.getAttribute('aria-label')),/ثانیه/);
      assert.equal(await page.$eval('#city-progress-bar',e=>e.getAttribute('aria-valuenow')),'0');
      await page.evaluate(()=>{if(window.Hakim) Hakim.saveAnswer=()=>{};const q=QUESTIONS[state.currentQ];checkAnswer(q.answer)});
      assert.notEqual(await page.$eval('#city-progress-bar',e=>e.getAttribute('aria-valuenow')),'0', 'city progress updates immediately');
      assert.match(await page.$eval('#feedbackBox',e=>e.textContent),/پاسخ درست/);
      await page.evaluate(()=>{state.combo=2;updateHeader()});
      assert.equal(await page.$eval('#combo-display',e=>e.hidden),false,'combo becomes visible after scoring');
      await page.evaluate(()=>openMapModal());
      assert.match(await page.$eval('#modal-city-4',e=>e.getAttribute('aria-label')),/ازبکستان/);
      await page.click('#modal-city-4');
      assert.match(await page.$eval('#provincePopup',e=>e.textContent),/در انتظار فتح/);
      await page.keyboard.press('Escape');
      await page.evaluate(()=>{state.conqueredCities=[0,1,2,3,4]; state.badges=[{city:4}]; closeMapModal(); openMapModal(); atlasZoom(1.12);});
      assert.ok(await page.$('#modal-city-4 .flag-banner'), 'Samarkand flag shown after conquest');
      await page.focus('#modal-city-4');
      await page.keyboard.press('Enter');
      assert.match(await page.$eval('#provincePopup',e=>e.textContent),/فتح شده/);
      await page.keyboard.press('Escape');
      await page.evaluate(()=>{closeMapModal(); document.getElementById('end-screen').classList.add('show'); toggleMapAccordion();});
      assert.ok(await page.$('#final-city-4 .flag-banner'), 'final map shows Samarkand flag');
      await page.$eval('#final-city-4',e=>e.scrollIntoView({block:'center'}));
      await page.click('#final-city-4');
      assert.match(await page.$eval('#provincePopup',e=>e.textContent),/ازبکستان/);
      await page.keyboard.press('Escape');
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
