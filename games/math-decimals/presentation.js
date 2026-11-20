/* Text rendering for decimal lessons.
   Fractions are explicit tokens (⟦صورت|مخرج⟧) so a slash can never be mistaken for a decimal mark.
   Every number or number expression is isolated in an LTR box, including a bare decimal such as ۰٫۶;
   without that, the bidi algorithm can display the digits in reverse order inside RTL prose. */
(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits='[۰-۹٠-٩0-9]+',token=new RegExp('⟦('+digits+')\\|('+digits+')⟧','g');
function fraction(n,d){return `<span class="fraction" role="img" aria-label="${n} روی ${d}"><span class="fraction-top">${n}</span><span class="fraction-bottom">${d}</span></span>`;}
function inline(text){return esc(text).replace(token,(_,n,d)=>fraction(n,d));}
function rich(text){
  // Match a stacked fraction first, then any number expression (a bare number counts as an expression).
  const atom='(?:'+digits+'(?:[٫.]'+digits+')?)';
  const fractionToken='⟦('+digits+')\\|('+digits+')⟧';
  const expression=atom+'(?:\\s*[+−×÷=<>]\\s*'+atom+')*(?:\\s*=\\s*؟)?';
  const rx=new RegExp(fractionToken+'|'+expression,'g');
  let out='',last=0;
  for(const m of text.matchAll(rx)){
    out+=inline(text.slice(last,m.index));
    out+=m[1]!==undefined?fraction(m[1],m[2]):'<bdi dir="ltr" class="math-expression">'+inline(m[0])+'</bdi>';
    last=m.index+m[0].length;
  }
  return out+inline(text.slice(last));
}
function plain(text){return String(text).replace(token,(_,n,d)=>`${n} روی ${d}`);}
const api={fraction,rich,plain,esc};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DecimalPresentation=api;
})(typeof window==='undefined'?globalThis:window);
