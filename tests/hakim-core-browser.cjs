// Real-browser checks for the shared character on representative pages.
'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const axe=require('axe-core');
(async()=>{
  const pkg=process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome=pkg?.default||pkg;
  const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:chrome?.args||['--no-sandbox']});
  try {
    for(const width of [320,360,768,1366]) for(const theme of ['light','night']){
      const page=await browser.newPage(); await page.setViewport({width,height:900});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setBypassServiceWorker(true);
      await page.goto('http://localhost:8000/games/math-stats.html',{waitUntil:'load'});
      const data=await page.evaluate(theme=>{
        document.documentElement.dataset.theme=theme;
        const el=document.createElement('div'); el.id='testHakimMount';document.body.prepend(el);
        Hakim.init({container:el,font:false,autoHideMs:5000});
        Hakim.say('سلام! با هم مرحله به مرحله یاد می‌گیریم ✨',{mood:'happy',autoHide:false});
        const panel=el.querySelector('.hakim-panel'), face=el.querySelector('.hk-character');
        const standalone=document.querySelector('[data-hk-face] .hk-character');
        return {ready:Hakim.isReady(),face:!!face,standalone:!!standalone,
          text:el.querySelector('.hakim-text').textContent, sr:el.querySelector('.hakim-sr-only').textContent,
          anim:getComputedStyle(face.querySelector('.hk-body')).animationName,
          width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
          panelWidth:panel.getBoundingClientRect().width, bbox:face.getBoundingClientRect().width};
      },theme);
      assert.ok(data.ready && data.face && data.standalone);
      assert.equal(data.text,data.sr); assert.match(data.text,/مرحله به مرحله/);
      assert.equal(data.anim,'none','reduced motion applies to face SVG');
      assert.equal(data.width,data.viewport,`${width} ${theme}: no horizontal overflow`);
      assert.ok(data.panelWidth>0 && data.panelWidth<=width && data.bbox>0);
      await page.evaluate(axe.source);
      const violations=await page.evaluate(()=>axe.run(document.getElementById('testHakimMount'),{runOnly:['wcag2a','wcag2aa','wcag21aa']}));
      assert.deepEqual(violations.violations.map(v=>v.id),[],`${width} ${theme}: accessible companion`);
      await page.close();
    }
    for(const path of ['index.html','games/kohan-diyar.html','games/math-decimals.html','games/hakim-quest.html','games/farsi5-vocab.html']){
      const page=await browser.newPage(); const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://localhost:8000/'+path,{waitUntil:'load'});
      assert.equal(await page.evaluate(()=>typeof Hakim.renderFace),'function',path);
      const face=await page.evaluate(()=>{const host=document.createElement('div');Hakim.renderFace('curious',host);return !!host.querySelector('svg.hk-character');});
      assert.ok(face,path); assert.deepEqual(errors,[],path); await page.close();
    }
    console.log('Hakim browser: responsive, accessible, reduced motion and representative games OK');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
