/* View state only. Original converter remains the owner of data and exports. */
(function(){
 'use strict';
 var body=document.body;if(!body||body.dataset.workdesk!=='converter')return;
 var $=function(s){return document.querySelector(s)},result=$('#sectionResult'),focus=$('#deskFocus'),density=$('#deskDensity');
 var view='questions';
 function applyView(next){
  if(!['questions','report','code'].includes(next))return;
  view=next;body.dataset.resultView=view;
  document.querySelectorAll('button[data-result-view]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.resultView===view))});
  if(view==='code'&&$('#jsonPanel').classList.contains('hidden'))$('#btnPreview').click();
 }
 function sync(){var api=window.HQFConverter,res=api?.state.result,ready=!!res&&!result.classList.contains('hidden');
  focus.disabled=!ready;body.dataset.deskReady=String(ready);
  if(!ready){body.dataset.deskFocus='false';focus.setAttribute('aria-pressed','false');focus.textContent='نمای تمرکز ↗';applyView('questions')}
  $('#deskDocumentTitle').textContent=ready?(res.hqf.meta.title||'آزمون بدون عنوان'):'پروژهٔ سؤال تازه';
  $('#deskDocumentStatus').textContent=ready?String(res.hqf.questions.length).replace(/\d/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'[+c]})+' پرسش در خروجی':'منتظر فایل ورودی';
  $('#deskCleanReport').hidden=!ready||res.issues.length>0;
  var badge=$('#deskIssueBadge');badge.hidden=!ready||!res.issues.length;var count=ready?String(res.issues.length).replace(/\d/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'[+c]}):'';if(badge.textContent!==count)badge.textContent=count;
  document.querySelectorAll('[data-desk-step]').forEach(function(a){var locked=a.dataset.deskStep!=='source'&&!ready;a.setAttribute('aria-disabled',String(locked));a.setAttribute('aria-current',ready?(a.dataset.deskStep==='result'?'step':'false'):(a.dataset.deskStep==='source'?'step':'false'))});
 }
 focus.addEventListener('click',function(){if(focus.disabled)return;var enabled=body.dataset.deskFocus!=='true';body.dataset.deskFocus=String(enabled);focus.setAttribute('aria-pressed',String(enabled));focus.textContent=enabled?'بازگشت به میز کامل ↙':'نمای تمرکز ↗';$('#studioWorkbench').scrollIntoView({block:'start'})});
 density.addEventListener('click',function(){var list=body.dataset.questionLayout!=='list';body.dataset.questionLayout=list?'list':'cards';density.setAttribute('aria-pressed',String(list));density.textContent=list?'نمای کارت':'نمای فهرست'});
 document.addEventListener('click',function(e){var target=e.target.closest('button[data-result-view]');if(target)applyView(target.dataset.resultView);if(e.target.closest('#btnPreview'))applyView($('#jsonPanel').classList.contains('hidden')?'questions':'code');var step=e.target.closest('[data-desk-step][aria-disabled="true"]');if(step){e.preventDefault();$('#sectionUpload').focus();$('#sectionUpload').scrollIntoView({block:'start'})}});
 new MutationObserver(sync).observe(result,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
 applyView('questions');sync();
})();
