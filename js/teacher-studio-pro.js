/* Hakimestan studio tools. Local deterministic guidance, never a remote AI service. */
(function(){
 'use strict';
 var $=function(s){return document.querySelector(s)},body=document.body;
 if(!body||!body.matches('.converter-studio,.lesson-studio'))return;
 var lesson=body.classList.contains('lesson-studio'),drawer=$('#studioGuide');
 var fa=function(n){return String(n).replace(/\d/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'[+c]})};
 if(lesson&&window.Hakim){Hakim.init({container:'#lessonHakimMount'});Hakim.say('سلام! من حکیمم؛ یک طرح باز کن تا مسیر اجرا و قدم بعدی را با هم مرور کنیم.',{mood:'happy',speed:0,permanent:true})}
 function speak(message,mood){if(drawer)drawer.open=true;if(window.Hakim)Hakim.say(message,{mood:mood||'wise',speed:0,permanent:true});else if($('#studioGuideFallback'))$('#studioGuideFallback').textContent=message}
 function guide(kind){
  if(lesson){var snapshot=window.TeacherStudioBridge?.snapshot();if(!snapshot){speak('اول یک طرح از بانک بردار یا طرح تازه بساز؛ راهنمایی من براساس همان طرح خواهد بود.','thinking');return}
   var missing=snapshot.readiness.issues.filter(function(i){return !i.ok});speak(kind==='review'?(missing.length?'پیشنهاد من برای «'+snapshot.plan.title+'»: '+missing[0].title+'؛ '+missing[0].detail:'بخش‌های ساختاری «'+snapshot.plan.title+'» تکمیل‌اند؛ تناسب محتوا با کلاس و درستی علمی را خودت بررسی کن.'):'برای «'+snapshot.plan.title+'»، '+fa(snapshot.rows.length)+' مرحلهٔ زمان‌بندی داری. پیش از کلاس میز اجرا را مرور کن؛ هنگام تدریس از نمای زمان‌سنج استفاده کن.',missing.length?'thinking':'happy');
  }else{var result=window.HQFConverter?.state.result;if(!result){speak('فایل پشتیبان آزمون‌ساز را در میز تبدیل وارد کن، یا نمونهٔ آماده را امتحان کن. من نتیجهٔ تبدیل را همراهت مرور می‌کنم.','thinking');return}
   if(!result.hqf.questions.length){speak('در این تبدیل سؤال معتبری برای خروجی باقی نمانده است. پیام‌های گزارش و پاسخ‌های فایل ورودی را بررسی کن.','thinking');return}
   speak(kind==='review'?(result.issues.length?'در تبدیل '+fa(result.issues.length)+' پیام ثبت شده است. اولین پیام: '+result.issues[0].message:'در بررسی ساختاری تبدیل، پیامی ثبت نشده؛ پاسخ‌ها و محتوای علمی را پیش از بازی مرور کن.'):'اکنون '+fa(result.hqf.questions.length)+' سؤال خروجی داری. نقشهٔ سؤال‌ها را ببین، پیش‌نمایش را بررسی کن و برای حفظ ساختار کامل، فایل JSON بگیر.','wise');
  }
 }
 var types={mcq:'تستی',tf:'درست / نادرست',multi:'چندپاسخی',short:'پاسخ کوتاه',blank:'جای خالی',dropdown:'کشویی',match:'وصل‌کردنی'};
 function updateMap(){var api=window.HQFConverter,summary=$('#studioMapSummary'),map=$('#studioTypeMap');if(!api||!summary||!map)return;var result=api.state.result;map.replaceChildren();if(!result){summary.textContent='با ورود فایل، ترکیب سؤال‌های خروجی را اینجا ببین.';return}
  var qs=result.hqf.questions,counts=Object.create(null),sections=new Set();qs.forEach(function(q){counts[q.type]=(counts[q.type]||0)+1;if(q.section)sections.add(q.section)});summary.textContent=fa(qs.length)+' سؤال · '+fa(Object.keys(counts).length)+' نوع · '+fa(sections.size)+' بخش نام‌گذاری‌شده';
  Object.keys(counts).forEach(function(type){var button=document.createElement('button'),label=document.createElement('span'),count=document.createElement('b');button.type='button';button.dataset.studioType=type;button.dataset.btlProcessed='1';button.style.setProperty('--share',counts[type]/Math.max(1,qs.length)*100+'%');label.textContent=types[type]||type;count.textContent=fa(counts[type]);button.append(label,count);map.append(button)});
 }
 if(!lesson){updateMap();var result=$('#sectionResult');if(result)new MutationObserver(updateMap).observe(result,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}
 document.addEventListener('click',function(e){var demo=e.target.closest('[data-studio-demo]');if(demo){$('#btnSample')?.click();$('#studioWorkbench')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  var help=e.target.closest('[data-studio-guide]');if(help)guide(help.dataset.studioGuide);
  var type=e.target.closest('[data-studio-type]');if(type){var select=$('#previewType');select.value=type.dataset.studioType;select.dispatchEvent(new Event('change',{bubbles:true}));$('#sectionResult')?.scrollIntoView({block:'start'});select.focus({preventScroll:true})}
  if(e.target.closest('[data-studio-session]'))openSession(e.target.closest('[data-studio-session]'));
 });
 // Teaching mode keeps an isolated snapshot. No writes to lesson data or storage.
 var dialog=null,session=null,timer=null,returnFocus=null;
 function stop(){if(timer!==null)clearInterval(timer);timer=null}
 function elapsed(){return session?session.offset+(session.running?performance.now()-session.since:0):0}
 function clock(ms){var sec=Math.max(0,Math.ceil(ms/1000));return fa(Math.floor(sec/60))+':'+fa(String(sec%60).padStart(2,'0'))}
 function pause(){if(!session)return;session.offset=elapsed();session.running=false;stop()}
 function paint(){if(!session)return;var now=elapsed(),total=session.rows[session.rows.length-1].end*60000,index=session.rows.findIndex(function(r){return now<r.end*60000});var done=index<0;index=done?session.rows.length-1:index;var row=session.rows[index];
  $('#studioSessionActivity').textContent=done?'جلسه به پایان زمان‌بندی رسید.':row.activity||'فعالیت بدون توضیح';$('#studioSessionClock').textContent=clock(done?0:row.end*60000-now);$('#studioSessionStep').textContent=done?'پایان مسیر':('مرحلهٔ '+fa(index+1)+' از '+fa(session.rows.length));$('#studioSessionElapsed').textContent='زمان سپری‌شده: '+clock(Math.floor(now/1000)*1000);$('#studioSessionProgress').value=Math.min(now,total);$('#studioSessionProgress').max=total||1;
  $('#studioSessionPlay').textContent=session.running?'مکث':'شروع / ادامه';$('#studioSessionPlay').setAttribute('aria-pressed',String(session.running));$('#studioSessionPlay').disabled=done;$('#studioSessionPrev').disabled=now<=0;$('#studioSessionNext').disabled=done;dialog.querySelectorAll('[data-session-row]').forEach(function(b){b.setAttribute('aria-current',+b.dataset.sessionRow===index?'step':'false')});if(done&&session.running){pause();$('#studioSessionPlay').textContent='پایان مسیر';$('#studioSessionPlay').setAttribute('aria-pressed','false')}
 }
 function jump(index){if(!session)return;pause();session.offset=session.rows[Math.max(0,Math.min(index,session.rows.length-1))].start*60000;paint()}
 function openSession(trigger){if(!lesson)return;var snapshot=window.TeacherStudioBridge?.snapshot();if(!snapshot){speak('برای نمای تدریس ابتدا یک طرح را در ویرایشگر باز کن.','thinking');return}
  var rows=snapshot.rows;if(!rows.length||rows.length>200||rows.some(function(r){return !r.valid||!Number.isFinite(r.end)||r.end*60000>Number.MAX_SAFE_INTEGER})){speak('نمای تدریس به یک تا ۲۰۰ مرحله با زمان معتبر نیاز دارد. از میز اجرا، زمان‌های خالی یا نامعتبر را اصلاح کن.','thinking');return}
  rows=rows.filter(function(r){return r.end>r.start});if(!rows.length){speak('دست‌کم یک مرحله باید زمان بیشتر از صفر داشته باشد.','thinking');return}
  if(!dialog){dialog=document.createElement('dialog');dialog.id='studioSession';dialog.className='studio-session';dialog.setAttribute('aria-labelledby','studioSessionTitle');dialog.innerHTML='<div class="studio-session-head"><div><span class="studio-overline">LIVE CLASS / همراه حکیم</span><h2 id="studioSessionTitle"></h2></div><button type="button" id="studioSessionClose">بستن نمای تدریس ×</button></div><div class="studio-session-grid"><section class="studio-session-stage" aria-label="مرحلهٔ جاری"><span id="studioSessionStep"></span><div id="studioSessionClock" role="timer" aria-label="زمان باقی‌ماندهٔ مرحله" aria-live="off"></div><p id="studioSessionActivity" tabindex="0" role="region" aria-label="شرح فعالیت مرحلهٔ جاری"></p><progress id="studioSessionProgress" aria-label="پیشرفت زمانی جلسه"></progress><p id="studioSessionElapsed"></p><div class="studio-session-controls"><button type="button" id="studioSessionPrev">مرحلهٔ قبل</button><button type="button" id="studioSessionPlay" aria-pressed="false">شروع / ادامه</button><button type="button" id="studioSessionNext">مرحلهٔ بعد</button></div><p class="studio-session-note">نسخهٔ مستقل از طرح بازشده؛ جابه‌جایی مرحله زمان‌سنج را مکث می‌کند. با بستن این نما، زمان‌سنج پاک می‌شود؛ طرح شما تغییر نمی‌کند.</p></section><nav id="studioSessionRows" aria-label="انتخاب مرحلهٔ تدریس"></nav></div>';document.body.append(dialog);
   $('#studioSessionClose').onclick=function(){dialog.close()};dialog.addEventListener('close',function(){stop();session=null;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true})});
   $('#studioSessionPlay').onclick=function(){if(!session)return;if(session.running)pause();else{session.running=true;session.since=performance.now();timer=setInterval(paint,250)}paint()};
   $('#studioSessionPrev').onclick=function(){var current=session.rows.findIndex(function(r){return elapsed()<r.end*60000});jump((current<0?session.rows.length:current)-1)};
   $('#studioSessionNext').onclick=function(){var current=session.rows.findIndex(function(r){return elapsed()<r.end*60000});if(current===session.rows.length-1){pause();session.offset=session.rows[current].end*60000;paint()}else jump(current+1)};
   $('#studioSessionRows').addEventListener('click',function(e){var row=e.target.closest('[data-session-row]');if(row)jump(+row.dataset.sessionRow)});
  }
  stop();session={rows:rows.map(function(r){return Object.assign({},r)}),offset:0,running:false,since:0};returnFocus=trigger;$('#studioSessionTitle').textContent=snapshot.plan.title;var list=$('#studioSessionRows');list.replaceChildren();session.rows.forEach(function(r,i){var button=document.createElement('button');button.type='button';button.dataset.sessionRow=String(i);button.textContent=fa(i+1)+' / '+(r.activity||'فعالیت بدون توضیح')+' · '+fa(r.end-r.start)+' دقیقه';list.append(button)});paint();dialog.showModal();$('#studioSessionPlay').focus();
 }
 window.addEventListener('pagehide',function(){pause()});
})();
