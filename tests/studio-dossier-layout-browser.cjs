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
    await page.evaluate(big=>{document.documentElement.style.fontSize=big?'200%':'';scrollTo(0,0);},enlarged);
    await page.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--story-header-height'))-document.querySelector('#siteHeader').getBoundingClientRect().height)<1);
    const layout=await page.evaluate(()=>{const header=document.querySelector('#siteHeader').getBoundingClientRect(),cover=document.querySelector('.story-cover').getBoundingClientRect(),title=document.querySelector('#hero-title').getBoundingClientRect(),kicker=document.querySelector('.cover-kicker').getBoundingClientRect();return {header:header.bottom,cover:cover.top,title:title.top,kicker:kicker.top,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.ok(layout.cover>=layout.header,`dossier cover below header at ${width}, enlarged=${enlarged}: ${JSON.stringify(layout)}`);
    assert.ok(layout.title>layout.header&&layout.kicker>layout.header,'intro text entirely below header');assert.equal(layout.overflow,false,'dossier has no horizontal page overflow');
    if(!enlarged&&(width===390||width===1366))await page.screenshot({path:`reports/dossier-${width}.png`});
    await page.evaluate(()=>scrollTo(0,700));
    await page.waitForFunction(()=>scrollY>=690);
    assert.ok(await page.$eval('#siteHeader',e=>Math.abs(e.getBoundingClientRect().top)<1),'masthead stays pinned while scrolling, including 200% text');
    await page.evaluate(()=>document.querySelector('.story-index a[href="#origin"]').click());
    await page.waitForFunction(()=>{const header=document.querySelector('#siteHeader').getBoundingClientRect(),target=document.querySelector('#origin').getBoundingClientRect();return target.top>=header.bottom&&target.top<=header.bottom+26;});
    if(!enlarged&&width===390)await page.screenshot({path:'reports/dossier-sticky-mobile.png'});
    await page.evaluate(()=>{history.replaceState(null,'',location.pathname);scrollTo(0,0);});
   }
   await page.evaluate(()=>document.documentElement.style.fontSize='');
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
  // Select themes through the real UI, then verify the whole hero palette and persistence.
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [390,1366]){
  await page.setViewport({width,height:1000});
  const palettes=[];
  for(const theme of ['orange','green','blue','purple']){
   await page.evaluate(()=>scrollTo(0,0));await page.click('#themeBtn');await page.click('[data-set-theme="'+theme+'"]');await page.click('#themeDialog [data-close]');
   const palette=await page.evaluate(()=>({background:getComputedStyle(document.querySelector('.intro')).backgroundColor,glow:getComputedStyle(document.querySelector('.intro'),'::before').backgroundImage,accent:getComputedStyle(document.querySelector('.intro h1 span')).color,button:getComputedStyle(document.querySelector('.desk-shortcuts .btn')).backgroundColor,number:getComputedStyle(document.querySelector('.intro .step.current .step-number')).backgroundColor}));
   for(const previous of palettes)for(const key of ['background','glow','accent','button','number'])assert.notEqual(palette[key],previous[key],`hero ${key} follows ${theme} theme`);
   palettes.push(palette);
   const contrast=await page.evaluate(async()=>{const r=await axe.run('.intro',{runOnly:['color-contrast']});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(contrast,[],theme+' hero contrast');
   await page.screenshot({path:`reports/studio-theme-${theme}-${width}.png`});
  }
  await page.reload({waitUntil:'networkidle0'});
  assert.equal(await page.$eval('html',e=>e.dataset.theme),'purple');
  assert.equal(await page.$eval('.intro',e=>getComputedStyle(e).backgroundColor),palettes[3].background,'hero restores saved theme');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  }
  assert.deepEqual(errors,[]);console.log('Dossier stays pinned without overlap at 320–1366px/200% text, anchors clear header; all four studio hero themes, persistence, contrast and disclosure controls OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
