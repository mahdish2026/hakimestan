// npm install --no-save --package-lock=false jsdom@26.1.0
// Local-only fixtures: no production data, network requests, or real downloads.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function mount(file,seed={}){
 const errors=[],requests=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 // jsdom 26 cannot parse CSS paged-media margin boxes; Chromium tests use the untouched page.
 const source=fs.readFileSync(file,'utf8').replace(/@page\{@bottom-center\{[^}]*\}\}/g,'');
 const timers=new Set();let closed=false;
 const dom=new JSDOM(source,{url:'https://example.test/'+file,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  for(const name of ['setTimeout','setInterval']){const native=w[name].bind(w);w[name]=(fn,ms,...args)=>{if(closed)return 0;const handle=native(fn,ms,...args);timers.add(handle);return handle}}
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.confirm=()=>true;w.alert=()=>{};
  Object.defineProperty(w.navigator,'onLine',{value:false});w.fetch=async url=>{requests.push(url);throw Error('Unexpected network')};
  w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  Object.entries(seed).forEach(([k,v])=>w.localStorage.setItem(k,v));
 }});
 return {w:dom.window,d:dom.window.document,errors,requests,close:()=>{closed=true;timers.forEach(h=>{dom.window.clearTimeout(h);dom.window.clearInterval(h)});dom.window.close()}};
}
async function until(fn,label){for(let i=0;i<100;i++){if(fn())return;await sleep(10)}throw Error('Timed out: '+label)}
function fixture(n=73){return {title:'آزمون آزمایشی',subject:'ریاضی',grade:'پنجم',questions:Array.from({length:n},(_,i)=>({type:'mcq',text:'پرسش شماره '+i,options:['الف','ب','ج','د'],answer:i%4,score:1}))}}
(async()=>{
 let saved;
 const t=mount('hqf-converter.html'),{w,d}=t,C=w.HQFConverter,$=id=>d.getElementById(id);
 try{
  assert.ok(C);assert.equal(C.version,'3.0');assert.equal(d.querySelectorAll('#hakimMount').length,1);
  assert.throws(()=>C.parseSafeJSON('{"nested":{"__proto__":{"polluted":true}}}'));
  assert.throws(()=>C.parseSafeJSON('{"constructor":{}}'));assert.equal({}.polluted,undefined);
  assert.throws(()=>C.validateExams(Array(101).fill(fixture(1))));assert.throws(()=>C.validateExams([fixture(10001)]));
  assert.throws(()=>C.loadExamObjects({questions:[null]}));assert.equal(C.state.exams.length,0);
  const typed={title:'انواع سؤال',questions:[{type:'mcq',text:'تستی',options:['الف','ب'],answer:'۱'},{type:'tf',text:'درست یا غلط',answer:true},{type:'multi',text:'چند پاسخ',options:['الف','ب'],answer:['۰','۱']},{type:'short',text:'کوتاه',shortAnswers:['۱۲']},{type:'blank',text:'___ چیست',blankAnswers:['پاسخ']},{type:'dropdown',text:'انتخاب',dropdownOptions:['الف','ب'],dropdownAnswer:'ب'},{type:'match',text:'وصل کن',pairs:[['الف','ب']]},{type:'essay',text:'توضیح بده',sampleAnswer:'پاسخ نمونه'}]};
  const all=C.convert([{data:typed}],{...C.options(),essayToShort:true});assert.equal(all.hqf.questions.length,8);assert.equal(all.hqf.questions[0].answer,1);assert.equal(all.hqf.questions[3].answer[0],'12');
  const same=C.convert([{data:{title:'تکرار',questions:[fixture(1).questions[0],fixture(1).questions[0]]}}],C.options());assert.equal(same.hqf.questions.length,2);assert.ok(same.issues.some(i=>i.message.includes('تکراری')),'duplicates are reported, never silently removed');
  C.loadExamObjects(fixture());assert.equal(C.state.result.hqf.questions.length,73);assert.equal(d.querySelectorAll('.q-card').length,24);
  $('previewNext').click();assert.equal(d.querySelector('.q-num').textContent,'۲۵');
  $('previewSearch').value='شماره 72';$('previewSearch').dispatchEvent(new w.Event('input'));await sleep(180);
  assert.equal(d.querySelectorAll('.q-card').length,1);assert.ok(d.querySelector('.q-text').textContent.includes('72'));
  assert.equal(C.state.result.hqf.questions.length,73,'preview search must not truncate exports');
  $('previewType').value='match';$('previewType').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.q-card').length,0);
  $('previewType').value='';$('previewType').dispatchEvent(new w.Event('change'));
  $('hidePreviewAnswers').checked=true;$('hidePreviewAnswers').dispatchEvent(new w.Event('change'));assert.ok($('qGrid').classList.contains('studio-hide-answers'));
  w.dispatchEvent(new w.Event('beforeprint'));assert.equal(d.querySelectorAll('.q-card').length,73,'print must include the entire unfiltered export');
  w.dispatchEvent(new w.Event('afterprint'));assert.equal(d.querySelectorAll('.q-card').length,1);assert.ok($('qGrid').classList.contains('studio-hide-answers'));
  C.flushDraftNow();saved=w.localStorage.getItem('hakimestan_hqf_converter_v1');assert.ok(saved.includes('شماره 72'));
  C.state.result.hqf.questions[0].text='\t=HYPERLINK("bad")';assert.ok(C.csvText().includes('"\'\t=HYPERLINK(""bad"")"'));
  C.state.result.hqf.questions[0].text='<img src=x onerror=alert(1)>';w.dispatchEvent(new w.Event('beforeprint'));assert.equal($('qGrid').querySelector('img'),null);w.dispatchEvent(new w.Event('afterprint'));
  const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(){throw Error('quota')};C.flushDraftNow();assert.ok($('converterStorageState').textContent.includes('انجام نشد'));w.Storage.prototype.setItem=set;
  C.clearDraftStorage();C.state.exams=[];C.state.selectedId=null;C.state.result=null;
  C.handleFiles([new w.File(['\uFEFF'+JSON.stringify(fixture(2))],'exam.json')]);await until(()=>$('sectionUpload').getAttribute('aria-busy')==='false','valid file');assert.equal(C.state.exams.length,1);
  C.handleFiles([new w.File([JSON.stringify(fixture(2))],'unsafe.json'),new w.File(['{"__proto__":{}}'],'attack.json')]);await until(()=>$('sectionUpload').getAttribute('aria-busy')==='false','mixed files');assert.equal(C.state.exams.length,2);assert.ok($('uploadMsg').textContent.includes('ناامن'));
  C.handleFiles([new w.File(['"unclosed'],'bad.csv')]);await until(()=>$('sectionUpload').getAttribute('aria-busy')==='false','malformed CSV');assert.ok($('uploadMsg').textContent.includes('بسته نشده'));
  const prior=C.state.exams.length;C.handleFiles([{name:'huge.json',size:6*1024*1024}]);assert.equal(C.state.exams.length,prior);assert.ok($('uploadMsg').textContent.includes('۵ مگابایت'));
  C.handleFiles([new w.File([JSON.stringify(fixture(1))],'late.json')]);C.clearDraftStorage();C.state.exams=[];C.state.result=null;await sleep(80);assert.equal(C.state.exams.length,0,'reset must invalidate pending reads');
  assert.deepEqual(t.errors,[]);assert.deepEqual(t.requests,[]);
 }finally{t.close()}
 const reboot=mount('hqf-converter.html',{hakimestan_hqf_converter_v1:saved});try{assert.equal(reboot.w.HQFConverter.state.result.hqf.questions.length,73)}finally{reboot.close()}
 const damagedDraft='{"__proto__":{}}',damaged=mount('hqf-converter.html',{hakimestan_hqf_converter_v1:damagedDraft});try{assert.equal(damaged.w.localStorage.getItem('hakimestan_hqf_converter_v1'),damagedDraft);assert.equal(damaged.d.getElementById('btnRecoverDraft').hidden,false)}finally{damaged.close()}
 const p=mount('tarh-dars.html');try{
  const e=code=>p.w.eval(code);
  assert.throws(()=>e('parseStudioJSON(\'{"x":{"constructor":{}}}\')'));assert.equal({}.polluted,undefined);
  assert.equal(e('BANK.every(p=>!!validatePlan(p))'),true);
  e('begin(BANK[0],true)');assert.ok(p.d.getElementById('planTitle'));e('lessonReview()');assert.equal(p.d.getElementById('modal').open,true);assert.ok(p.d.querySelectorAll('.studio-review-item').length>=8);
  assert.equal(e('lessonReadiness(active).issues.find(i=>i.title==="بودجهٔ زمان").ok'),true);
  assert.ok(e('lessonReviewText(active)').includes('کسر'));assert.ok(e('lessonRunRows(active).at(-1).end===active.duration'));
  e('active.sections.find(s=>s.kind==="timeline").rows[0][0]="-3"');assert.equal(e('lessonReadiness(active).invalid'),true);assert.ok(e('lessonReviewText(active)').includes('زمان نامعتبر'));
  e('active.sections.find(s=>s.kind==="timeline").rows[0][0]="Infinity"');assert.equal(e('lessonReadiness(active).invalid'),true);
  e('active.title="<img src=x onerror=alert(1)>";lessonReview()');assert.equal(p.d.getElementById('modalBody').querySelector('img'),null);
  const sid=e('active.sections[0].id');e('ACT["review-jump"]({dataset:{id:active.sections[0].id}})');assert.equal(p.d.getElementById('modal').open,false);assert.ok(p.d.querySelector(`[data-section="${sid}"]`).open);
  e('begin(BANK[0],true);savePlan(true)');const raw=p.w.localStorage.getItem('hakimestan_tarhdars_v1');assert.ok(JSON.parse(raw).myPlans.length);e('validateStore(parseStudioJSON(localStorage.getItem(KEY)))');
  assert.ok(e('IO.csv([["\\t=CMD()"]])').includes("'\t=CMD()"));
  // Real ZIP bytes from the local Office writer; verify roundtrip and CRC rejection.
  const blob=e('IO.zip({"word/document.xml":"<document>fixture</document>"})');const bytes=await new Promise(resolve=>{const r=new p.w.FileReader();r.onload=()=>resolve(r.result);r.readAsArrayBuffer(blob)});
  p.w.__zip=bytes;const unpacked=await e('IO.unzip(window.__zip)');assert.equal(unpacked['word/document.xml'],'<document>fixture</document>');
  const corrupt=bytes.slice(0);new Uint8Array(corrupt)[30+'word/document.xml'.length]^=1;p.w.__zip=corrupt;await assert.rejects(e('IO.unzip(window.__zip)'),/یکپارچگی/);
  const storeBefore=e('JSON.stringify(store)');await assert.rejects(e('processFiles([{size:49*1024*1024}])'),/۴۸/);assert.equal(e('JSON.stringify(store)'),storeBefore);
  // Generation mismatch cannot reopen an import preview after navigation.
  e('window.__release=null;window.__pending=processFiles([{name:"late.txt",size:20,text:()=>new Promise(r=>window.__release=r)}],importJob);go("home");window.__release("متن طرح")');await e('window.__pending');assert.equal(p.d.getElementById('modal').open,false);
  assert.deepEqual(p.errors,[]);assert.deepEqual(p.requests,[]);
 }finally{p.close()}
 const bad='{"__proto__":{},"version":1}',broken=mount('tarh-dars.html',{hakimestan_tarhdars_v1:bad});try{assert.equal(broken.w.eval('broken'),true);assert.equal(broken.w.localStorage.getItem('hakimestan_tarhdars_v1'),bad)}finally{broken.close()}
 console.log('PASS teacher ateliers: bounded imports, hostile JSON/CSV, draft/print/preview isolation, stale reads, lesson readiness/run-sheet, legacy store compatibility, Office ZIP integrity and failed storage.');
})().catch(e=>{console.error(e);process.exitCode=1});
