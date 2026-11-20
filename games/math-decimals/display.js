/* Independent display preferences; deliberately no focus-mode/layout toggle. */
(function(){'use strict';const key='hakim.decimals.display.v1',root=document.documentElement;
let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
const levels=['small','normal','large','larger'],labels=['کوچک','معمولی','بزرگ','بزرگ‌تر'];
let size=Number.isInteger(saved.size)&&saved.size>=0&&saved.size<levels.length?saved.size:1;
let dark=typeof saved.dark==='boolean'?saved.dark:matchMedia('(prefers-color-scheme: dark)').matches;
let motion=saved.motion!==false;
function apply(){root.dataset.textScale=levels[size];root.dataset.theme=dark?'dark':'light';root.dataset.motion=motion?'on':'off';document.querySelector('meta[name=theme-color]').content=dark?'#141220':'#282544';document.getElementById('textSizeLevel').textContent=labels[size];document.getElementById('textSmaller').disabled=size===0;document.getElementById('textLarger').disabled=size===levels.length-1;const theme=document.getElementById('themeToggle');theme.setAttribute('aria-pressed',String(dark));theme.textContent=dark?'☀ روز':'☾ شب';const m=document.getElementById('motionToggle');m.setAttribute('aria-pressed',String(motion));m.textContent='حرکت';}
function save(){try{localStorage.setItem(key,JSON.stringify({size,dark,motion}));}catch{document.getElementById('displayNotice').textContent='تنظیم نمایش فقط تا بستن این صفحه حفظ می‌شود.';}apply();}
document.getElementById('textSmaller').onclick=()=>{size=Math.max(0,size-1);save();};document.getElementById('textLarger').onclick=()=>{size=Math.min(levels.length-1,size+1);save();};document.getElementById('themeToggle').onclick=()=>{dark=!dark;save();};document.getElementById('motionToggle').onclick=()=>{motion=!motion;save();};document.getElementById('displayReset').onclick=()=>{size=1;dark=false;motion=true;save();};apply();
// Measured scroll offset supports a wrapping header and enlarged type.
function measure(){root.style.setProperty('--header-height',Math.ceil(document.querySelector('header').getBoundingClientRect().height)+'px');}if(typeof ResizeObserver!=='undefined')new ResizeObserver(measure).observe(document.querySelector('header'));else window.addEventListener('resize',measure);measure();
})();
