// Visual layout regressions: dossier masthead clearance and teaching desk hierarchy.
// Start `node tools/serve.cjs 8000 0.0.0.0`; set CHROME_PATH to a local Chromium.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const puppeteer=require('puppeteer-core');
const base=process.env.SITE_BASE||'http://localhost:8000/';
(async()=>{
 const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),chrome=pkg?.default||pkg;
 const browser=await puppeteer.launch({pipe:true,executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const errors=[];fs.mkdirSync('reports',{recursive:true});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
  await page.setRequestInterception(true);page.on('request',r=>/^https?:/.test(r.url())&&!r.url().startsWith(base)?r.abort():r.continue());
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  for(const width of [320,360,390,768,1366]){
   await page.setViewport({width,height:900});await page.goto(base+'judges.html',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
   for(const enlarged of [false,true]){
    await page.evaluate(big=>document.documentElement.style.fontSize=big?'200%':'',enlarged);
    const layout=await page.evaluate(()=>{const header=document.querySelector('#siteHeader').getBoundingClientRect(),cover=document.querySelector('.story-cover').getBoundingClientRect(),title=document.querySelector('#hero-title').getBoundingClientRect(),kicker=document.querySelector('.cover-kicker').getBoundingClientRect();return {header:header.bottom,cover:cover.top,title:title.top,kicker:kicker.top,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.ok(layout.cover>=layout.header,`dossier cover below header at ${width}, enlarged=${enlarged}: ${JSON.stringify(layout)}`);
    assert.ok(layout.title>layout.header&&layout.kicker>layout.header,'intro text entirely below header');assert.equal(layout.overflow,false,'dossier has no horizontal page overflow');
    if(!enlarged&&(width===390||width===1366))await page.screenshot({path:`reports/dossier-${width}.png`});
   }
   await page.evaluate(()=>document.documentElement.style.fontSize='');await page.click('.story-index a[href="#origin"]');
   await page.waitForFunction(()=>location.hash==='#origin');
   assert.ok(await page.$eval('#origin',e=>e.getBoundingClientRect().top>=0),'anchor heading not hidden behind masthead');
  }
  for(const width of [320,390,768,1366]){
   await page.setViewport({width,height:1000});await page.goto(base+'darsgah.html',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`studio no page overflow at ${width}`);
   assert.ok(await page.$eval('.steps',e=>getComputedStyle(e).display!=='none'),'onboarding visible on mobile too');
   assert.equal(await page.$eval('.camera-appearance',e=>e.open),false,'advanced camera settings start collapsed');
   await page.click('.camera-appearance summary');assert.equal(await page.$eval('.camera-appearance',e=>e.open),true);await page.click('.camera-appearance summary');
   await page.$eval('#bookFileMenu summary',e=>e.scrollIntoView({block:'center'}));await page.click('#bookFileMenu summary');assert.equal(await page.$eval('#bookFileMenu',e=>e.open),true);
   const menu=await page.$eval('.book-file-actions',e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});assert.ok(menu.left>=0&&menu.right<=menu.width,'file menu fits viewport');
   await page.keyboard.press('Escape');assert.equal(await page.$eval('#bookFileMenu',e=>e.open),false,'Escape dismisses file menu');
   await page.evaluate(()=>scrollTo(0,0));if(width===390||width===1366)await page.screenshot({path:`reports/studio-redesign-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('Dossier masthead clears content at 320–1366px and 200% text; studio responsive hierarchy and disclosure controls OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
