// Start: node tools/serve.cjs 8000 0.0.0.0
// npm install --no-save --package-lock=false puppeteer-core @sparticuz/chromium
// Remote calls intercepted: these screenshots contain fictional test data only.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pup=require('puppeteer-core');
const base=process.env.BASE_URL||'http://localhost:8000/';
const widths=process.env.VIEWPORT_WIDTHS?.split(',').map(Number);
const sizes=[[1440,1000],[1024,900],[768,1024],[390,844],[320,740]].filter(v=>!widths||widths.includes(v[0]));
(async()=>{
 const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium');const chrome=pkg?.default||pkg;
 const browser=await pup.launch({executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:chrome?.args||['--no-sandbox'],headless:true});
 fs.mkdirSync('reports/teacher-workspace',{recursive:true});
 try{
  for(const [width,height]of sizes){
   const p=await browser.newPage();await p.setViewport({width,height,deviceScaleFactor:1});
   const errors=[],missing=[],actions=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url())});
   await p.setBypassServiceWorker(true);
   await p.evaluateOnNewDocument(()=>{localStorage.clear();localStorage.setItem('hk_no_stats','1')});
   await p.setRequestInterception(true);
   p.on('request',r=>{
    if(r.isNavigationRequest()&&r.url()===new URL('index.html',base).href)return r.respond({status:200,contentType:'text/html',body:'<!doctype html><html lang="fa"><title>لابی آزمایشی</title><h1>لابی آزمایشی</h1></html>'});
    if(r.url().startsWith(base))return r.continue();
    if(r.url().includes('script.google.com')){
     const body=JSON.parse(r.postData()||'{}');actions.push(body.action);let data={ok:true};
     if(body.action==='tpLogin')data=body.password==='wrong'?{ok:false,error:'رمز آزمایشی نادرست است'}:{ok:true,token:'fictional-token',username:'معلم آزمایشی'};
     if(body.action==='tpGetStats')data={ok:true,stats:{total:1248,today:36,week:218,avgScore:82,topStudents:[{name:'سارا احمدی',count:24,avgScore:95,best:100},{name:'آراد محمدی',count:21,avgScore:92,best:98},{name:'نگار رضایی',count:18,avgScore:90,best:96},{name:'علی کریمی',count:16,avgScore:88,best:94}],byGame:[{game:'math-fasl2',count:90},{game:'math-decimals',count:75},{game:'math-geometry',count:55},{game:'farsi5-vocab',count:42}]}};
     if(body.action==='tpGetResults')data={ok:true,results:Array.from({length:137},(_,i)=>({id:'r'+i,student:'دانش‌آموز آزمایشی '+i,game:'math-fasl2',score:i,completed:i%3===0,date:'2026-11-27',details:'{"stage":1}'}))};
     if(body.action==='tpClassGetAll')data={ok:true,data:{classes:[],students:[],grades:[]}};
     return r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
    }
    return r.abort();
   });
   await p.goto(base+'panels/teacher.html',{waitUntil:'networkidle0'});
   await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.$eval('.teacher-login-art',e=>e.complete&&e.naturalWidth>0),true);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'login overflow');
   assert.equal(await p.$eval('#loginView .login-wordmark',e=>e.getAttribute('href')),'../index.html');
   const checkLobby=async id=>{const box=await p.$eval(id,e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right,text:e.textContent.trim(),href:e.getAttribute('href'),display:getComputedStyle(e).display,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundImage,radius:getComputedStyle(e).borderRadius,label:e.getAttribute('aria-label'),textDisplay:getComputedStyle(e.querySelector('.btl-text')).display}});assert.equal(box.text,'بازگشت به لابی');assert.equal(box.href,'../index.html');assert.ok(box.w>0&&box.h>=44&&box.left>=0&&box.right<=width,`${width}: visible touch-sized lobby link ${id}`);assert.notEqual(box.display,'none');assert.equal(box.color,'rgb(255, 217, 138)');assert.ok(box.bg.includes('rgb(36, 95, 97)')&&box.bg.includes('rgb(16, 57, 70)'),'shared lobby gradient');assert.equal(box.label,'بازگشت به لابی حکیمستان');if(width<=600){assert.equal(box.radius,'50%');assert.equal(box.textDisplay,'none');assert.ok(box.w<=48)}else{assert.equal(box.radius,'14px');assert.notEqual(box.textDisplay,'none')}};
   await checkLobby('#loginLobbyLink');
   await p.screenshot({path:`reports/teacher-workspace/login-${width}.png`,fullPage:true});
   await p.type('#passIn','wrong');await p.click('#btnLogin');await p.waitForFunction(()=>document.getElementById('loginAlert').textContent.includes('نادرست'));
   assert.equal(await p.$eval('#appShell',e=>e.classList.contains('hidden')),true);
   await p.$eval('#passIn',e=>e.value='');
   await p.type('#passIn','fictional-password');await p.click('#btnLogin');await p.waitForFunction(()=>!document.getElementById('appShell').classList.contains('hidden'));
   await p.waitForFunction(()=>document.getElementById('dashboardUpdated').textContent.includes('به‌روز'));
   await p.evaluate(()=>document.fonts.ready);
   await checkLobby('#panelLobbyLink');
   assert.equal(await p.$eval('#heroTeacherName',e=>e.textContent),'معلم آزمایشی');
   assert.equal(await p.$eval('#hakimMount',e=>e.classList.contains('hidden')),true,'companion must not obscure reports on login');
   assert.equal(await p.$$eval('.teacher-meter',es=>es.length),4);
   await p.click('#btnTeacherGuide');await p.waitForFunction(()=>document.getElementById('btnTeacherGuide').getAttribute('aria-expanded')==='true');
   await p.keyboard.press('Escape');assert.equal(await p.$eval('#hakimMount',e=>e.classList.contains('hidden')),true);
   await p.click('#btnTheme');await p.waitForSelector('#themePanel:not(.hidden)');await p.click('.theme-choice[data-theme="forest"]');assert.equal(await p.evaluate(()=>document.body.dataset.theme),'forest');await p.keyboard.press('Escape');assert.equal(await p.$eval('#themePanel',e=>e.classList.contains('hidden')),true);
   await p.locator('.hero-actions [data-go="games"]').click();await p.waitForSelector('#scGames:not(.hidden)');
   await p.locator('.nav-btn[data-screen="dashboard"]').click();await p.waitForSelector('#scDashboard:not(.hidden)');await p.waitForFunction(()=>document.querySelectorAll('.teacher-meter').length===4);
   for(const theme of ['indigo','purple','forest','morning','pink','blue']){
    await p.evaluate(t=>applyTheme(t),theme);
    const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,body:document.documentElement.scrollWidth,width:innerWidth}));
    assert.equal(layout.overflow,false,`${width}/${theme}: horizontal page overflow ${JSON.stringify(layout)}`);
   }
   await p.evaluate(()=>applyTheme('blue'));
   await p.evaluate(()=>new Promise(resolve=>setTimeout(resolve,450)));
   await p.evaluate(()=>{if(window.Hakim&&typeof Hakim.hide==='function')Hakim.hide()});
   await p.screenshot({path:`reports/teacher-workspace/dashboard-${width}.png`,fullPage:true});
   await p.evaluate(()=>applyTheme('indigo'));await p.screenshot({path:`reports/teacher-workspace/dashboard-dark-${width}.png`,fullPage:true});await p.evaluate(()=>applyTheme('blue'));
   await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.teacher-hero-visual img',e=>getComputedStyle(e).animationName),'none');
   await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
   for(const name of ['users','teachers','stats','settings']){await p.locator(`.nav-btn[data-screen="${name}"]`).click();await p.waitForFunction(n=>!document.getElementById('sc'+n.charAt(0).toUpperCase()+n.slice(1)).classList.contains('hidden'),{},name);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}/${name}: overflow`)}
   await p.locator('#btnDaftarNav').click();await p.waitForSelector('#dkOverlay');await p.click('#dkClose');
   // All sidebar destinations remain reachable, even at 320px.
   const nav=p.locator('.nav-btn[data-screen="results"]');
   await nav.click();await p.waitForSelector('#resultsNext',{timeout:10000}).catch(async e=>{console.error({width,errors,actions,dom:await p.evaluate(()=>({screen:document.getElementById('pageTitle').textContent,alert:document.getElementById('resultsAlert').textContent,results:document.getElementById('resultsInfo').textContent,dk:!!document.getElementById('dkOverlay'),modal:document.querySelectorAll('.modal-backdrop:not(.hidden)').length}))});throw e});
   assert.equal(await p.$eval('#resultsTable tbody',el=>el.children.length),50);
   await p.screenshot({path:`reports/teacher-workspace/results-${width}.png`,fullPage:true});
   await p.click('#resultsNext');assert.equal(await p.$eval('#resultsTable .detail-result',el=>el.dataset.idx),'50');
   if(width>700)await p.click('#resultsTable .detail-result');else await p.click('#resultCards .detail-result');
   await p.waitForFunction(()=>!document.getElementById('detailModal').classList.contains('hidden'));
   const dialog=await p.evaluate(()=>({focused:document.getElementById('detailModal').contains(document.activeElement),label:document.querySelector('#detailModal [role="dialog"]').getAttribute('aria-labelledby')}));
   assert.ok(dialog.focused&&dialog.label,'dialog must have a name and receive keyboard focus');
   await p.keyboard.press('Escape');assert.ok(await p.$eval('#detailModal',el=>el.classList.contains('hidden')));
   // Explicitly place focus at final button and verify the trap wraps.
   await p.evaluate(()=>{showDetails(50)});await p.waitForFunction(()=>document.getElementById('detailModal').contains(document.activeElement));
   await p.focus('#detailModal .btn[data-close-detail]');await p.keyboard.press('Tab');
   assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('#detailModal button')),true);
   await p.keyboard.press('Escape');
   await checkLobby('#panelLobbyLink');
   // Follow the real anchor in each view; only the destination response is mocked.
   await Promise.all([p.waitForNavigation(),p.click('#panelLobbyLink')]);assert.equal(p.url(),new URL('index.html',base).href);
   await p.goto(base+'panels/teacher.html',{waitUntil:'networkidle0'});await p.type('#passIn','fictional-password');await p.click('#btnLogin');await p.waitForSelector('#appShell:not(.hidden)');
   await p.click('#btnTeacherGuide');
   await p.evaluate(()=>document.getElementById('btnLogout').click());assert.equal(await p.$eval('#hakimMount',e=>e.classList.contains('hidden')),true,'logout closes guidance');assert.equal(await p.$eval('#resultsTable',el=>el.textContent),'');
   assert.equal(await p.$eval('#heroTeacherName',e=>e.textContent),'معلم عزیز');
   await Promise.all([p.waitForNavigation(),p.click('#loginLobbyLink')]);assert.equal(p.url(),new URL('index.html',base).href);
   assert.deepEqual(missing,[],`${width}: missing asset`);
   assert.deepEqual(errors,[],`${width}: browser errors`);
   console.log(`PASS ${width}×${height}: 6 themes, illustrated studio/login, opt-in guide, all navigation, no overflow, results paging, dialog focus/Escape/Tab, logout`);
   await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
