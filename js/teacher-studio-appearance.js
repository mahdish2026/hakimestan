/* Local appearance preferences only. No content, network, timers, or animation loop. */
(function(){
 'use strict';
 var body=document.body,palette=document.getElementById('atelierPalette'),depth=document.querySelector('[data-atelier-depth-toggle]');
 if(!body||(!body.classList.contains('converter-studio')&&!body.classList.contains('lesson-studio')))return;
 var paletteKey='hakimestan_atelier_palette_v1',depthKey='hakimestan_atelier_depth_v1';
 var allowed=['garden','ocean','sunrise','rose','lavender','sand','night'];
 function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
 function save(key,value){try{localStorage.setItem(key,value);return true}catch(e){var notice=document.getElementById('atelierAppearanceStatus');if(notice)notice.textContent='تنظیم ظاهر در این مرورگر ذخیره نشد؛ انتخاب فعلی تا بستن صفحه باقی می‌ماند.';return false}}
 function applyPalette(value,persist){value=allowed.indexOf(value)>=0?value:'garden';body.dataset.atelierPalette=value;if(palette)palette.value=value;if(persist)save(paletteKey,value)}
 function resetScene(el){el.style.removeProperty('--atelier-rx');el.style.removeProperty('--atelier-ry')}
 function applyDepth(enabled,persist){body.dataset.atelierDepth=enabled?'on':'off';if(depth){depth.setAttribute('aria-pressed',String(enabled));depth.title=enabled?'خاموش‌کردن جلوهٔ حجمی':'روشن‌کردن جلوهٔ حجمی'}document.querySelectorAll('.atelier-object').forEach(resetScene);if(persist)save(depthKey,enabled?'on':'off')}
 if(palette){applyPalette(read(paletteKey),false);palette.addEventListener('change',function(){applyPalette(palette.value,true)})}
 applyDepth(read(depthKey)!=='off',false);
 if(depth)depth.addEventListener('click',function(){applyDepth(body.dataset.atelierDepth!=='on',true)});
 var reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 // CSS does the rendering; pointer work is limited to the small decorative scene.
 document.addEventListener('pointermove',function(e){
  var scene=e.target.closest?.('.atelier-scene');if(!scene||body.dataset.atelierDepth!=='on'||reduce.matches||!fine.matches||e.pointerType==='touch')return;
  var object=scene.querySelector('.atelier-object'),r=scene.getBoundingClientRect();if(!object||!r.width||!r.height)return;
  var x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));object.style.setProperty('--atelier-rx',(-y*6).toFixed(2)+'deg');object.style.setProperty('--atelier-ry',(x*8).toFixed(2)+'deg');
 });
 document.addEventListener('pointerout',function(e){var scene=e.target.closest?.('.atelier-scene');if(scene&&!scene.contains(e.relatedTarget)){var object=scene.querySelector('.atelier-object');if(object)resetScene(object)}});
 function resetAll(){document.querySelectorAll('.atelier-object').forEach(resetScene)}
 if(reduce.addEventListener)reduce.addEventListener('change',resetAll);
 if(fine.addEventListener)fine.addEventListener('change',resetAll);
})();
