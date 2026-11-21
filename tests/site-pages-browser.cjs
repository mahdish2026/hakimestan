// Serve the repo on localhost:8000. Install puppeteer-core and @sparticuz/chromium,
// or supply CHROME_PATH. No requests leave the local server and no forms are submitted.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {existsSync, readFileSync} = require('node:fs');
const path = require('node:path');
const pup = require('puppeteer-core');
const root = path.resolve(__dirname, '..');
const base = 'http://localhost:8000/';
async function run() {
  const pkg = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome = pkg?.default || pkg;
  const b = await pup.launch({executablePath:process.env.CHROME_PATH || await chrome.executablePath(),args:chrome?.args || ['--no-sandbox']});
  const errors = [], timings = [];
  const files = execFileSync('git', ['ls-files','*.html'], {cwd:root,encoding:'utf8'}).trim().split('\n');
  try {
    for (const f of files) {
      const p = await b.newPage();
      try {
        await p.setBypassServiceWorker(true);
        await p.setRequestInterception(true);
        p.on('request', r => !/^https?:/.test(r.url()) || r.url().startsWith(base) ? r.continue() : r.abort());
        p.on('pageerror', e => errors.push(`${f}: ${e.message}`));
        p.on('response', r => { if(r.url().startsWith(base) && r.status() >= 400) errors.push(`${f}: ${r.status()} ${r.url()}`); });
        await p.setViewport({width:320,height:844});
        await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
        await p.goto(base+f, {waitUntil:'load'});
        await p.evaluate(()=>document.fonts.ready);
        const data = await p.evaluate(()=>({title:document.title,lang:document.documentElement.lang,links:[...document.querySelectorAll('a[href]')].map(a=>a.href),load:performance.getEntriesByType('navigation')[0].loadEventEnd}));
        if(!data.title.trim() || !data.lang) errors.push(`${f}: missing title/language`);
        for(const href of new Set(data.links.filter(h=>h.startsWith(base)))) {
          const local = decodeURIComponent(new URL(href).pathname.slice(1));
          if(!existsSync(path.join(root, local))) errors.push(`${f}: missing link ${local}`);
        }
        timings.push([Math.round(data.load),f]);
        if (process.env.SITE_AXE === '1') {
          await p.addScriptTag({content:readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
          const violations = await p.evaluate(async()=> (await axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>[v.id,v.nodes.map(n=>n.target)]));
          if(violations.length) errors.push(`${f}: ${JSON.stringify(violations)}`);
        }
        for (const width of [320,390,1280]) {
          await p.setViewport({width,height:844});
          const overflow = await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
          if(overflow>1) {
            const outside = await p.evaluate(()=>[...document.body.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().left < -1).slice(0,8).map(el=>el.tagName+'.'+el.className).join(', '));
            errors.push(`${f}: overflow ${overflow}px at ${width}px (${outside})`);
          }
        }
      } finally { await p.close(); }
    }
  } finally { await b.close(); }
  console.log('Pages:', files.length,'; local load samples (ms), five slowest:',timings.sort((a,b)=>b[0]-a[0]).slice(0,5));
  assert.deepEqual(errors,[]);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
