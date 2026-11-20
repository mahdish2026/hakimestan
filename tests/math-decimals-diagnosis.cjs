const assert=require('node:assert/strict'),fs=require('node:fs'),D=require('../games/math-decimals/data.js'),X=require('../games/math-decimals/diagnose.js'),pup=require('puppeteer-core'),chromium=require('@sparticuz/chromium').default;
const all=D.stages.flatMap(s=>s.tasks);
assert.equal(all.length,76);assert.equal(all.filter(t=>t.teach).length,43);
assert.equal(all.filter(t=>t.kind==='choice').every(t=>Array.isArray(t.whyWrong)&&t.whyWrong.length===t.options.length&&!t.whyWrong[t.answer]),true,'every distractor needs an explanation');
assert.equal(D.parse('7/10'),null,'a slash must not be accepted as a decimal mark');
assert.equal(D.parse('۰٫۷'),700000);
const cases=[
 [{kind:'number',answer:'0.7'},'0.07','place_shift'],
 [{kind:'number',answer:'0.7'},'','format'],
 [{kind:'number',answer:'1.46',tags:['unit']},'146','unit_factor'],
 [{kind:'number',answer:'3500',tags:['unit']},'3.5','unit_factor'],
 [{kind:'number',answer:'1.46',tags:['unit']},'0.146','unit_factor'],
 [{kind:'number',answer:'0.08',tags:['multiply']},'8','decimal_places'],
 [{kind:'number',answer:'0.6',op:'+',b:'0.2'},'6','place_shift'],
 [{kind:'number',answer:'3.75',op:'+',b:'1.7'},'3.65','carry'],
 [{kind:'number',answer:'3.2',tags:['round']},'3.1','rounding'],
 [{kind:'number',answer:'0.5',common:[{v:'0.05',msg:'جای ممیز'}]},'0.05','common'],
 [{kind:'number',answer:'0.7'},'0.700001','generic']
];
for(const [task,raw,want] of cases)assert.equal(X.analyze(task,raw)?.code,want,`${raw} → ${want}`);
assert.equal(X.analyze({kind:'number',answer:'0.7'},'0.70'),null,'0.70 is correct');
assert.equal(X.analyze({kind:'number',answer:'0.7'},'7/10')?.code,'format');
assert.equal(X.analyze({kind:'choice',options:[],answer:0},0),null);
assert(X.catalog.place_shift.reteach.options.length>=2);
(async()=>{const b=await pup.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-gpu'],headless:true});try{const p=await b.newPage();require('./helpers/visible-click.cjs')(p);await p.setViewport({width:1200,height:950});const errors=[],reports=[];p.on('pageerror',e=>errors.push(e.message));await p.setRequestInterception(true);p.on('request',r=>{if(r.url().startsWith('http://localhost:8000/')||r.url().startsWith('data:'))return r.continue();if(r.url().includes('script.google')){try{reports.push(JSON.parse(r.postData()||'{}'));}catch{}return r.respond({status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:'{"ok":true}'});}return r.abort();});
await p.goto('http://localhost:8000/games/math-decimals.html',{waitUntil:'networkidle0'});await p.click('[data-stage="0"]');for(let i=0;i<3;i++)await p.click('#lessonNext');await p.click('[data-task="1"]');
await p.type('#answer','۰٫۰۷');await p.click('#check');
assert(await p.$('#feedback.error .remedy'),'remedy missing');
assert.match(await p.$eval('#feedback',e=>e.innerText),/ارزش مکانی/);
assert.equal(await p.$$eval('[data-remedy]',es=>es.length),2);
await p.click('[data-remedy="0"]');assert.match(await p.$eval('#remedyNote',e=>e.textContent),/درست است/);
await p.click('#retryFocus');await p.$eval('#answer',e=>e.select());await p.type('#answer','۰٫۷');await p.click('#check');assert(await p.$('#feedback.success'));assert.match(await p.$eval('#feedback',e=>e.textContent),/جبران/);
const profile=await p.evaluate(()=>JSON.parse(localStorage.getItem('hakim.decimals.v1.player.کاوشگر مهمان')));
assert.equal(profile.misconceptions.place_shift,1);assert.equal(profile.drafts.fraction.remedied,true);
const answerReport=reports.find(r=>r.action==='answer'&&r.question_id==='fraction'&&r.is_correct);assert.equal(answerReport.misconception,'place_shift');assert.equal(answerReport.remedied,true);
// choice diagnosis uses the specific distractor explanation
await p.click('[data-task="2"]');await p.click('[data-choice="0"]');await p.click('#check');assert.match(await p.$eval('#feedback',e=>e.textContent),/شش صدم/);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('hakim.decimals.v1.player.کاوشگر مهمان')).misconceptions.choice),1);
await p.click('[data-choice="1"]');await p.click('#check');assert(await p.$('#feedback.success'));
// a slash is rejected with a teaching message, not treated as a decimal
await p.click('[data-task="3"]');await p.type('#answer','7/10');await p.click('#check');assert.match(await p.$eval('#feedback',e=>e.textContent),/این نوشته عدد نیست/);
// the error diary returns on the map and the certificate counts recovery
await p.click('#mapBtn');assert(await p.$('.error-diary'));assert.match(await p.$eval('.error-diary',e=>e.textContent),/دفتر خطاهای من/);await p.click('#certBtn');assert.match(await p.$eval('.certificate',e=>e.textContent),/خطای تشخیص‌شده/);
assert.deepEqual(errors,[]);
await p.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});const r=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,h:v.nodes[0].html}))));
const out=fs.readFileSync('exports/memizestan.html','utf8');assert.match(out,/DecimalDiagnose/);assert.match(fs.readFileSync('sw.js','utf8'),/diagnose\.js/);
console.log('PASS: 9 diagnosis rules, 15 choice distractors explained, rejected slash input, misconception persistence/reporting, remediation micro-task, recovery message, error diary, certificate counts and axe.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
