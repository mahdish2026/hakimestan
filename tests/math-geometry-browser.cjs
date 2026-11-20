// Start a static server on port 8000; install puppeteer-core and @sparticuz/chromium.
// All reporting endpoints are intercepted: this test never writes real student data.
const puppeteer=require('puppeteer-core'),chromium=require('@sparticuz/chromium').default;
const assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../games/math-geometry/data.js');
(async()=>{
 const trace=(s)=>{if(process.env.TRACE_GEOMETRY)console.log('[geometry]',s);};
 const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-gpu'],headless:true,protocolTimeout:15000});
 try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 const errors=[],reports=[],missing=[];let failReports=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('localhost')&&r.status()>=400)missing.push(r.url());});
 const originalClick=page.click.bind(page);page.click=async(selector,options)=>{await page.$eval(selector,e=>{if(!e.closest('.topbar'))e.scrollIntoView({block:'center',behavior:'instant'});});return originalClick(selector,options);};await page.setRequestInterception(true);page.on('request',r=>{if(/^https?:\/\/localhost:8000\//.test(r.url()))return r.continue();if(r.url().includes('script.google')){try{reports.push(JSON.parse(r.postData()||'{}'));}catch{};return failReports?r.abort('failed'):r.respond({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:'{"ok":true}'});}if(r.url().startsWith('data:')||r.url().startsWith('blob:'))return r.continue();r.abort();});
 const url='http://localhost:8000/games/math-geometry.html';await page.goto(url,{waitUntil:'networkidle0'});await page.evaluate(()=>navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))));
 fs.mkdirSync('reports/naghshestan',{recursive:true});
 if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/map-desktop.png',fullPage:true});
 await page.click('#certBtn');assert.equal(await page.$$eval('.cert-list li.done',e=>e.length),0);assert.equal(await page.$$eval('.cert-list li',e=>e.length),12);
 await page.click('#certMap');await page.type('#playerName','آزمون نقشستان');await page.click('#startForm button');
 if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/lesson-desktop.png',fullPage:true});
 // Reveal must not award credit.
 await page.click('#beginTasks');await page.click('#revealBtn');assert.equal(await page.evaluate(()=>Object.keys(Naghshestan.profile.done).length),0);assert(await page.$eval('#checkBtn',el=>el.disabled));await page.click('#tryAgain');
 for(let si=0;si<D.stages.length;si++){
  if(si>0){await page.click('#nextStage');await page.click('#beginTasks');}
  trace('stage '+si);const s=D.stages[si];
  for(let qi=0;qi<s.tasks.length;qi++){
   trace(`question ${si}:${qi}`);const t=s.tasks[qi];
   if(si===0&&qi===0){await page.click('[data-point="0,0"]');await page.click('#checkBtn');assert.equal(await page.evaluate(()=>Object.keys(Naghshestan.profile.done).length),0);await page.click('#clearGrid');}
   if(t.type==='grid')for(const p of t.expected)await page.click(`[data-point="${p.join(',')}"]`);
   else if(t.type==='number'){await page.type('#numberInput',String(t.answer).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]));}
   else if(t.type==='angle')await page.$eval('#angleRange',(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},t.answer);
   else if(t.type==='axes')for(const a of t.answer)await page.click(`[data-axis="${a}"]`);
   else if(t.type==='properties')for(const a of t.answer)await page.click(`[data-choice="${a}"]`);
   else await page.click(`[data-choice="${t.answer}"]`);
   await page.click('#checkBtn');assert(await page.$eval('#feedback',e=>e.classList.contains('success')),t.id+' UI answer rejected');
   if(si===1&&qi===1)if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/mirror-desktop.png',fullPage:true});
   await page.click('#nextBtn');
  }
 }
 assert.equal(await page.evaluate(()=>Object.keys(Naghshestan.profile.done).length),48);
 trace('certificate');await page.click('#finishCert');assert.equal(await page.$$eval('.cert-list li.done',e=>e.length),12);
 if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/certificate.png',fullPage:true});trace('pdf');await page.pdf({path:'reports/naghshestan/certificate.pdf',format:'A4',printBackground:true});
 trace('reload');await page.reload({waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>Object.keys(Naghshestan.profile.done).length),48);
 trace('profiles');
 // Names have separate progress.
 await page.$eval('#playerName',el=>el.value='بازیکن دیگر');await page.click('#startForm button');assert.equal(await page.evaluate(()=>Object.keys(Naghshestan.profile.done).length),0);
 trace('reports');
 // Failed reports remain pending, and only server acknowledgement drains the queue.
 failReports=true;await page.click('#beginTasks');await page.click('[data-point="6,2"]');await page.click('#checkBtn');await new Promise(r=>setTimeout(r,150));assert((await page.evaluate(()=>Naghshestan.queue.length))>0);
 failReports=false;await page.evaluate(()=>Naghshestan.flush());assert.equal(await page.evaluate(()=>Naghshestan.queue.length),0);
 trace('mobile');
 // Small touch viewport: no horizontal overflow; construction controls still work.
 await page.setViewport({width:360,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:1});await page.click('#mapBtn');if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/map-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.click('#workshopBtn');await page.select('#paintMode','both');await page.click('[data-cell="1,2"]');assert.equal(await page.$$eval('.paint-cell.on',e=>e.length),4);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.click('#artMap');
 await page.click('[data-stage="9"]');await page.click('#beginTasks');if(!process.env.SKIP_SCREENSHOTS)await page.screenshot({path:'reports/naghshestan/build-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.select('#coordX','1');await page.select('#coordY','4');await page.click('#togglePoint');assert.equal(await page.$eval('[data-point="1,4"]',el=>el.getAttribute('aria-pressed')),'true');
 await page.click('#certBtn');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Service-worker offline fallback is not used here: verify cached game itself offline after first load.
 await page.setOfflineMode(true);await page.click('#certMap');await page.click('[data-stage="0"]');await page.click('#beginTasks');assert(await page.$('#board'));await page.setOfflineMode(false);
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(missing.length,0,missing.join('\n'));
 assert(reports.some(x=>x.action==='logVisit'&&x.page==='games/math-geometry.html'));
 assert(reports.some(x=>x.action==='answer'&&x.game_id==='math-geometry'));
 assert.equal(reports.filter(x=>x.action==='session').length,12);
 console.log('PASS: real Chromium, 48 tasks solved through UI, empty/full certificate, PDF, persistence, separate players, report acknowledgement/retry, 360px touch layout, offline in-page play.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
