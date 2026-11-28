require('./helpers/student-name.cjs');
// Certificate branding, printing and the legacy canvas export work offline.
'use strict';
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const base = 'http://localhost:8000/';
(async () => {
  const pkg = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chromium = pkg?.default || pkg;
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || await chromium.executablePath(), args: chromium?.args || ['--no-sandbox']});
  try {
    for (const width of [360, 1366]) {
      const page = await browser.newPage();
      await page.setViewport({width, height:900});
      await page.setBypassServiceWorker(true);
      await page.goto(base + 'masir-yadgiri.html', {waitUntil:'load'});
      await page.click('[data-view="certificate"]');
      const grand = await page.$eval('.cert-sheet', el => ({logo:el.querySelector('.hk-cert-brand')?.naturalWidth, old:!!el.querySelector('.hw-sign, .hw-seal'), text:el.textContent}));
      assert.ok(grand.logo > 0, 'grand certificate logo loads');
      assert.equal(grand.old, false, 'no stamp or handwritten signature on grand certificate');
      assert.match(grand.text,/طراحی و توسعه: مهدی شریفیان/);
      await page.evaluate(()=>window.HakimCert.preparePrint());
      const pdf = Buffer.from(await page.pdf({format:'A4', printBackground:true}));
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1, 'grand certificate prints on one page');
      if (width === 1366) { fs.mkdirSync('reports',{recursive:true}); await page.evaluate(()=>window.HakimCert.cleanupPrint()); await page.$eval('.cert-sheet',e=>e.scrollIntoView({block:'end'})); await page.screenshot({path:'reports/certificate-brand.png'}); }
      await page.close();
    }
    const page = await browser.newPage();
    await page.setViewport({width: 1366, height: 900});
    await page.goto(base + 'cert-studio.html',{waitUntil:'load'});
    const studio = await page.evaluate(()=>({logo:document.querySelector('img.c-logo')?.naturalWidth, signers:S.signers.map(s=>s.on)}));
    assert.ok(studio.logo > 0, 'new studio designs start with the official logo');
    assert.ok(studio.signers.every(on=>!on), 'no default signatures on a new design');
    await page.goto(base + 'games/math-stats.html',{waitUntil:'load'});
    const shared = await page.evaluate(()=>{
      const host=document.createElement('div'); document.body.appendChild(host);
      HakimCert.mount(host,{name:'آزمون',world:'آمارستان',program:'آمارستان',achievement:'تلاش'});
      const el=host.querySelector('.hk-a4'); return {logo:!!el.querySelector('.hk-a4-sign .hk-logo'),stamp:!!el.querySelector('.hk-a4-seal'),text:el.textContent};
    });
    assert.ok(shared.logo); assert.equal(shared.stamp,false); assert.match(shared.text,/طراحی و توسعه: مهدی شریفیان/);
    await page.goto(base + 'games/kohan-diyar.html',{waitUntil:'load'});
    await page.evaluate(()=>{document.querySelector('#intro-screen').style.display='none';state.score=4;state.conqueredCities=[0];state.badges=[];});
    const result = await page.evaluate(async()=>{
      const logo=document.querySelector('#certificateContent .hk-cert-brand');
      const old=!!document.querySelector('#certificateContent .cert-seal');
      const original=CanvasRenderingContext2D.prototype.drawImage; let drawn=false;
      CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img.src && img.src.includes('hakimestan-logo-stacked.svg')) drawn=true;return original.call(this,img,...args)};
      try {const canvas=await drawCertificateCanvas();return {drawn,old,loaded:logo.complete && logo.naturalWidth>0,width:canvas.width};}
      finally {CanvasRenderingContext2D.prototype.drawImage=original;}
    });
    assert.equal(result.old,false); assert.ok(result.loaded); assert.ok(result.drawn,'PNG export draws the official logo'); assert.ok(result.width>1000);
    await page.goto(base + 'games/farsi5-vocab.html',{waitUntil:'load'});
    const vocab = await page.evaluate(async()=>{
      const original=CanvasRenderingContext2D.prototype.drawImage, click=HTMLAnchorElement.prototype.click; let drawn=false, downloaded=false;
      CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img.src && img.src.includes('hakimestan-logo-stacked.svg')) drawn=true;return original.call(this,img,...args)};
      HTMLAnchorElement.prototype.click=function(){downloaded=true}; window.html2canvas=undefined;
      try {await App.downloadCertificateImage(); return {drawn,downloaded};}
      finally {CanvasRenderingContext2D.prototype.drawImage=original; HTMLAnchorElement.prototype.click=click;}
    });
    assert.ok(vocab.drawn && vocab.downloaded, 'vocabulary fallback PNG includes logo');
    await page.close();
    console.log('Certificate branding: grand print, shared certificate and Kohan PNG OK');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
