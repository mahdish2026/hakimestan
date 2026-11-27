// Local-only teaching studio regression. Run the preview server on port 8000 first.
// npm install --no-save --package-lock=false puppeteer-core axe-core
// CHROME_PATH=/path/to/chrome node tests/darsgah-tools-browser.cjs
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const puppeteer = require('puppeteer-core');
const base = process.env.SITE_BASE || 'http://localhost:8000/';
const html = fs.readFileSync('darsgah.html', 'utf8');
for (const [i, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) new vm.Script(match[1], {filename:`darsgah-inline-${i}`});
// Test hooks live ONLY in the intercepted test response, never in production.
const hook = `window.__studioTest={
 ready:()=>!!pdfDoc&&!loadingBook&&!pageBusy,
 state:()=>state, page:()=>pageNumber, go:changePage,
 ink:()=>{const d=drawingCtx.getImageData(0,0,drawing.width,drawing.height).data;let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];return sum;},
 history:()=>{let bytes=0,count=0;for(const m of [undoStacks,redoStacks])for(const list of m.values())for(const e of list){bytes+=e.image?.data.byteLength||0;count++;}return {bytes,count};},
 timer:()=>lessonTimerMillis(),caption:()=>lessonCaption,laser:()=>!!laserPoint,
 expire:()=>{lessonTimer.accum=lessonTimer.total+1;lessonTimer.startTs=performance.now();drawFrame();},
 visits:()=>pageVisitLog,duration:elapsedNow,result:()=>({size:resultBlob?.size,visits:resultVisitLog}),
 snapshot:rememberInk,
 trimVisits:prunePageVisits,
 restore:restoreNotesPayload,
 exportNotes:serializeCurrentNotes
};\n`;
const instrumented = html.replace(' resetLessonTimer();renderBookmarks();', hook+' resetLessonTimer();renderBookmarks();');
assert.notEqual(instrumented, html, 'test injection anchor found');
// A valid small three-page PDF avoids large textbook downloads in CI.
function fixturePdf(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>'];
 for(let i=0;i<3;i++)objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << >> /Contents ${6+i} 0 R >>`);
 for(let i=0;i<3;i++){const content=`${.8-i*.2} .9 .8 rg 25 25 350 450 re f\n`;objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`);}
 let text='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(text);text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;text+=offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');text+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return [...Buffer.from(text)];
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),chromium=pkg?.default||pkg;
 const browser=await puppeteer.launch({pipe:true,executablePath:process.env.CHROME_PATH||await chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const errors=[];
 try{
  const page=await browser.newPage();await page.setViewport({width:1366,height:1000});await page.setBypassServiceWorker(true);
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.evaluateOnNewDocument(()=>localStorage.setItem('hk_no_stats','1'));
  await page.setRequestInterception(true);
  page.on('request',r=>{if(r.url()===base+'darsgah.html')return r.respond({status:200,contentType:'text/html; charset=utf-8',body:instrumented});if(/^https?:/.test(r.url())&&!r.url().startsWith(base))return r.abort();return r.continue();});
  await page.goto(base+'darsgah.html',{waitUntil:'networkidle0'});
  assert.ok(await page.evaluate(()=>!!window.__studioTest));
  const duplicates=await page.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,all)=>all.indexOf(id)!==i));assert.deepEqual(duplicates,[]);
  await page.evaluate(bytes=>{const input=document.querySelector('#fileInput'),dt=new DataTransfer();dt.items.add(new File([new Uint8Array(bytes)],'studio-test.pdf',{type:'application/pdf'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},fixturePdf());
  await page.waitForFunction(()=>window.__studioTest.ready(),{timeout:30000});
  await page.select('#quality','360');await page.waitForFunction(()=>__studioTest.ready());
  const ink=()=>page.evaluate(()=>__studioTest.ink());
  const click=async selector=>{await page.waitForFunction(sel=>{const e=document.querySelector(sel);return !!e&&!e.disabled;},{timeout:15000},selector);await page.evaluate(sel=>{const e=document.querySelector(sel),details=e?.closest('details');if(details)details.open=true;},selector);await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector);};
  const canvasPoint=async(drag=false)=>{
   await page.$eval('#previewCanvas',e=>e.scrollIntoView({block:'center'}));
   const box=await page.$eval('#previewCanvas',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
   const x=box.x+box.width*.4,y=box.y+box.height*.4;await page.mouse.move(x,y);await page.mouse.down();if(drag)await page.mouse.move(x+40,y+30,{steps:5});await page.mouse.up();
  };
  console.log('PDF loaded; checking ink tools');
  assert.equal(await ink(),0);
  await click('[data-tool="pen"]');await canvasPoint(true);let first=await ink();assert.ok(first>0,'pen draws');
  await click('#undoInk');assert.equal(await ink(),0,'undo removes stroke');await click('#redoInk');assert.equal(await ink(),first,'redo restores exact pixels');
  await page.keyboard.down('Control');await page.keyboard.press('KeyZ');await page.keyboard.up('Control');assert.equal(await ink(),0,'keyboard undo');
  await page.keyboard.down('Control');await page.keyboard.down('Shift');await page.keyboard.press('KeyZ');await page.keyboard.up('Shift');await page.keyboard.up('Control');assert.equal(await ink(),first,'keyboard redo');
  await click('[data-tool="shape"]');await click('[data-shape="rectangle"]');await canvasPoint(true);const shape=await ink();assert.ok(shape>first,'shape draws');await click('#undoInk');assert.equal(await ink(),first,'shape undo');
  await click('[data-tool="text"]');await canvasPoint();await page.waitForSelector('#canvasTextInput');await page.type('#canvasTextInput','test');await page.keyboard.press('Enter');assert.ok(await ink()>first,'text draws');await click('#undoInk');assert.equal(await ink(),first,'text undo');
  await click('[data-tool="sticker"]');await click('[data-sticker="⭐"]');await canvasPoint();assert.ok(await ink()>first,'sticker draws');await click('#undoInk');assert.equal(await ink(),first,'sticker undo');
  await click('[data-tool="highlighter"]');await canvasPoint(true);assert.ok(await ink()>first,'highlighter draws');await click('#undoInk');assert.equal(await ink(),first,'highlighter undo');
  await click('[data-tool="eraser"]');await canvasPoint(true);assert.ok(await ink()<first,'eraser removes ink');await click('#undoInk');assert.equal(await ink(),first,'eraser undo');
  await click('#clearPageInk');assert.equal(await ink(),0);await click('#undoInk');assert.equal(await ink(),first,'clear page can be undone');
  await click('[data-tool="laser"]');await canvasPoint(true);assert.equal(await ink(),first,'laser never changes notes');await page.waitForFunction(()=>!__studioTest.laser(),{timeout:5000,polling:100});assert.equal(await page.evaluate(()=>__studioTest.laser()),false,'laser fades');
  await page.evaluate(()=>__studioTest.go(2));assert.equal(await ink(),0,'page histories isolated');await page.evaluate(()=>__studioTest.go(1));assert.equal(await ink(),first,'ink restored on return');
  // Budget is shared across pages and undo/redo, rather than per page.
  await page.select('#quality','1080');await page.waitForFunction(()=>__studioTest.ready());await page.evaluate(()=>{for(let i=0;i<20;i++)__studioTest.snapshot();});const history=await page.evaluate(()=>__studioTest.history());assert.ok(history.bytes<=32*1024*1024&&history.count<12,'high-resolution history obeys shared byte budget');await page.select('#quality','360');await page.waitForFunction(()=>__studioTest.ready());first=await ink();
  console.log('Ink tools OK; checking lesson tools');
  await click('.ink-options [data-open="lessonToolsDialog"]');await click('#toggleBookmark');assert.equal(await page.$$eval('#lessonBookmarks button',es=>es.length),1);
  await page.select('#lessonTimerKind','down');await click('#lessonTimerToggle');await sleep(1100);assert.ok(await page.evaluate(()=>__studioTest.timer())>900);
  await click('#lessonTimerToggle');const paused=await page.evaluate(()=>__studioTest.timer());await sleep(250);assert.equal(await page.evaluate(()=>__studioTest.timer()),paused,'manual timer pause');
  await click('#lessonTimerToggle');await page.evaluate(()=>__studioTest.expire());assert.match(await page.$eval('#lessonTimerStatus',e=>e.textContent),/تمام/,'countdown expires once');
  await page.type('#lessonCaptionInput','پرسش امروز: چرا؟ <script>');await click('#applyLessonCaption');assert.equal(await page.evaluate(()=>__studioTest.caption()),'پرسش امروز: چرا؟ <script>','caption is plain canvas text');
  // Native editing undo should not be intercepted by the canvas shortcut.
  await page.focus('#lessonCaptionInput');await page.keyboard.down('Control');await page.keyboard.press('KeyZ');await page.keyboard.up('Control');assert.equal(await ink(),first);
  await page.select('#lessonTimerKind','up');await click('#lessonTimerToggle');await click('#lessonToolsDialog .dialog-footer [data-close]');
  // Download actions produce local blobs with appropriate formats.
  await page.evaluate(()=>{window.__downloads=[];HTMLAnchorElement.prototype.click=function(){window.__downloads.push({href:this.href,name:this.download});};});
  await click('#snapshotBtn');await page.waitForFunction(()=>window.__downloads.length===1);assert.match(await page.evaluate(()=>window.__downloads[0].name),/\.png$/);
  assert.equal(await page.evaluate(async()=>{const r=await fetch(window.__downloads[0].href);return (await r.blob()).type;}),'image/png');
  console.log('Lesson tools OK; checking real recording');
  await click('#micToggle');await click('#startBtn');await page.waitForFunction(()=>__studioTest.state()==='recording');await sleep(650);
  await page.evaluate(()=>__studioTest.go(2));await sleep(500);await click('#pauseBtn');await page.waitForFunction(()=>__studioTest.state()==='paused');
  const frozen=await page.evaluate(()=>__studioTest.timer());await sleep(400);assert.equal(await page.evaluate(()=>__studioTest.timer()),frozen,'recording pause freezes teaching timer');
  await page.evaluate(()=>__studioTest.go(3));await click('#pauseBtn');await sleep(550);await click('#stopBtn');await page.waitForSelector('#outputDialog[open]',{timeout:30000});
  const result=await page.evaluate(()=>__studioTest.result());assert.ok(result.size>0,'real MediaRecorder creates output');assert.deepEqual(result.visits.map(v=>v.page),[1,2,3]);assert.ok(result.visits[1].time>0&&result.visits[2].time>result.visits[1].time);
  await page.waitForFunction(()=>document.querySelector('#outputVideo').readyState>=2);
  const recordedOverlay=await page.evaluate(()=>{const v=document.querySelector('#outputVideo'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const g=c.getContext('2d');g.drawImage(v,0,0);const p=g.getImageData(Math.round(c.width/2),Math.round(c.height*.04),1,1).data;return p[0]<80&&p[1]<100&&p[2]<100;});
  assert.ok(recordedOverlay,'timer overlay is baked into actual video frames');
  assert.equal(await page.$$eval('#lessonRoute button',es=>es.length),3);await click('#lessonRoute button:nth-child(2)');await page.waitForFunction(()=>document.querySelector('#outputVideo').currentTime>0);
  await click('#downloadLessonRoute');assert.match(await page.evaluate(()=>window.__downloads[1].name),/\.txt$/);assert.match(await page.evaluate(async()=>await(await fetch(window.__downloads[1].href)).text()),/صفحهٔ ۳/);
  // Removed tails must not leave phantom chapter entries.
  await page.evaluate(()=>__studioTest.trimVisits(100));assert.deepEqual((await page.evaluate(()=>__studioTest.visits())).map(v=>v.page),[1]);
  await click('#outputDialog [data-close]');
  // Exercise both existing trim paths with the new timestamp log attached.
  for(const mode of ['fast','precise']){
   await page.evaluate(()=>__studioTest.go(1));await click('#startBtn');await page.waitForFunction(()=>__studioTest.state()==='recording');await sleep(500);
   await page.evaluate(()=>__studioTest.go(2));await sleep(500);await page.evaluate(()=>__studioTest.go(3));await sleep(500);await click('#pauseBtn');
   await click('#trimBtn');await page.waitForSelector('#trimDialog[open]');
   await click('input[name="trimMode"][value="'+mode+'"]');
   await page.evaluate(()=>{const visits=__studioTest.visits(),seconds=Math.ceil((__studioTest.duration()-visits[visits.length-1].time+50)/500)/2,e=document.querySelector('#trimSeconds');e.value=seconds;e.dispatchEvent(new Event('input',{bubbles:true}));});
   await click('#applyTrim');await page.waitForFunction(()=>!document.querySelector('#trimDialog').open,{timeout:30000});
   assert.ok(!(await page.evaluate(()=>__studioTest.visits())).some(v=>v.page===3),mode+' trim removes discarded chapter');
   await click('#stopBtn');await page.waitForSelector('#outputDialog[open]',{timeout:30000});assert.ok((await page.evaluate(()=>__studioTest.result())).size>0,mode+' trimmed output generated');
   assert.ok(!(await page.evaluate(()=>__studioTest.result())).visits.some(v=>v.page===3));await click('#outputDialog [data-close]');
  }
  await page.evaluate(()=>__studioTest.restore({pages:{}}));assert.equal(await page.$eval('#undoInk',e=>e.disabled),true,'restore invalidates old history');
  // Persistence, mobile overflow, modal access and focus-mode tools.
  console.log('Recording OK; checking persistence/mobile/a11y');
  await page.reload({waitUntil:'networkidle0'});
  await page.evaluate(bytes=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(bytes)],'studio-test.pdf',{type:'application/pdf'}));const e=document.querySelector('#fileInput');e.files=dt.files;e.dispatchEvent(new Event('change'));},fixturePdf());await page.waitForFunction(()=>__studioTest.ready());
  assert.equal(await page.$$eval('#bookmarkBar button',es=>es.length),1,'bookmarks survive reload');
  await page.setViewport({width:360,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no horizontal page overflow');
  await click('#focusBtn');await page.waitForFunction(()=>document.body.classList.contains('focus-mode'));await click('#focusPalette');await click('.ink-options [data-open="lessonToolsDialog"]');
  assert.ok(await page.$eval('#lessonToolsDialog',e=>e.open),'tools reachable in focus mode');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const a11y=await page.evaluate(async()=>{const r=await axe.run('#lessonToolsDialog',{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(a11y,[],'new dialog passes WCAG A/AA axe checks');
  fs.mkdirSync('reports',{recursive:true});await page.screenshot({path:'reports/darsgah-tools-mobile.png'});
  await click('#lessonToolsDialog .dialog-footer [data-close]');await page.keyboard.press('Escape');await page.setViewport({width:1366,height:1000});await page.screenshot({path:'reports/darsgah-tools-desktop.png',fullPage:true});
  assert.deepEqual(errors,[],'no JavaScript runtime errors');await page.close();
  console.log('Darsgah: real PDF, ink history, laser, bookmarks, timers, captions, PNG, MediaRecorder, chapters, mobile/focus and axe OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
