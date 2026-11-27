'use strict';
// Appearance-specific real-browser coverage. No production calls or user data.
const assert=require('node:assert/strict'),fs=require('node:fs'),pup=require('puppeteer-core'),axe=require('axe-core');
const base=process.env.BASE_URL||'http://localhost:8000/';
(async()=>{const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),c=pkg?.default||pkg,b=await pup.launch({executablePath:process.env.CHROME_PATH||await c.executablePath(),args:c?.args||['--no-sandbox'],headless:true});
fs.mkdirSync('reports/teacher-studios',{recursive:true});
try{
 const p=await b.newPage(),errors=[];p.setDefaultNavigationTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.setBypassServiceWorker(true);await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith(base)||/^(data:|blob:)/.test(r.url())?r.continue():r.abort());await p.evaluateOnNewDocument(()=>{localStorage.setItem('hk_no_stats','1');window.__appearanceClicks=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{window.__appearanceClicks.push({type,id:e.target.id,cls:e.target.className,x:e.clientX,y:e.clientY});window.__appearanceClicks=window.__appearanceClicks.slice(-9)},true)});
 async function audit(label,selector='body'){await new Promise(r=>setTimeout(r,550));await p.evaluate(axe.source);const result=await p.evaluate(async sel=>(await axe.run(document.querySelector(sel),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))})),selector);assert.deepEqual(result,[],label);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' overflow')}
 for(const width of [1440,320]){
  await p.setViewport({width,height:900});await p.goto(base+'hqf-converter.html',{waitUntil:'load'});await p.evaluate(()=>{localStorage.removeItem('hakimestan_hqf_converter_v1');HQFConverter.clearDraftStorage()});await p.reload({waitUntil:'load'});
  const palettes=await p.$$eval('#atelierPalette option',es=>es.map(e=>e.value));assert.equal(palettes.length,7);
  for(const palette of palettes){await p.select('#atelierPalette',palette);await audit(`converter ${width} ${palette} home`)}
  const raisedShadow=await p.$eval('#btnSample',e=>getComputedStyle(e).boxShadow);
  await p.click('[data-atelier-depth-toggle]');assert.equal(await p.$eval('body',e=>e.dataset.atelierDepth),'off');assert.notEqual(await p.$eval('#btnSample',e=>getComputedStyle(e).boxShadow),raisedShadow,'depth toggle changes actual controls, not just decoration');
  await p.click('[data-atelier-depth-toggle]');
  assert.equal(await p.$eval('.desk-sigil-front',e=>getComputedStyle(e).animationIterationCount),'1');
  // Locator waits for smooth scrolling and tactile hover geometry before a real click.
  await p.locator('#btnSample').click();await p.waitForFunction(()=>HQFConverter.state.result?.hqf.questions.length>0).catch(async e=>{console.error('SAMPLE DIAGNOSTIC',width,await p.evaluate(()=>{const b=document.querySelector('#btnSample'),r=b.getBoundingClientRect();return {clicks:window.__appearanceClicks,rect:r.toJSON(),point:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).map(x=>x.tagName+'#'+x.id+'.'+x.className),state:HQFConverter.state,scrollY,viewport:[innerWidth,innerHeight]}}));throw e});const data=await p.evaluate(()=>JSON.stringify(HQFConverter.state.result.hqf));
  for(const palette of palettes){await p.select('#atelierPalette',palette);await audit(`converter ${width} ${palette} results`);assert.equal(await p.evaluate(()=>JSON.stringify(HQFConverter.state.result.hqf)),data,'appearance must not mutate content')}
  await p.select('#atelierPalette','ocean');await p.reload({waitUntil:'load'});assert.equal(await p.$eval('#atelierPalette',e=>e.value),'ocean');
  if(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed'))==='false')await p.click('[data-atelier-depth-toggle]');
  await p.click('[data-atelier-depth-toggle]');assert.equal(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed')),'false');assert.equal(await p.$eval('.desk-sigil-spark',e=>getComputedStyle(e).display),'none');
  await p.reload({waitUntil:'load'});assert.equal(await p.$eval('[data-atelier-depth-toggle]',e=>e.getAttribute('aria-pressed')),'false');await p.click('[data-atelier-depth-toggle]');
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.desk-sigil-front',e=>getComputedStyle(e).animationName),'none');await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await p.goto(base+'tarh-dars.html',{waitUntil:'load'});await p.evaluate(()=>{store.settings.theme='paper';themeApply()});await audit(`planner ${width} paper`);
  await p.locator('.atelier-theme-link').click();assert.equal(await p.$eval('#modal',e=>e.open),true);await p.evaluate(()=>document.getElementById('modal').close());
  for(const theme of await p.evaluate(()=>THEMES.map(t=>t[0]))){await p.evaluate(t=>{store.settings.theme=t;themeApply()},theme);await audit(`planner ${width} ${theme} appearance`,'.atelier-appearance')}
  await p.locator('#nav-bank').click();await p.locator('#nav-home').click();assert.equal(await p.$$eval('.desk-sigil',es=>es.length),1,'CSS mark survives rerender');
  assert.equal(await p.$$eval('.studio-gallery img',es=>es.length),0,'no hero artwork');
  assert.equal(await p.$eval('.desk-sigil-front',e=>getComputedStyle(e).animationIterationCount),'1','finite entrance, no perpetual animation');
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.desk-sigil-front',e=>getComputedStyle(e).animationName),'none');assert.equal(await p.$eval('.desk-sigil-front',e=>getComputedStyle(e).transform),'none');await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await p.evaluate(()=>{store.settings.theme='paper';themeApply()});await new Promise(r=>setTimeout(r,600));await p.screenshot({path:`reports/teacher-studios/appearance-planner-${width}.png`});
  await p.goto(base+'hqf-converter.html',{waitUntil:'load'});await p.select('#atelierPalette','garden');await new Promise(r=>setTimeout(r,600));await p.screenshot({path:`reports/teacher-studios/appearance-converter-${width}.png`});
  console.log(`PASS appearance ${width}: 7 palettes, 12 planner control palettes, axe, immutable content, reload, toggles, CSS mark rerender and reduced motion`);
 }
 // Failed storage must leave appearance controls usable and honest.
 const blocked=await b.newPage();blocked.on('pageerror',e=>errors.push(e.message));await blocked.setRequestInterception(true);blocked.on('request',r=>r.url().startsWith(base)?r.continue():r.abort());await blocked.evaluateOnNewDocument(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError')}});await blocked.goto(base+'hqf-converter.html',{waitUntil:'load'});await blocked.select('#atelierPalette','rose');assert.equal(await blocked.$eval('body',e=>e.dataset.atelierPalette),'rose');assert.match(await blocked.$eval('#atelierAppearanceStatus',e=>e.textContent),/ذخیره نشد/);await blocked.click('[data-atelier-depth-toggle]');assert.equal(await blocked.$eval('body',e=>e.dataset.atelierDepth),'off');await blocked.close();assert.deepEqual(errors,[]);
 // Do not bypass the worker here: these assets and interactions must survive real offline navigation.
 const offline=await b.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
 await offline.goto(base+'hqf-converter.html',{waitUntil:'load'});await offline.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready});await offline.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:60000});
 for(const asset of ['css/teacher-studios.css','js/teacher-studio-appearance.js','assets/teacher-studios/question-atelier.svg','assets/teacher-studios/lesson-atelier.svg','css/teacher-studios-pro.css','js/teacher-studio-pro.js','css/teacher-workdesk.css','js/teacher-workdesk.js','css/teacher-materials.css'])assert.ok(await offline.evaluate(async a=>!!await caches.match(a),asset),asset+' precached');
 await offline.setOfflineMode(true);
 for(const file of ['hqf-converter.html','tarh-dars.html']){await offline.goto(base+file,{waitUntil:'load'});await offline.waitForSelector('.desk-sigil');assert.equal(await offline.$$eval('.studio-gallery img',es=>es.length),0);assert.equal(await offline.$eval('.desk-sigil-sheet',e=>getComputedStyle(e).position),'absolute');await offline.click('[data-atelier-depth-toggle]');assert.equal(await offline.$eval('body',e=>e.dataset.atelierDepth),'off');await offline.click('[data-atelier-depth-toggle]');if(file.startsWith('hqf')){await offline.select('#atelierPalette','rose');assert.equal(await offline.$eval('body',e=>e.dataset.atelierPalette),'rose')}}
 await offline.close();assert.deepEqual(errors,[]);
 console.log('PASS appearance: failed storage stays usable; real SW offline materials/palettes/depth on both pages; no JS errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
