/* Misconception diagnosis for decimal answers.
   It never says "wrong" without a reason unless the error cannot be classified.
   Values are compared exactly in millionths, so 0.6 and 0.600 are equal. */
(function(root){'use strict';
const SCALE=1000000;
const fa=v=>String(v).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]).replace(/\./g,'٫');
function parse(v){
  if(typeof v!=='string'&&typeof v!=='number')return null;
  const s=String(v).trim().replace(/[۰-۹]/g,x=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/[٠-٩]/g,x=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/٫/g,'.');
  if(!/^\d{1,9}(?:\.\d{1,6})?$/.test(s))return null;
  const [a,b='']=s.split('.'),m=b.padEnd(6,'0').slice(0,6);
  const n=Number(a)*SCALE+Number(m);
  return Number.isSafeInteger(n)?n:null;
}
const CATALOG={
  choice:{title:'این انتخاب یک بدفهمی رایج است',body:'',reteach:null},
  format:{title:'این نوشته عدد نیست',body:'پاسخ را فقط با رقم و یک ممیز بنویس؛ ممیز فارسی «٫» یا نقطه پذیرفته می‌شود. مثلاً ۰٫۳۷.',reteach:null},
  common:{title:'این خطا در همین تمرین رایج است',body:'',reteach:null},
  unit_factor:{title:'واحد را جا انداختی',body:'مقدار عددی درست به نظر می‌رسد، اما هنوز به واحد خواسته‌شده تبدیل نشده است. رابطهٔ واحدها را بنویس و یک بار دیگر تبدیل کن.',reteach:{q:'۱ متر چند سانتی‌متر است؟',options:['۱۰۰','۱۰','۱۰۰۰'],answer:0,why:'هر متر ۱۰۰ سانتی‌متر است؛ پس تقسیم بر ۱۰۰ یا ضرب در ۰٫۰۱ لازم است.'}},
  decimal_places:{title:'تعداد رقم‌های اعشار جابه‌جا شده',body:'رقم‌ها را درست ضرب کرده‌ای، اما جای ممیز جابه‌جا شده است. تعداد رقم‌های اعشاری دو عامل را با هم جمع کن.',reteach:{q:'حاصل ۰٫۲ × ۰٫۳ چند رقم اعشار دارد؟',options:['۱','۲','۳'],answer:1,why:'دهم × دهم = صدم؛ دو رقم اعشار. پس ۰٫۰۶، نه ۰٫۶.'}},
  place_shift:{title:'ارزش مکانی ده برابر یا یک‌دهم شده',body:'پاسخ به‌جای مقدار درست، یک یا چند مرتبه جابه‌جا شده است. رقم‌ها را در جدول ارزش مکانی بگذار و ببین هر رقم چه ارزشی دارد.',reteach:{q:'کدام عدد بزرگ‌تر است؟',options:['۰٫۶','۰٫۰۶'],answer:0,why:'۰٫۶ یعنی ۶ دهم، اما ۰٫۰۶ یعنی ۶ صدم؛ ۶ دهم ده برابر بزرگ‌تر است.'}},
  carry:{title:'انتقال مرتبه فراموش شده',body:'در جمع، وقتی حاصل یک مرتبه ۱۰ یا بیشتر شد، یک واحد به مرتبهٔ چپ منتقل می‌شود. این انتقال را دوباره حساب کن.',reteach:{q:'۱۰ صدم برابر با چند دهم است؟',options:['۱ دهم','۱۰ دهم','۱ صدم'],answer:0,why:'۱۰ صدم با ۱ دهم برابر است؛ همین تبدیل، انتقال جمع است.'}},
  operand_order:{title:'جای دو عدد در تفریق عوض شده',body:'در تفریق، عدد بزرگ‌تر باید بالا نوشته شود. جای دو عدد را بررسی کن و از مرتبهٔ یکان دوباره کم کن.',reteach:{q:'برای تفریق ۰٫۸ − ۰٫۳۵ کدام عدد بالا می‌نشیند؟',options:['۰٫۸','۰٫۳۵'],answer:0,why:'عدد بزرگ‌تر بالا می‌نشیند؛ صفر کمکی هم اضافه می‌کنیم: ۰٫۸۰.'}},
  rounding:{title:'گردکردن با حذف رقم یکی شده',body:'حذف رقم‌های بعدی و گردکردن یکی نیستند. اگر رقم بعدی ۵ یا بیشتر بود، رقم قبل یک واحد زیاد می‌شود.',reteach:{q:'۰٫۴۶ به نزدیک‌ترین دهم کدام است؟',options:['۰٫۴','۰٫۵'],answer:1,why:'رقم صدم ۶ است؛ چون ۵ یا بیشتر است، دهم یکی زیاد می‌شود: ۰٫۵.'}},
  truncation:{title:'این حذف است، نه گردکردن',body:'وقتی فقط رقم‌های بعدی را حذف می‌کنیم، مقدار می‌تواند تغییر کند. صورت مسئله را بخوان: حذف خواسته یا گردکردن؟',reteach:{q:'با حذف رقم‌های بعد از صدم، ۳٫۱۴۸ چه می‌شود؟',options:['۳٫۱۴','۳٫۱۵'],answer:0,why:'حذف یعنی همین رقم‌ها را کنار بگذاریم: ۳٫۱۴.'}},
  generic:{title:'هنوز به پاسخ نرسیده‌ای',body:'واحد، مرتبه‌ها و عملیات را یک بار دیگر بررسی کن. راهنمای حل، روش را گام‌به‌گام نشان می‌دهد.',reteach:null}
};
const codes=Object.keys(CATALOG);
const powers=[10,100,1000];
function kinds(t){return Array.isArray(t.tags)?t.tags:[];}
function result(code,extra){const base=CATALOG[code];return {code,title:base.title,body:extra||base.body,reteach:base.reteach};}
function analyze(task,raw){
  if(!task||task.kind==='choice')return null;
  if(task.kind==='paint')return null;
  const expected=parse(task.answer);
  const got=parse(raw);
  if(expected===null)return null;
  if(got===null)return result('format');
  if(got===expected)return null;
  if(Array.isArray(task.common))for(const item of task.common)if(item&&parse(item.v)===got)return result('common',item.msg);
  const tags=kinds(task),multiply=tags.includes('multiply')||task.op==='×',unit=tags.includes('unit');
  if(unit&&powers.some(k=>expected*k===got||got*k===expected))return result('unit_factor');
  if(multiply&&powers.some(k=>expected*k===got||got*k===expected))return result('decimal_places');
  if(!unit&&powers.some(k=>expected*k===got||got*k===expected||expected===got*k))return result('place_shift');
  if(task.op==='+'&&[SCALE/10,SCALE].some(d=>Math.abs(got-expected)===d))return result('carry');
  if(task.op==='−'&&parse(task.b)!==null&&got===parse(task.b)-parse(task.a))return result('operand_order');
  if(tags.includes('round'))return result('rounding');
  if(tags.includes('truncate'))return result('truncation');
  return result('generic');
}
const api={analyze,parse,fa,codes,catalog:CATALOG};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DecimalDiagnose=api;
})(typeof window==='undefined'?globalThis:window);
