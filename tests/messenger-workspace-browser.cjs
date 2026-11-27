// Run a local server first: node tools/serve.cjs 8000 0.0.0.0
// npm install --no-save --package-lock=false puppeteer-core @sparticuz/chromium
// Uses only fictional messages. All external requests are intercepted.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pup=require('puppeteer-core');
const base=process.env.BASE_URL||'http://localhost:8000/';
(async()=>{
 const pkg=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),chrome=pkg?.default||pkg;
 const browser=await pup.launch({executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:chrome?.args||['--no-sandbox'],headless:true});
 fs.mkdirSync('reports/messenger',{recursive:true});
 try{
  const selected=process.env.VIEWPORT_WIDTHS?.split(',').map(Number);
  for(const [width,height,dpr]of [[1440,1000,3],[1024,900,1],[768,1024,2],[390,844,3],[320,740,2]].filter(v=>!selected||selected.includes(v[0]))){
   const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.setViewport({width,height,deviceScaleFactor:dpr});await p.setBypassServiceWorker(true);await p.setRequestInterception(true);
   p.on('request',r=>{
    if(r.url().startsWith(base))return r.continue();
    if(r.url().includes('script.google.com')){
     const url=new URL(r.url());let action=url.searchParams.get('action');if(r.postData())try{action=JSON.parse(r.postData()).action||action}catch{}
     let data={ok:true};
     if(action==='messages')data={messages:Array.from({length:70},(_,i)=>({id:'fictional-'+i,from_user:i%2?'تست':'سارا',to_group:'عمومی',text:i%2?'سلام! تمرین‌های امروز را با هم مرور کنیم 🌱':'آماده‌ام؛ یادگیری با همکاری لذت‌بخش‌تر است.',date:new Date(Date.now()-70000+i*1000).toISOString()})),serverTime:new Date().toISOString()};
     if(action==='users')data={users:[{username:'تست',role:'student'},{username:'سارا',role:'student'}]};
     if(action==='groups')data={groups:['عمومی']};if(action==='reads')data={reads:{}};if(action==='words')data={words:[]};
     return r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
    }
    return r.abort();
   });
   await p.evaluateOnNewDocument(()=>{
    localStorage.setItem('hk_no_stats','1');localStorage.setItem('hk_session',JSON.stringify({username:'تست',at:Date.now()}));
    localStorage.setItem('hk_liveBg','true');localStorage.setItem('hk_wall','"waves"');localStorage.setItem('hk_theme','"ocean"');localStorage.setItem('hk_fx','false');
   });
   await p.goto(base+'payamresan.html',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.HK?.V3&&HK.S.me);
   await p.evaluate(()=>{HK.Poll.stop();HK.App.openChat('group','عمومی')});
   await p.waitForFunction(()=>{const c=document.querySelector('.live-bg');return c&&c.width>1&&c.height>1});
   const canvas=await p.evaluate(()=>{
    const c=document.querySelector('.live-bg'),ctx=c.getContext('2d');
    return {width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,alpha:ctx.getImageData(Math.floor(c.width*.82),Math.floor(c.height*.78),1,1).data[3],on:HK.V3.Live.on()};
   });
   assert.equal(canvas.width,Math.round(canvas.cssWidth*Math.min(dpr,2)),`${width}: canvas DPR width`);
   assert.equal(canvas.height,Math.round(canvas.cssHeight*Math.min(dpr,2)),`${width}: canvas DPR height`);
   assert.ok(canvas.alpha>0,`${width}: lower-right canvas must contain artwork; partial painting regression`);
   const overflow=()=>p.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,root:document.documentElement.scrollWidth,width:innerWidth,main:document.querySelector('#page-chat .main').getBoundingClientRect().toJSON(),send:document.getElementById('btnSend').getBoundingClientRect().toJSON(),viewHeight:innerHeight}));
   let layout=await overflow();assert.equal(layout.page,false,`${width}: horizontal overflow`);assert.ok(layout.send.bottom<=height+1&&layout.send.top>=0,`${width}: send button outside viewport`);
   assert.ok(layout.main.left>=-1&&layout.main.right<=width+1,`${width}: info panel squeezed/clipped the wallpaper`);
   // Every wallpaper uses the same rules in settings and in the actual conversation.
   const papers=await p.evaluate(()=>HK.V3.WALLS.map(w=>w.id));
   for(const wall of papers){
    const appearance=await p.evaluate(w=>{HK.DB.set('wall',w);HK.V3.applyExtras();const main=getComputedStyle(document.querySelector('#page-chat .main'),'::before'),preview=getComputedStyle(document.getElementById('wallpaperPreview'),'::before');return {image:main.backgroundImage,preview:preview.backgroundImage,size:main.backgroundSize,previewSize:preview.backgroundSize}},wall);
    assert.equal(appearance.image,appearance.preview,`${width}/${wall}: preview differs from real wallpaper`);
    assert.equal(appearance.size,appearance.previewSize,`${width}/${wall}: preview pattern scale differs`);
    if(wall==='none')assert.equal(appearance.image,'none');else if(wall!=='default')assert.notEqual(appearance.image,'none');
   }
   await p.evaluate(()=>{document.body.setAttribute('data-bgimg','on');HK.DB.set('wall','grid');HK.V3.applyExtras()});
   const grid=await p.$eval('#page-chat .main',e=>getComputedStyle(e,'::before').backgroundImage);
   await p.evaluate(()=>{HK.DB.set('wall','dots');HK.V3.applyExtras()});
   assert.notEqual(await p.$eval('#page-chat .main',e=>getComputedStyle(e,'::before').backgroundImage),grid,'legacy attribute overrides selected wallpaper');
   await p.evaluate(()=>{HK.App.showPage('settings')});await p.waitForFunction(()=>!HK.V3.Live.on());
   for(const theme of await p.evaluate(()=>HK.V3.THEMES.map(t=>t.id))){
    for(const dark of [false,true]){
     await p.evaluate(({theme,dark})=>{HK.DB.set('theme',theme);HK.DB.set('dark',dark);HK.Settings.applyTheme()}, {theme,dark});
     assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}/${theme}/${dark}: settings overflow`);
    }
   }
   await p.evaluate(()=>{HK.DB.set('theme','ocean');HK.DB.set('dark',false);HK.DB.set('wall','waves');HK.Settings.applyTheme();HK.V3.applyExtras()});
   await p.locator('.wall-card[data-wall="mesh"]').click();
   assert.equal(await p.evaluate(()=>HK.DB.get('wall')),'mesh');
   await p.screenshot({path:`reports/messenger/settings-${width}.png`,fullPage:true});
   await p.evaluate(()=>{HK.App.showPage('chat');HK.App.openChat('group','عمومی')});
   await p.waitForFunction(()=>{const c=document.querySelector('.live-bg');return c.width>1&&HK.V3.Live.on()});
   if(width<920){
    await p.click('#btnChatMenu');await p.waitForSelector('#sheet.open');
    const clicked=await p.evaluate(()=>{const b=[...document.querySelectorAll('#sheetBody button')].find(x=>x.textContent.includes('اطلاعات گفتگو'));b?.click();return !!b});assert.ok(clicked);
    await p.waitForSelector('#modalOv.open');assert.ok(await p.$eval('#modalBody',e=>e.textContent.includes('عمومی')));await p.keyboard.press('Escape');
   }else{
    await p.click('#btnChatInfo');await p.waitForSelector('#chatInfo.open');await p.click('#btnCloseChatInfo');
   }
   // Growing the composer and shrinking the viewport must resize the decoration and preserve send visibility.
   await p.$eval('#msgInput',e=>{e.value='متن چندخطی\n'.repeat(7);e.dispatchEvent(new Event('input',{bubbles:true}))});
   await p.setViewport({width,height:Math.min(height,560),deviceScaleFactor:dpr});
   await p.waitForFunction(()=>document.getElementById('btnSend').getBoundingClientRect().bottom<=innerHeight+1);
   layout=await overflow();assert.equal(layout.page,false);assert.ok(layout.send.top>=0);
   await p.setViewport({width,height,deviceScaleFactor:dpr});await p.$eval('#msgInput',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}))});
   await p.evaluate(()=>{HK.App.scrollBottom()});
   await p.evaluate(()=>new Promise(r=>setTimeout(r,450)));
   await p.screenshot({path:`reports/messenger/chat-${width}.png`,fullPage:true});
   await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
   await p.evaluate(()=>HK.V3.Live.apply());assert.equal(await p.evaluate(()=>HK.V3.Live.on()),true,'reduced motion should retain a static backdrop');
   await p.evaluate(()=>HK.Auth.logout());await p.waitForSelector('#modalOv.open');await p.click('#modalPrimary');
   await p.waitForFunction(()=>HK.S.me===null);assert.equal(await p.$eval('#msgs',e=>e.children.length),0);assert.equal(await p.evaluate(()=>HK.V3.Live.on()),false);
   assert.deepEqual(errors,[],`${width}: browser errors`);
   console.log(`PASS ${width}×${height} DPR ${dpr}: full canvas, 14 wallpapers + previews, 20 themes × 2 modes, composer resize, menus/info, logout`);
   await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
