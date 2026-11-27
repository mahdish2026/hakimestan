// Conversation Studio visual/navigation regression. Uses fictional local fixtures only.
// Start: node tools/serve.cjs 8000 0.0.0.0
// Needs puppeteer-core and @sparticuz/chromium, or CHROME_PATH.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pup=require('puppeteer-core');
const base=process.env.BASE_URL||'http://localhost:8000/';
function luminance(rgb){const a=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{
 const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),chrome=pkg?.default||pkg;
 const browser=await pup.launch({executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:chrome?.args||['--no-sandbox'],headless:true});
 fs.mkdirSync('reports/messenger-studio',{recursive:true});
 try{
  const selected=process.env.STUDIO_WIDTHS?.split(',').map(Number);
  for(const width of [1440,1024,768,390,320].filter(v=>!selected||selected.includes(v))){
   const page=await browser.newPage(),errors=[],failed=[];
   await page.setViewport({width,height:900,deviceScaleFactor:1});await page.setBypassServiceWorker(true);
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failed.push(r.url())});
   await page.setRequestInterception(true);page.on('request',r=>{
    if(r.url().startsWith(base))return r.continue();
    if(r.url().includes('script.google.com')){
     let action=new URL(r.url()).searchParams.get('action');if(r.postData())try{action=JSON.parse(r.postData()).action||action}catch{}
     let body={ok:true};if(action==='messages')body={messages:[]};if(action==='users')body={users:[]};if(action==='groups')body={groups:['عمومی']};
     return r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
    }r.abort();
   });
   await page.evaluateOnNewDocument(()=>{localStorage.clear();localStorage.setItem('hk_no_stats','1');localStorage.setItem('hk_fx','false');localStorage.setItem('hk_notif','false')});
   await page.goto(base+'payamresan.html',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
   const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(await overflow(),false,`${width}: welcome overflow`);
   assert.equal(await page.$eval('.welcome-visual img',e=>e.complete&&e.naturalWidth>0),true,'illustration missing');
   await page.screenshot({path:`reports/messenger-studio/welcome-${width}.png`,fullPage:true});
   await page.click('#btnGoLogin');await page.waitForSelector('#page-login.active');assert.equal(await overflow(),false);
   await page.waitForFunction(()=>document.getElementById('page-login').getAnimations().every(a=>a.playState==='finished'));
   await page.screenshot({path:`reports/messenger-studio/login-${width}.png`,fullPage:true});
   await page.evaluate(()=>HK.App.showPage('welcome'));await page.click('#btnGoRegister');await page.waitForSelector('#page-register.active');assert.equal(await overflow(),false);
   await page.waitForFunction(()=>document.getElementById('page-register').getAnimations().every(a=>a.playState==='finished'));
   await page.screenshot({path:`reports/messenger-studio/register-${width}.png`,fullPage:true});
   await page.evaluate(()=>{
    HK.Auth.loginSuccess('سارا','student');HK.Poll.stop();HK.S.profile={display:'سارا احمدی',bio:'',avatar:''};
    HK.S.users=[{username:'سارا',role:'student'},{username:'مریم محمدی',role:'teacher'},{username:'نازنین',role:'student'}];HK.S.groups=['عمومی','باشگاه کتاب‌خوانی','ایده‌های خلاق'];
    const now=Date.now()-8*60000;
    HK.S.messages=[['مریم محمدی','سلام به کلاس پر از ایدهٔ ما! 🌱\nبرای فعالیت فردا آماده‌اید؟'],['سارا','سلام خانم معلم! من یک پیشنهاد دارم 💡'],['نازنین','منم آماده‌ام! دربارهٔ چی صحبت کنیم؟'],['سارا','چطوره هر کسی یک نکتهٔ جالب از کتابی که خونده، با بقیه به اشتراک بذاره؟ 📚'],['مریم محمدی','چه ایدهٔ خوبی سارا جان.\nپس فردا، با یک داستان تازه شروع می‌کنیم ✨'],['سارا','عالیه! من از همین امروز شروع می‌کنم. 💜']].map(([from,text],i)=>HK.Norm.msg({id:'studio-'+i,from_user:from,to_group:'عمومی',text,date:new Date(now+i*60000).toISOString()}));
    HK.S.messages.push(HK.Norm.msg({id:'book',from_user:'نازنین',to_group:'باشگاه کتاب‌خوانی',text:'من کتاب شازده کوچولو رو پیشنهاد می‌کنم 📖',date:new Date().toISOString()}),HK.Norm.msg({id:'idea',from_user:'نازنین',to_group:'ایده‌های خلاق',text:'بیایید یک داستان تصویری بسازیم!',date:new Date().toISOString()}));
    HK.App.openChat('group','عمومی');HK.App.renderAll('all');HK.App.scrollBottom();
   });
   await page.waitForFunction(()=>document.querySelectorAll('#msgs .bubble').length===6);
   assert.equal(await page.$eval('#welcomeBanner',e=>getComputedStyle(e).display),'none','first visit hint obscures open chat');
   assert.equal(await page.$eval('#page-chat .topbar',e=>e.parentElement.matches('main.main')),true,'conversation header belongs in its column');
   assert.equal(await overflow(),false,`${width}: chat overflow`);
   for(const mode of [false,true]){
    await page.evaluate(dark=>{HK.DB.set('dark',dark);HK.Settings.applyTheme()},mode);
    const colors=await page.evaluate(()=>{
     return {bubble:['me','other'].map(c=>{const s=getComputedStyle(document.querySelector('.bubble.'+c));return[s.color,s.backgroundColor]})};
    });
    for(const pair of colors.bubble)assert.ok(contrast(...pair)>=4.5,`${width}: insufficient message contrast ${pair}`);
    // Resolve token backgrounds through the browser before testing inherited heading colour.
    const foreground=await page.evaluate(()=>{const probe=document.createElement('span');probe.style.background='var(--card)';document.body.append(probe);const bg=getComputedStyle(probe).backgroundColor;probe.remove();return ['.studio-brand strong','.studio-side-heading h2','.side-item .nm'].map(s=>[getComputedStyle(document.querySelector(s)).color,bg])});
    for(const pair of foreground)assert.ok(contrast(...pair)>=4.5,`${width}: theme foreground was left behind ${pair}`);
    await page.evaluate(()=>{document.activeElement?.blur();HK.App.scrollBottom()});
    await page.screenshot({path:`reports/messenger-studio/${mode?'dark':'chat'}-${width}.png`,fullPage:true});
   }
   await page.evaluate(()=>{HK.DB.set('dark',false);HK.Settings.applyTheme()});
   if(width<920){
    const boxes=await page.$$eval('#page-chat .composer>button,#page-chat .topbar>button',es=>es.filter(e=>getComputedStyle(e).display!=='none').map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
    for(const box of boxes)assert.ok(box.w>=44&&box.h>=44,`${width}: small touch target ${JSON.stringify(box)}`);
    await page.click('#btnBackToList');await page.waitForFunction(()=>document.body.dataset.chatOpen==='false');
    assert.equal(await page.$eval('.studio-masthead',e=>getComputedStyle(e).display),'flex');
    await page.screenshot({path:`reports/messenger-studio/list-${width}.png`,fullPage:true});
   }
   await page.click('#studioSaved');assert.equal(await page.evaluate(()=>HK.S.chat.type),'saved');assert.equal(await page.$eval('#studioSaved',e=>e.getAttribute('aria-pressed')),'true');
   if(width<920&&await page.evaluate(()=>document.getElementById('chatShell').classList.contains('in-chat')))await page.click('#btnBackToList');await page.click('#studioStarred');assert.equal(await page.evaluate(()=>HK.S.chat.type),'starred');
   if(width<920&&await page.evaluate(()=>document.getElementById('chatShell').classList.contains('in-chat')))await page.click('#btnBackToList');await page.click('#studioProfile');await page.waitForSelector('#page-profile.active');
   await page.evaluate(()=>HK.App.showPage('chat'));if(width<920&&await page.evaluate(()=>document.getElementById('chatShell').classList.contains('in-chat')))await page.click('#btnBackToList');
   await page.click('#studioAppearance');await page.waitForSelector('#page-settings.active');assert.equal(await overflow(),false);
   await page.evaluate(()=>HK.App.showPage('chat'));await page.click('#studioMenu');await page.waitForSelector('#drawer.open');
   assert.equal(await page.$eval('#studioMenu',e=>e.getAttribute('aria-expanded')),'true');await page.keyboard.press('Escape');assert.equal(await page.$eval('#studioMenu',e=>e.getAttribute('aria-expanded')),'false');
   await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.evaluate(()=>HK.App.showPage('welcome'));
   assert.equal(await page.$eval('.welcome-visual img',e=>getComputedStyle(e).animationName),'none');
   assert.deepEqual(failed,[],`${width}: missing local asset`);assert.deepEqual(errors,[],`${width}: browser error`);
   console.log(`PASS Studio ${width}: illustrated welcome, login/register routes, chat/list, dark contrast, saved/starred/profile/settings/drawer navigation, reduced motion${width<920?', 44px touch targets':''}`);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
