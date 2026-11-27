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
 function applyDepth(enabled,persist){body.dataset.atelierDepth=enabled?'on':'off';if(depth){depth.setAttribute('aria-pressed',String(enabled));depth.title=enabled?'خاموش‌کردن جلوهٔ حجمی':'روشن‌کردن جلوهٔ حجمی'}if(persist)save(depthKey,enabled?'on':'off')}
 if(palette){applyPalette(read(paletteKey),false);palette.addEventListener('change',function(){applyPalette(palette.value,true)})}
 applyDepth(read(depthKey)!=='off',false);
 if(depth)depth.addEventListener('click',function(){applyDepth(body.dataset.atelierDepth!=='on',true)});
})();
