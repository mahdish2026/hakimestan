'use strict';
// Appearance-specific real-browser coverage. No production calls or user data.
const assert=require('node:assert/strict'),fs=require('node:fs'),pup=require('puppeteer-core'),axe=require('axe-core');
const base=process.env.BASE_URL||'http://localhost:8000/';
(async()=>{const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),c=pkg?.default||pkg,b=await pup.launch({executablePath:process.env.CHROME_PATH||await c.executablePath(),args:c?.args||['--no-sandbox'],headless:true});
fs.mkdirSync('reports/teacher-studios',{recursive:true});
try{
 const p=await b.newPage(),errors=[];p.setDefaultNavigationTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.setBypassServiceWorker(true);await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith(base)||/^(data:|blob:)/.test(r.url())?r.continue():r.abort());await p.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
 async function audit(label,selector='body'){await new Promise(r=>setTimeout(r,550));await p.evaluate(axe.source);const result=await p.evaluate(async sel=>(await axe.run(document.querySelector(sel),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))})),selector);assert.deepEqual(result,[],label);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' overflow')}
 for(const width of [1440,320]){
  await p.setViewport({width,height:900});await p.goto(base+'hqf-converter.html',{waitUntil:'load'});await p.evaluate(()=>{localStorage.removeItem('hakimestan_hqf_converter_v1');HQFConverter.clearDraftStorage()});await p.reload({waitUntil:'load'});
  const palettes=await p.$$eval('#atelierPalette option',es=>es.map(e=>e.value));assert.equal(palettes.length,7);
  for(const palette of palettes){await p.select('#atelierPalette',palette);await audit(`converter ${width} ${palette} home`)}
  await p.click('#btnSample');const data=await p.evaluate(()=>JSON.stringify(HQFConverter.state.result.hqf));
  for(const palette of palettes){await p.select('#atelierPalette',palette);await audit(`converter ${width} ${palette} results`);assert.equal(await p.evaluate(()=>JSON.stringify(HQFConverter.state.result.hqf)),data,'appearance must not mutate content')}
  await p.select('#atelierPalette','ocean');await p.reload({waitUntil:'load'});assert.equal(await p.$eval('#atelierPalette',e=>e.value),'ocean');
  if(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed'))==='false')await p.click('[data-atelier-depth-toggle]');
  await p.click('[data-atelier-depth-toggle]');assert.equal(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed')),'false');assert.equal(await p.$eval('.atelier-spark',e=>getComputedStyle(e).display),'none');
  await p.reload({waitUntil:'load'});assert.equal(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed')),'false');await p.click('[data-atelier-depth-toggle]');
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.atelier-spark',e=>getComputedStyle(e).animationName),'none');await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await p.goto(base+'tarh-dars.html',{waitUntil:'load'});await p.evaluate(()=>{store.settings.theme='paper';themeApply()});await audit(`planner ${width} paper`);
  await p.locator('.atelier-theme-link').click();assert.equal(await p.$eval('#modal',e=>e.open),true);await p.evaluate(()=>document.getElementById('modal').close());
  for(const theme of await p.evaluate(()=>THEMES.map(t=>t[0]))){await p.evaluate(t=>{store.settings.theme=t;themeApply()},theme);await audit(`planner ${width} ${theme} appearance`,'.atelier-appearance')}
  await p.locator('#nav-bank').click();await p.locator('#nav-home').click();assert.equal(await p.$$eval('.atelier-scene',es=>es.length),1,'scene survives rerender');
  // A synthetic mouse event exercises scene-only tilt, including after planner rerenders.
  if(width===1440){await p.evaluate(()=>{const scene=document.querySelector('.atelier-scene'),r=scene.getBoundingClientRect();scene.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:r.right-5,clientY:r.top+5}))});
   const canTilt=await p.evaluate(()=>matchMedia('(hover: hover) and (pointer: fine)').matches);if(canTilt)assert.notEqual(await p.$eval('.atelier-object',e=>e.style.getPropertyValue('--atelier-rx')),'')}
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.atelier-spark',e=>getComputedStyle(e).animationName),'none');assert.equal(await p.$eval('.atelier-object',e=>getComputedStyle(e).transform),'none');await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  assert.equal(await p.$eval('.atelier-spark',e=>getComputedStyle(e).animationIterationCount),'3','no perpetual decorative animation');
  await p.evaluate(()=>{store.settings.theme='paper';themeApply()});await new Promise(r=>setTimeout(r,600));await p.screenshot({path:`reports/teacher-studios/appearance-planner-${width}.png`});
  await p.goto(base+'hqf-converter.html',{waitUntil:'load'});await p.select('#atelierPalette','garden');await new Promise(r=>setTimeout(r,600));await p.screenshot({path:`reports/teacher-studios/appearance-converter-${width}.png`});
  console.log(`PASS appearance ${width}: 7 palettes, 12 planner control palettes, axe, immutable content, reload, toggles, scene rerender and reduced motion`);
 }
 // Failed storage must leave appearance controls usable and honest.
 const blocked=await b.newPage();blocked.on('pageerror',e=>errors.push(e.message));await blocked.setRequestInterception(true);blocked.on('request',r=>r.url().startsWith(base)?r.continue():r.abort());await blocked.evaluateOnNewDocument(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError')}});await blocked.goto(base+'hqf-converter.html',{waitUntil:'load'});await blocked.select('#atelierPalette','rose');assert.equal(await blocked.$eval('body',e=>e.dataset.atelierPalette),'rose');assert.match(await blocked.$eval('#atelierAppearanceStatus',e=>e.textContent),/ذخیره نشد/);await blocked.click('[data-atelier-depth-toggle]');assert.equal(await blocked.$eval('body',e=>e.dataset.atelierDepth),'off');await blocked.close();assert.deepEqual(errors,[]);
 // Do not bypass the worker here: these assets and interactions must survive real offline navigation.
 const offline=await b.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
 await offline.goto(base+'hqf-converter.html',{waitUntil:'load'});await offline.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready});await offline.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:60000});
 for(const asset of ['css/teacher-studios.css','js/teacher-studio-appearance.js','assets/teacher-studios/question-atelier.svg','assets/teacher-studios/lesson-atelier.svg','css/teacher-studios-pro.css','js/teacher-studio-pro.js','assets/teacher-studios/question-engine.webp','assets/teacher-studios/lesson-landscape.webp'])assert.ok(await offline.evaluate(async a=>!!await caches.match(a),asset),asset+' precached');
 await offline.setOfflineMode(true);
 for(const file of ['hqf-converter.html','tarh-dars.html']){await offline.goto(base+file,{waitUntil:'load'});await offline.waitForSelector('.atelier-scene img');assert.equal(await offline.$eval('.atelier-scene img',e=>e.complete&&e.naturalWidth>0),true);await offline.click('[data-atelier-depth-toggle]');assert.equal(await offline.$eval('body',e=>e.dataset.atelierDepth),'off');await offline.click('[data-atelier-depth-toggle]');if(file.startsWith('hqf')){await offline.select('#atelierPalette','rose');assert.equal(await offline.$eval('body',e=>e.dataset.atelierPalette),'rose')}}
 await offline.close();assert.deepEqual(errors,[]);
 console.log('PASS appearance: failed storage stays usable; real SW offline artwork/palettes/depth on both pages; no JS errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
