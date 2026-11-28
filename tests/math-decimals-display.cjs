require('./helpers/student-name.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('../games/math-decimals/presentation.js'),D=require('../games/math-decimals/data.js'),pup=require('puppeteer-core'),chromium=require('@sparticuz/chromium').default;
// 1) A token becomes a stacked fraction; a plain slash stays prose and is escaped, never a decimal.
const html=P.rich('کسر ⟦۷|۱۰⟧ برابر ۰٫۷ است.');
assert.match(html,/class="fraction"/);assert.match(html,/aria-label="۷ روی ۱۰"/);assert.match(html,/fraction-top">۷</);assert.match(html,/fraction-bottom">۱۰</);
assert(!html.includes('۷/۱۰'));assert.equal(P.plain('کسر ⟦۷|۱۰⟧'),'کسر ۷ روی ۱۰');
assert.equal(P.rich('<img src=x>'),'&lt;img src=x&gt;');
const slash=P.rich('۳/۱۰');assert.equal(slash.replace(/<[^>]+>/g,''),'۳/۱۰');assert.equal(slash.includes('fraction'),false,'a slash must not become a stacked fraction');
assert.match(P.rich('کدام عدد با ۰٫۶ برابر است؟'),/<bdi dir="ltr" class="math-expression">۰٫۶<\/bdi>/,'a bare decimal needs LTR isolation');
assert.equal((P.rich('۰٫۸۲۰ − ۰٫۴۵۶').match(/math-expression/g)||[]).length,1,'one expression, one isolation box');
assert.equal((P.rich('عدد بعدی الگو: ۲٫۱۳۷، ۲٫۱۳۸، ۲٫۱۳۹، …').match(/math-expression/g)||[]).length,1,'a comma-separated pattern needs one LTR box');assert.match(P.rich('عدد بعدی الگو: ۲٫۱۳۷، ۲٫۱۳۸، ۲٫۱۳۹، …'),/<bdi dir="ltr" class="math-expression math-sequence">۲٫۱۳۷، ۲٫۱۳۸، ۲٫۱۳۹، …<\/bdi>/,'the whole sequence must read left-to-right');assert.equal((P.rich('۰٫۴۰، ۰٫۳۵، ۰٫۳۰').match(/math-expression/g)||[]).length,1,'a descending pattern is one sequence, not three boxes');
assert.equal(/math-expression/.test(P.rich('⟦۷|۱۰⟧')),false,'fraction digits stay inside the stacked token');
// 2) No lesson prose still hides a fraction behind a slash.
const texts=D.stages.flatMap(s=>[s.intro,s.example,...s.steps,...s.tasks.flatMap(t=>[t.prompt,t.why,t.teach,...(t.options||[])])].filter(Boolean)).join('\n');
assert.equal(/[۰-۹0-9]+\s*\/\s*[۰-۹0-9]+/.test(texts),false,'raw slash fraction found');
assert.match(texts,/⟦۳\|۱۰⟧/);
(async()=>{const b=await pup.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-gpu'],headless:true});try{const p=await b.newPage();require('./helpers/visible-click.cjs')(p);await p.setViewport({width:1200,height:900});
await p.setRequestInterception(true);p.on('request',r=>r.url().startsWith('http://localhost:8000/')||r.url().startsWith('data:')?r.continue():r.abort());await p.goto('http://localhost:8000/games/math-decimals.html',{waitUntil:'networkidle0'});
const fontOf=sel=>p.$eval(sel,e=>parseFloat(getComputedStyle(e).fontSize));
assert.equal(await p.$('#focusView'),null,'retired layout toggle must stay removed');
const base=await fontOf('.station h3');
assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'معمولی');
assert.equal(await p.$eval('#textSmaller',e=>e.disabled),false);
await p.click('#textSmaller');assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'کوچک');assert(await p.$eval('#textSmaller',e=>e.disabled));
const small=await fontOf('.station h3');assert(small<base,`${small}<${base}`);
await p.click('#textLarger');await p.click('#textLarger');assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'بزرگ');
const larger=await fontOf('.station h3');assert(larger>base,`${larger}>${base}`);
await p.click('#textLarger');assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'بزرگ‌تر');assert(await p.$eval('#textLarger',e=>e.disabled));
const max=await fontOf('.station h3');assert(max>larger);
assert.match(await p.evaluate(()=>localStorage.getItem('hakim.decimals.display.v1')),/"size":3/);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'desktop overflow at largest text');
// dark theme survives reload and updates the browser chrome colour
assert.equal(await p.$eval('#themeToggle',e=>e.getAttribute('aria-pressed')),'false');
await p.click('#themeToggle');assert.equal(await p.$eval('html',e=>e.dataset.theme),'dark');assert.equal(await p.$eval('meta[name=theme-color]',e=>e.content),'#141220');
const bg=await p.$eval('body',e=>getComputedStyle(e).backgroundColor);assert.match(bg,/rgb\(20, 18, 32\)/);
await p.reload({waitUntil:'networkidle0'});assert.equal(await p.$eval('html',e=>e.dataset.theme),'dark');assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'بزرگ‌تر');
// lesson fraction: numerator sits above denominator with a real rule between them
await p.click('[data-stage="0"]');await p.waitForTimeout?.(0);
const fr=await p.$eval('.diagram-values .fraction',e=>{const top=e.querySelector('.fraction-top'),bottom=e.querySelector('.fraction-bottom').getBoundingClientRect(),t=top.getBoundingClientRect(),cs=getComputedStyle(top);return {above:t.bottom<=bottom.top+1,rule:parseFloat(cs.borderBottomWidth),label:e.getAttribute('aria-label'),text:e.textContent};});
assert.equal(fr.above,true);assert.equal(fr.rule,2);assert.equal(fr.label,'۳ روی ۱۰');assert.equal(fr.text,'۳۱۰');
// the fraction inside a task title is stacked too and never shows a slash
await p.click('#lessonNext');await p.click('#lessonNext');await p.click('#lessonNext');await p.click('[data-task="1"]');const title=await p.$eval('.task-title',e=>({html:e.innerHTML,text:e.textContent}));assert.match(title.html,/class="fraction"/);assert.equal(title.text.includes('/'),false);
// motion preference is a real CSS state
await p.click('#motionToggle');assert.equal(await p.$eval('html',e=>e.dataset.motion),'off');assert.equal(await p.$eval('.paper',e=>getComputedStyle(e).animationName==='none'),true);
await p.reload({waitUntil:'networkidle0'});assert.equal(await p.$eval('#motionToggle',e=>e.getAttribute('aria-pressed')),'false');assert.match(await p.evaluate(()=>localStorage.getItem('hakim.decimals.display.v1')),/"motion":false/);
await p.click('#displayReset');assert.equal(await p.$eval('#textSizeLevel',e=>e.textContent),'معمولی');assert.equal(await p.$eval('html',e=>e.dataset.theme),'light');assert.equal(await p.$eval('#motionToggle',e=>e.getAttribute('aria-pressed')),'true');assert.equal(await p.$eval('meta[name=theme-color]',e=>e.content),'#282544');
// axe in both themes and on a narrow enlarged dark screen
await p.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
const audit=async()=>p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
let r=await audit();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,n:v.nodes.map(n=>n.html).slice(0,3)}))));
await p.click('#themeToggle');r=await audit();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,n:v.nodes.map(n=>n.html).slice(0,2)}))));
await p.setViewport({width:390,height:844});await p.click('#textLarger');await p.click('#textLarger');await p.waitForTimeout?.(0);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile overflow with enlarged dark text');
r=await audit();assert.equal(r.violations.length,0,JSON.stringify(r.violations.map(v=>({id:v.id,n:v.nodes.map(n=>n.html).slice(0,2)}))));
// the controls remain reachable with a real pointer below the sticky header
await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.click('#themeToggle');assert.equal(await p.$eval('html',e=>e.dataset.theme),'light');
// portable build carries both new scripts and the fraction styling
const out=fs.readFileSync('exports/memizestan.html','utf8');assert.match(out,/DecimalPresentation/);assert.match(out,/hakim\.decimals\.display\.v1/);assert.match(out,/class="display-bar"/);assert.match(out,/fraction-top/);assert.match(out,/id="themeToggle"/);assert.equal(out.includes('focusView'),false);assert.match(fs.readFileSync('sw.js','utf8'),/hakim-v1\.5\.\d+/);assert.match(fs.readFileSync('sw.js','utf8'),/presentation\.js/);
console.log('PASS: stacked fractions in prose and lesson visuals, no slash fractions in data, four text sizes persisted, dark theme persisted, motion preference, reset, axe light/dark/mobile, no overflow at 390px and portable build wiring.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
