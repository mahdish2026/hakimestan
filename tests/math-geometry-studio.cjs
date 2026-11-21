// Geometry invariants + real-browser discovery/drag tests. All remote writes mocked.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../games/math-geometry/data.js');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('games/math-geometry/studio.js','utf8'),sandbox);
const S=sandbox.window.GeometryStudio;
for(const [shape,angle,expected] of [['square',90,true],['square',45,false],['rectangle',90,false],['rectangle',180,true],['triangle',120,true],['triangle',180,false],['triangle',240,true],['arrow',180,false],['arrow',360,true]])assert.equal(S.matches(shape,angle),expected,shape+' '+angle);
for(const t of D.stages[9].tasks){
 for(const transform of [p=>p,p=>[8-p[1],p[0]],p=>[8-p[0],8-p[1]],p=>[p[0],p[1]+1]]){
  const ps=t.expected.map(transform);if(ps.every(p=>p.every(v=>v>=0&&v<=8)))assert(D.correct(t,ps.reverse().map(D.key)),t.id+' rejects alternative/rotation/order');
 }
 assert(!D.correct(t,['1,1','2,2','3,3','4,4']));
 assert(!D.correct(t,['1,1','1,1','2,2','3,3']));
 assert(!D.correct(t,['0,0','8,0','8,8','4,1']),t.id+' accepts concave set');
}
assert(!D.correct(D.stages[9].tasks[1],['1,1','6,1','6,5','1,5']),'slanted task accepts rectangle');
assert(!D.correct(D.stages[9].tasks[3],['1,1','6,1','6,5','1,5']),'trapezoid accepts two parallel pairs');
assert(!D.geometry(['Infinity,2','2,2','3,3']));
const puppeteer=require('puppeteer-core'),chromium=require('@sparticuz/chromium').default;
(async()=>{const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-gpu'],headless:true});try{
const p=await browser.newPage();await p.setViewport({width:1440,height:1000});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setRequestInterception(true);p.on('request',r=>{if(r.url().startsWith('http://localhost:8000/'))return r.continue();if(r.url().startsWith('https://script.google'))return r.respond({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:'{"ok":true}'});if(/^(data:|blob:)/.test(r.url()))return r.continue();return r.abort();});
await p.goto('http://localhost:8000/games/math-geometry.html',{waitUntil:'networkidle0'});
await p.click('#discoveryBtn');assert(await p.$eval('#instrumentRange',e=>e.disabled));
for(const mode of ['mirror','center','rotation']){
 await p.click(`[data-mode="${mode}"]`);
 for(let i=0;i<S.experiments[mode].length;i++){
  const e=S.experiments[mode][i];assert(await p.$eval('#observeExperiment',e=>e.disabled));
  await p.click(`[data-predict="${i===0?1-e.answer:e.answer}"]`);await p.click('#observeExperiment');assert((await p.$eval('#experimentResult',e=>e.textContent)).includes('هنوز به زاویه'));
  if(mode==='mirror'&&i===0){await p.$eval('#instrumentRange',e=>{e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));});assert((await p.$eval('.fold-flap',e=>getComputedStyle(e).transform)).startsWith('matrix3d'));await p.screenshot({path:'reports/naghshestan/fold-3d.png',fullPage:true});}
  await p.click('#targetAngle');await p.click('#observeExperiment');assert((await p.$eval('#experimentResult',e=>e.textContent)).includes(e.explain));
  assert(await p.$eval('#observeExperiment',e=>e.disabled));
  if(mode==='rotation'&&i===2)await p.screenshot({path:'reports/naghshestan/rotation-lab.png',fullPage:true});
  if(i<S.experiments[mode].length-1)await p.click('#nextExperiment');
 }
}
assert.equal(await p.evaluate(()=>Object.keys(Naghshestan.profile.done).length),0,'discovery incorrectly awards game credit');
await p.click('#cameraToggle');assert.equal(await p.$eval('#cameraToggle',e=>e.getAttribute('aria-pressed')),'true');
for(const width of [320,360,768]){await p.setViewport({width,height:900,isMobile:false,hasTouch:false});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'studio overflows '+width);}
await p.setViewport({width:360,height:850,isMobile:false,hasTouch:false});await p.screenshot({path:'reports/naghshestan/studio-mobile.png',fullPage:true});
await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.experiment-plane',e=>getComputedStyle(e).transitionDuration),'0s');
await p.setViewport({width:1200,height:1000,isMobile:false,hasTouch:false});await p.click('#discoveryMap');await p.type('#playerName','معمار آزمایشی');await p.click('[data-stage="9"]');await p.click('#beginTasks');
// A translated rhombus, not the fixed answer in the data, must pass.
for(const k of ['1,3','7,3','4,1','4,5'])await p.click(`[data-point="${k}"]`);
assert((await p.$eval('#buildFacts',e=>e.textContent)).includes('مساحت'));
const position=async key=>p.$eval(`[data-point="${key}"]`,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
const from=await position('4,1'),to=await position('4,0');await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:8});await p.mouse.up();assert.equal(await p.$eval('[data-point="4,0"]',e=>e.getAttribute('aria-pressed')),'true');
await p.click('#checkBtn');assert(await p.$eval('#feedback',e=>e.classList.contains('error')));
await p.click('[data-point="4,0"]');await p.click('[data-point="4,1"]');await p.click('#checkBtn');assert(await p.$eval('#feedback',e=>e.classList.contains('success')),'alternative rhombus not accepted');
await p.click('#soundBtn');assert.equal(await p.$eval('#soundBtn',e=>e.getAttribute('aria-pressed')),'true');await p.click('#soundBtn');
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: 8 prediction/manipulation experiments; rotation vs central symmetry; 3D fold, flat view, 320/360/768 widths, reduced motion, multiple valid constructions, drag and diagnostic feedback.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
