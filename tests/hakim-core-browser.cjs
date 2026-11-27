// Real-browser checks for the shared character on representative pages.
'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const axe=require('axe-core');
(async()=>{
  const pkg=process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome=pkg?.default||pkg;
  const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await chrome.executablePath(),args:chrome?.args||['--no-sandbox']});
  try {
    for(const width of [320,360,768,1366]) for(const theme of ['light','night']){
      const page=await browser.newPage(); await page.setViewport({width,height:900});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setBypassServiceWorker(true);
      await page.goto('http://localhost:8000/games/math-stats.html',{waitUntil:'load'});
      const data=await page.evaluate(theme=>{
        document.documentElement.dataset.theme=theme;
        const el=document.createElement('div'); el.id='testHakimMount';document.body.prepend(el);
        Hakim.init({container:el,font:false,autoHideMs:5000});
        Hakim.say('سلام! با هم مرحله به مرحله یاد می‌گیریم ✨',{mood:'happy',autoHide:false});
        const panel=el.querySelector('.hakim-panel'), face=el.querySelector('.hk-character');
        const standalone=document.querySelector('[data-hk-face] .hk-character');
        return {ready:Hakim.isReady(),face:!!face,standalone:!!standalone,
          text:el.querySelector('.hakim-text').textContent, sr:el.querySelector('.hakim-sr-only').textContent,
          anim:getComputedStyle(face.querySelector('.hk-body')).animationName,
          width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
          panelWidth:panel.getBoundingClientRect().width, bbox:face.getBoundingClientRect().width};
      },theme);
      assert.ok(data.ready && data.face && data.standalone);
      assert.equal(data.text,data.sr); assert.match(data.text,/مرحله به مرحله/);
      assert.equal(data.anim,'none','reduced motion applies to face SVG');
      assert.equal(data.width,data.viewport,`${width} ${theme}: no horizontal overflow`);
      assert.ok(data.panelWidth>0 && data.panelWidth<=width && data.bbox>0);
      await page.evaluate(axe.source);
      const violations=await page.evaluate(()=>axe.run(document.getElementById('testHakimMount'),{runOnly:['wcag2a','wcag2aa','wcag21aa']}));
      assert.deepEqual(violations.violations.map(v=>v.id),[],`${width} ${theme}: accessible companion`);
      await page.close();
    }
    // Exercise real mounts, including switching theme after the companion has appeared.
    const themed = [
      ['games/math-stats.html','#hkCompanion','html',['light','night']],
      ['games/math-measurement.html','#hkCompanion','html',['light','night']],
      ['games/farsi5-hamava.html','#hkCompanion','html',['light','night']],
      ['games/iran-geography.html','#hkCompanion','html',['light','night']],
      ['games/snake-ladder.html','#hakimHome','body',['light','dark']],
      ['games/snake-ladder-online.html','#hakimHome','body',['light','dark']],
      ['games/jadval-hekmat.html','#hakimStart','body',['light','dark']],
      ['games/mancheh-online.html','#hakimHome','body',['dark','light']],
      ['games/hakim-cards.html','#hakimHome','body',['dark','light']],
      ['games/math-olgoha.html','#hakimPanelMount','body',['light','dark']],
      ['games/farsi5-vocab.html','#hakimMount','html',['night','day','ocean','rose','forest','cosmos']]
    ];
    for(const width of [360,1366]) for(const [path,selector,root,themes] of themed){
      const page=await browser.newPage(); await page.setViewport({width,height:900});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setBypassServiceWorker(true);
      await page.goto('http://localhost:8000/'+path,{waitUntil:'load'});
      await page.evaluate(axe.source);
      await page.evaluate(selector=>{
        Hakim.init({container:document.querySelector(selector),font:false});
        Hakim.say('سلام دوست من! با هم یاد می‌گیریم.',{mood:'excited',autoHide:false});
      },selector);
      const rings=[];
      for(const theme of themes){
        const data=await page.evaluate(async({selector,root,theme})=>{
          document.querySelector(root).dataset.theme=theme;
          // Force the parent style update before sampling the pseudo-element on the next frame.
          const changingBubble=document.querySelector(selector+' .hakim-bubble');
          getComputedStyle(changingBubble).backgroundColor;
          getComputedStyle(changingBubble,'::after').backgroundColor;
          await new Promise(resolve=>setTimeout(resolve,180));
          const panel=document.querySelector(selector+' .hakim-panel');
          const bubble=panel.querySelector('.hakim-bubble');
          const avatar=panel.querySelector('.hakim-avatar');
          const b=getComputedStyle(bubble), tail=getComputedStyle(bubble,'::after');
          const bubbleColor=b.backgroundColor, tailColor=tail.backgroundColor, tailDisplay=tail.display;
          const violations=await axe.run(panel,{runOnly:['wcag2a','wcag2aa','wcag21aa']});
          return {bubble:bubbleColor,tail:tailColor,tailDisplay,
            ring:getComputedStyle(avatar).backgroundImage,animation:getComputedStyle(avatar).animationName,
            violations:violations.violations.map(v=>v.id),text:panel.querySelector('.hakim-text').textContent,
            width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};
        },{selector,root,theme});
        const label=`${path} ${width} ${theme}`;
        // Vocab intentionally uses translucent bubbles and opaque, theme-colored tails.
        if(data.tailDisplay!=='none' && !path.includes('farsi5-vocab')) assert.equal(data.tail,data.bubble,`${label}: bubble tail matches`);
        assert.equal(data.animation,'none',`${label}: reduced motion`);
        assert.ok(data.text.length>0,`${label}: companion message`); assert.deepEqual(data.violations,[],label);
        assert.equal(data.width,data.viewport,`${label}: no horizontal overflow`);
        rings.push(data.ring);
      }
      if(path.includes('snake-ladder')||path.includes('jadval')||path.includes('mancheh')||path.includes('hakim-cards')){
        assert.ok(rings.every(r=>!r.includes('rgb(233, 180, 76)')),`${path}: no default gold frame`);
      }
      await page.close();
    }
    // The new celebratory movement plays once and respects the reduced-motion rule above.
    {
      const page=await browser.newPage(); await page.goto('http://localhost:8000/games/math-stats.html');
      const animation=await page.evaluate(()=>{
        Hakim.say('آفرین!',{mood:'excited',autoHide:false});
        return getComputedStyle(document.querySelector('#hkCompanion .hakim-avatar')).animationName;
      });
      assert.equal(animation,'hkCheer'); await page.close();
    }
    for(const path of ['index.html','games/kohan-diyar.html','games/math-decimals.html','games/hakim-quest.html','games/farsi5-vocab.html']){
      const page=await browser.newPage(); const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://localhost:8000/'+path,{waitUntil:'load'});
      assert.equal(await page.evaluate(()=>typeof Hakim.renderFace),'function',path);
      const face=await page.evaluate(()=>{const host=document.createElement('div');Hakim.renderFace('curious',host);return !!host.querySelector('svg.hk-character');});
      assert.ok(face,path); assert.deepEqual(errors,[],path); await page.close();
    }
    console.log('Hakim browser: responsive, accessible, reduced motion and representative games OK');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
