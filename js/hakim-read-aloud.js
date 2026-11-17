/* Optional, user-initiated Persian read-aloud for game explanations.
 * Speech stays on-device through the browser SpeechSynthesis API; no text is sent anywhere.
 */
(function(){
  'use strict';
  const selector='[data-hk-read-aloud]';
  const synth=window.speechSynthesis;
  const bound=new WeakSet();
  let currentButton=null;
  let activeSource=null;
  let activeText='';
  let voice=null;

  // SpeechSynthesisVoice has no standard gender field; never guess—require an explicit masculine voice label.
  function findPersianVoice(){
    if(!synth||typeof window.SpeechSynthesisUtterance!=='function'||typeof synth.getVoices!=='function')return null;
    try{const voices=synth.getVoices().filter(item=>/^fa(?:[-_]|$)/i.test(item.lang||''));return voices.find(item=>/(?:\bmale\b|masculine|\bman\b|\bmasc\b|مرد|مذکر|آقا|پسر)/i.test((item.name||'')+' '+(item.voiceURI||'')))||null;}catch(_error){return null;}
  }
  function resetButton(button){
    if(!button)return;
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label',button.dataset.hkReadAloudLabel+' با صدای مرد فارسی دستگاه');
    button.textContent='🔊 '+button.dataset.hkReadAloudLabel;
  }
  function finish(button){
    if(currentButton!==button)return;
    resetButton(button);
    currentButton=null;
    activeSource=null;
    activeText='';
  }
  function stop(){
    try{if(synth&&(currentButton||synth.speaking))synth.cancel();}catch(_error){}
    finish(currentButton);
  }
  function bind(button){
    if(bound.has(button))return;
    bound.add(button);
    button.type='button';
    if(!button.dataset.hkReadAloudLabel)button.dataset.hkReadAloudLabel='شنیدن توضیح';
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      voice=findPersianVoice();
      if(!voice||!synth)return;
      if(currentButton===button){stop();return;}
      stop();
      const source=document.querySelector(button.getAttribute('data-hk-read-aloud'));
      if(!source)return;
      const text=String(source.innerText||source.textContent||'').replace(/\s+/g,' ').trim();
      if(!text)return;
      try{
        const utterance=new window.SpeechSynthesisUtterance(text);
        utterance.voice=voice;
        utterance.lang=voice.lang||'fa-IR';
        utterance.rate=.92;
        utterance.onend=()=>finish(button);
        utterance.onerror=()=>finish(button);
        currentButton=button;
        activeSource=source;
        activeText=text;
        const stopLabel=button.dataset.hkReadAloudStop||'توقف خواندن';
        button.textContent='⏹ '+stopLabel;
        button.setAttribute('aria-label',stopLabel+' با صدای مرد فارسی دستگاه');
        button.setAttribute('aria-pressed','true');
        synth.speak(utterance);
      }catch(_error){stop();}
    });
  }
  function refresh(){
    const buttons=Array.from(document.querySelectorAll(selector));
    buttons.forEach(bind);
    voice=findPersianVoice();
    buttons.forEach(button=>{button.hidden=!voice;if(!voice)resetButton(button);});
  }
  if(typeof MutationObserver==='function'&&document.body){
    const observer=new MutationObserver(()=>{
      if(currentButton&&activeSource&&(!activeSource.isConnected||String(activeSource.innerText||activeSource.textContent||'').replace(/\s+/g,' ').trim()!==activeText))stop();
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(synth&&typeof synth.addEventListener==='function')synth.addEventListener('voiceschanged',refresh);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  window.HakimReadAloud={refresh,stop};
  refresh();
})();
