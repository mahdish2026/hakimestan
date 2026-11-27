// npm install --no-save --package-lock=false jsdom@26
// All endpoints are mocked. No real teacher/student data is requested.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const source=fs.readFileSync('panels/teacher.html','utf8');
const errors=[],calls=[];
let resultMode='ok',saveFails=false,classFails=false;
const payload=Array.from({length:237},(_,i)=>({id:'r'+i,student:'دانش‌آموز '+i,game:'math-fasl2',score:i,completed:i%2===0,date:'2026-11-01',details:'{"stage":1}'}));
const db={classes:[{id:'c',name:'کلاس ابری',grade:'پنجم'}],students:[{id:'s',classId:'c',first:'سارا',last:'آزمایشی'}],grades:[],attendance:{},settings:{}};
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
let deferred=[];
const dom=new JSDOM(source,{url:'https://example.test/panels/teacher.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const nativeTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,delay,...args)=>nativeTimeout(fn,delay===20000?60:delay,...args);
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.confirm=()=>true;w.scrollTo=()=>{};
  w.localStorage.setItem('hakimestan_daftar_v1',JSON.stringify({classes:[{name:'PRIVATE PERSONAL CLASS'}],students:[]}));
  w.localStorage.setItem('hakimestan_panel_filters_v1',JSON.stringify({student:'PRIVATE OLD SEARCH',days:'0'}));
  w.fetch=async(url,opts={})=>{
    const body=JSON.parse(opts.body||'{}');calls.push({body,opts});
    let data={ok:true};
    if(body.action==='tpLogin')data={ok:true,token:'test-token',username:'معلم'};
    if(body.action==='tpGetStats')data={ok:true,stats:{total:237,topStudents:[{name:'<img src=x>',best:'<svg onload=alert(1)>'}],byGame:[]}};
    if(body.action==='tpGetResults'){
      if(resultMode==='timeout')return new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new w.DOMException('Aborted','AbortError'))));
      if(resultMode==='defer')return new Promise(resolve=>deferred.push({resolve,opts}));
      if(resultMode==='fail')throw new Error('mock network failure');
      data={ok:true,results:payload};
    }
    if(body.action==='tpClassGetAll'){
      if(classFails)throw new Error('mock unavailable');
      data={ok:true,data:JSON.parse(JSON.stringify(db))};
    }
    if(body.action==='tpClassSaveAll'&&saveFails)throw new Error('MOCK_SAVE_REJECTED');
    return {ok:true,status:200,json:async()=>data};
  };
}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),settle=()=>new Promise(r=>setTimeout(r,35));
const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}))};
async function login(){ $('passIn').value='  password with spaces  ';$('btnLogin').click();await settle() }
async function blobText(blob){return new Promise(resolve=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.readAsText(blob)})}
(async()=>{try{
  assert.equal(d.body.dataset.theme,'blue','new visitors should get the light studio theme');
  assert.equal($('fStudent').value,'');
  assert.ok(!w.localStorage.getItem('hakimestan_panel_filters_v1').includes('PRIVATE OLD SEARCH'));
  $('togglePassword').click();assert.equal($('passIn').type,'text');$('togglePassword').click();
  await login();assert.equal($('passIn').value,'');
  assert.equal($('heroTeacherName').textContent,'معلم');
  assert.ok($('hakimMount').classList.contains('hidden'),'help must be opt-in');
  w.renderGameChart([null,{game:'math-fasl2',count:12},{game:'<img src=x onerror=alert(1)>',count:5},{game:'math-decimals',count:-10},{game:'math-geometry',count:Infinity}]);
  const meters=Array.from(d.querySelectorAll('.teacher-meter'));
  assert.equal(meters.length,4);assert.equal(meters[0].getAttribute('aria-valuenow'),'12');
  assert.deepEqual(meters.map(e=>Number(e.getAttribute('aria-valuenow'))),[12,5,0,0]);
  assert.ok(meters.every(e=>{const width=parseFloat(e.firstElementChild.style.width);return Number.isFinite(width)&&width>=0&&width<=100}),'chart width escaped finite range');
  assert.equal($('gamesChart').querySelector('img'),null);w.renderGameChart(null);assert.ok($('gamesChart').textContent.includes('هنوز'));

  assert.equal(calls.find(c=>c.body.action==='tpLogin').body.password,'  password with spaces  ','passwords must not be trimmed');
  assert.equal($('topStudents').querySelector('img,svg[onload]'),null,'numeric stats are also untrusted');
  w.showScreen('results');await settle();
  assert.equal($('resultsTable').querySelectorAll('tbody tr').length,50);
  assert.equal($('resultsNext').disabled,false);
  $('resultsNext').click();assert.equal($('resultsTable').querySelector('.detail-result').dataset.idx,'50');
  $('resultsTable').querySelector('.detail-result').click();assert.ok($('detailBody').textContent.includes('دانش‌آموز 50'));
  d.querySelector('[data-close-detail]').click();
  change('resultSort','score');assert.equal(w.__resultsData[0].score,236);
  change('resultCompletion','incomplete');assert.equal(w.__resultsData.length,118);assert.equal($('btnDeleteAll').disabled,true);
  change('resultCompletion','all');change('resultPageSize','100');
  $('resultsNext').click();$('resultsNext').click();assert.equal($('resultsTable').querySelectorAll('tbody tr').length,37);
  w.dispatchEvent(new w.Event('beforeprint'));assert.equal($('resultsTable').querySelectorAll('tbody tr').length,237);
  w.dispatchEvent(new w.Event('afterprint'));assert.equal($('resultsTable').querySelectorAll('tbody tr').length,37);
  w.renderResults([{student:'=HYPERLINK("bad")',game:'math-fasl2',score:'<img src=x>',completed:'false',details:'null'}]);
  assert.equal($('resultsTable').querySelector('img'),null);assert.equal($('resultsTable').querySelector('.badge').textContent,'ناقص');
  w.showDetails(0);assert.ok($('detailBody').textContent.includes('جزئیاتی'));
  w.renderSurveys([null,{rating:-999,name:'سارا'},{rating:1e30,name:'علی'}]);assert.equal($('surveysList').querySelectorAll('.survey-item').length,2);assert.equal(($('surveysList').textContent.match(/⭐/g)||[]).length,5);
  for(const value of ['=1+1',' +SUM(1)','\t@bad','-1','\n=bad'])assert.ok(w.csvCell(value).startsWith('"\''),value);
  let blob;w.URL.createObjectURL=b=>{blob=b;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  $('btnExportCsv').click();assert.ok((await blobText(blob)).includes("'=HYPERLINK"));
  w.readImport(new w.File(['{"results":[null]}'],'bad.json'));await settle();assert.ok($('importModal').classList.contains('hidden'));
  w.readImport(new w.File(['{"results":[{"student":"سارا","game":"math-fasl2","score":9}]}'],'valid.json'));await settle();assert.ok(!$('importModal').classList.contains('hidden'));
  w.readImport({size:6*1024*1024});assert.ok($('importModal').classList.contains('hidden'));assert.equal(w.eval('pendingImport'),null);
  w.readHQF(new w.File(['[]'],'empty.hqf'));await settle();assert.equal($('btnConfirmReplace'),null,'empty file must never offer to replace all questions');
  resultMode='fail';await w.loadResults();assert.equal($('btnExport').disabled,true);assert.equal(w.__resultsData.length,0);assert.ok($('resultsAlert').textContent.includes('mock network'));
  resultMode='timeout';await w.loadResults();assert.ok($('resultsAlert').textContent.includes('بیش از حد'),'timeout needs an actionable message');
  resultMode='defer';w.loadResults();w.loadResults();await settle();assert.equal(deferred.length,2);
  deferred[1].resolve({ok:true,json:async()=>({ok:true,results:[payload[1]]})});await settle();
  deferred[0].resolve({ok:true,json:async()=>({ok:true,results:[payload[0]]})});await settle();assert.equal(w.__resultsData[0].id,'r1','stale response replaced newer filters');
  classFails=true;$('btnDaftarNav').click();await settle();assert.ok(!$('dkBody').textContent.includes('PRIVATE PERSONAL CLASS'),'admin read personal local fallback');
  $('dkClose').click();classFails=false;$('btnDaftarNav').click();await settle();assert.ok($('dkBody').textContent.includes('کلاس ابری'));
  $('dkCNew').click();$('dkCName').value='کلاس جدید';saveFails=true;$('dkCSave').click();await settle();
  assert.ok($('dkCErr').textContent.includes('MOCK_SAVE_REJECTED'));assert.ok($('dkCSave'),'failed save must keep the form open');
  saveFails=false;$('dkCSave').click();await settle();assert.ok($('dkBody').textContent.includes('کلاس جدید'));
  // Exact Persian date conversion and rejection of invalid Gregorian dates through the real grade form.
  d.querySelector('.dk-tab[data-tab="grades"]').click();$('dkGNew').click();
  $('dkGScore').value='18';$('dkGWeight').value='1';$('dkGSubject').value='ریاضی';$('dkGTitle').value='آزمون';$('dkGDate').value='۱۴۰۵/۰۱/۰۱';$('dkGSave').click();await settle();
  assert.equal(calls.filter(c=>c.body.action==='tpClassSaveAll').at(-1).body.data.grades.at(-1).date,'2026-03-21');
  $('dkGNew').click();$('dkGScore').value='18';$('dkGWeight').value='1';$('dkGSubject').value='ریاضی';$('dkGTitle').value='آزمون';$('dkGDate').value='2026-02-30';
  const before=calls.filter(c=>c.body.action==='tpClassSaveAll').length;$('dkGSave').click();await settle();assert.equal(calls.filter(c=>c.body.action==='tpClassSaveAll').length,before);
  assert.ok($('dkGErr').textContent.includes('تاریخ'));
  w.loadResults();await settle();const last=deferred.at(-1);$('btnLogout').click();assert.equal(last.opts.signal.aborted,true);assert.equal($('dkOverlay'),null);
  assert.deepEqual(Array.from(w.__resultsData),[]);assert.equal($('detailBody').textContent,'');assert.equal($('userName').textContent,'معلم');assert.equal($('heroTeacherName').textContent,'معلم عزیز');
  last.resolve({ok:true,json:async()=>({ok:true,results:payload})});await settle();assert.equal(w.__resultsData.length,0,'late response after logout leaked data');
  assert.ok(w.localStorage.getItem('hakimestan_daftar_v1').includes('PRIVATE PERSONAL CLASS'),'personal data was destroyed');
  assert.ok(!w.localStorage.getItem('hakimestan_daftar_v1').includes('کلاس ابری'),'privileged cloud data leaked to personal storage');
  assert.deepEqual(errors,[]);
  console.log('PASS teacher workspace: studio greeting/chart validation, pagination, sorting, completion, print, CSV injection, XSS, import limits, stale responses, class-book isolation, truthful saves, Persian dates, logout cancellation.');
}finally{w.close()}})().catch(e=>{console.error(e);process.exitCode=1});
