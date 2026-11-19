/* Prepared Persian male narration clips; no speech synthesis or network TTS. */
(function(root){'use strict';
const main=document.getElementById('main');let active=null;
const keys=new Set(['symmetry','angles','quadrilaterals','mirror','center','rotation',...Array.from({length:7},(_,i)=>'tool-'+i)]);
function source(key){const embedded=document.getElementById('geometry-audio-'+key);return embedded?'data:audio/mpeg;base64,'+embedded.content.textContent.trim():'math-geometry/audio/'+key+'.mp3';}
function stop(){if(active){active.pause();active.currentTime=0;active=null;}}
function visible(el){return el.isConnected&&!el.closest('[hidden]')&&el.getClientRects().length>0;}
function scan(){if(active&&!visible(active))stop();main.querySelectorAll('[data-narration]').forEach(el=>{const key=el.dataset.narration;if(!keys.has(key)||el.querySelector(':scope > .narration-controls'))return;
const bar=document.createElement('div');bar.className='narration-controls recorded-narration';const title=document.createElement('span');title.textContent=el.dataset.narrationTitle||(key.startsWith('tool-')?'🔊 توضیح صوتی این گام':'🔊 راهنمای صوتی دستگاه');const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.lang='fa-IR';audio.setAttribute('aria-label',title.textContent.replace('🔊 ', '')+'؛ صدای مرد فارسی‌زبان');audio.src=source(key);const status=document.createElement('span');status.className='narration-status';status.setAttribute('role','status');audio.onplay=()=>{if(active!==audio)stop();active=audio;status.textContent='';};audio.onended=()=>{if(active===audio)active=null;};audio.onerror=()=>{status.textContent='فایل صوتی پخش نشد؛ متن راهنما در دسترس است.';if(active===audio)stop();};bar.append(title,audio,status);el.append(bar);
});}
new MutationObserver(scan).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});root.addEventListener('pagehide',stop);scan();root.GeometryNarration={stop,source};
})(window);
