// npm install --no-save --package-lock=false jsdom@26
// No external resources are loaded and the Apps Script API is fully mocked.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('payamresan.html','utf8');
const pause=(ms=35)=>new Promise(r=>setTimeout(r,ms));
const errors=[],requests=[],posted=[],deferred=[];
let holdMessages=false,holdPosts=false,rejectWipe=false,finishBody;
const response=data=>({ok:true,status:200,type:'basic',text:async()=>JSON.stringify(data),json:async()=>data});
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'https://example.test/payamresan.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('hk_session',JSON.stringify({username:'آزمایش',at:Date.now()}));w.localStorage.setItem('hk_no_stats','1');
 w.localStorage.setItem('hk_me',JSON.stringify({display:'نام پروفایل حساب اول'}));
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};
 w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
 w.URL.createObjectURL=()=> 'blob:mock';w.URL.revokeObjectURL=()=>{};
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,AA==';
 w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.play=async()=>{};
 w.Notification=Object.assign(function(){},{permission:'denied'});w.navigator.vibrate=()=>{};
 w.fetch=(url,init={})=>{
  const u=new URL(url);let action=u.searchParams.get('action'),body={};if(init.body){body=JSON.parse(init.body);action=body.action}
  requests.push({action,body,init});
  if(action==='slowBody')return Promise.resolve({ok:true,status:200,type:'basic',text:()=>new Promise(resolve=>finishBody=resolve)});
  if(action==='html200')return Promise.resolve({ok:true,status:200,type:'basic',text:async()=>'<html>Sign in required</html>'});
  if(action==='messages'&&holdMessages)return new Promise(resolve=>deferred.push({resolve,init,action}));
  if(action==='message'){
   if(holdPosts)return new Promise(resolve=>deferred.push({resolve,init,action}));
   posted.push(body);return Promise.resolve(response({ok:true}));
  }
  let data={ok:true};
  if(action==='messages')data={messages:[],serverTime:new Date().toISOString()};
  if(action==='users')data={users:[{username:'آزمایش',role:'teacher'},{username:'دوم',role:'student'}]};
  if(action==='groups')data={groups:['عمومی']};if(action==='words')data={words:[]};if(action==='reads')data={reads:{}};
  if(action==='wipeAll'&&rejectWipe)data={ok:false,error:'MOCK_SERVER_REJECTED'};
  return Promise.resolve(response(data));
 };
}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id);
async function logout(H){H.Ui.confirmDlg=async()=>true;H.Auth.logout();await pause()}
(async()=>{try{
 await pause(100);const H=w.HK;assert.ok(H?.V3);H.Poll.stop();

 assert.equal(H.S.role,'student','public users list must not authenticate a restored teacher username');
 assert.equal(H.S.profile.display,'نام پروفایل حساب اول','legacy profile must migrate to its existing session owner');
 assert.equal(H.U.safeParse('{"normal":{"value":1}}',null).normal.value,1,'normal JSON objects were rejected by inherited constructor');
 for(const json of ['{"__proto__":{"polluted":1}}','{"nested":{"constructor":{"prototype":{"polluted":1}}}}'])assert.equal(H.U.safeParse(json,null),null);
 assert.equal({}.polluted,undefined);
 assert.deepEqual(Array.from(H.U.uniq(['__proto__','constructor','__proto__'])),['__proto__','constructor']);
 H.DB.set('users','corrupt');assert.ok(Array.isArray(H.DB.get('users',[])));H.DB.set('profiles',[]);assert.equal(Array.isArray(H.DB.get('profiles',{})),false);
 const slowRead=H.Net.postJSON({action:'slowBody'},{timeout:25});await assert.rejects(slowRead,{name:'TimeoutError'});finishBody('{"ok":true}');
 assert.equal(await H.Net.postDB({action:'html200'}),null,'HTTP 200 HTML is not acknowledgement of a write');
 assert.equal($('swE2EE').disabled,true,'legacy XOR must not masquerade as E2EE');
 H.App.openChat('group','عمومی');
 $('msgInput').value='پیش‌نویس خصوصی حساب اول';H.Compose.saveDraftNow();
 const draft=H.DB.get('drafts',{});assert.ok(Object.keys(draft).some(k=>JSON.parse(k)[0]==='آزمایش'));
 H.Profile.saveLocal('آزمایش',{display:'نام حساب اول',bio:'',avatar:''});
 // Valid backup strings must actually restore, and nested hostile keys must fail closed.
 const row={id:'import-test',from:'=HYPERLINK("bad")',to_group:'عمومی',to_user:'',text:'متن، با "نقل قول"',date:new Date().toISOString()};
 assert.equal(H.Data.importJSON(JSON.stringify({messages:[row]})),1);
 assert.equal(H.Data.importJSON('{"messages":[null]}'),-1);
 assert.equal(H.Data.importJSON('{"messages":[],"nested":{"__proto__":{}}}'),-1);
 let blob;w.URL.createObjectURL=b=>{blob=b;return 'blob:test'};w.HTMLAnchorElement.prototype.click=function(){};
 H.Data.exportCSV();
 const csv=await new Promise(resolve=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.readAsText(blob)});
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'),'all CSV cells must neutralise spreadsheet formulas');
 assert.ok(csv.includes('با ""نقل قول""'),'quotes in all CSV columns must remain valid');
 H.S.messages=[H.Norm.msg({...row,from:'<img src=x onerror=alert(1)>',text:'<svg onload=alert(1)>'})];H.App.renderAll('all');
 assert.equal($('msgs').querySelector('img,svg[onload]'),null,'message sender/content injection');
 // Exercise PIN through settings and the real unlock form, without exporting security internals.
 H.Ui.promptDlg=async()=> '1234';await H.Settings.openPinDialog();assert.ok($('appLock').classList.contains('open'));
 $('appLockPin').value='0000';$('appLockGo').click();assert.ok($('appLock').classList.contains('open'));
 $('appLockPin').value='1234';$('appLockGo').click();assert.equal($('appLock').classList.contains('open'),false,'correct PIN could not unlock because string hash was compared with a number');
 const pin=H.DB.get('hk_pin_enc');H.Ui.promptDlg=async()=> 'wrong';await H.Settings.openPinDialog();assert.equal(H.DB.get('hk_pin_enc'),pin,'wrong current PIN must not reset lock');
 H.DB.del('hk_pin_enc');
 // Own typing record must not show up as another person (typing_ has seven characters).
 H.Typing.ping();await pause(1050);assert.equal(H.Typing.isTyping(),false,'self-typing indicator leaked through prefix slicing');H.Typing.stopAll();
 // A delayed media read must not deliver to a conversation selected in the meantime.
 let finishRead;const originalRead=H.U.blobToDataURL;H.U.blobToDataURL=()=>new Promise(resolve=>finishRead=resolve);
 const mediaSend=H.Attach.send(new w.File(['safe'],'note.txt',{type:'text/plain'}),'', 'file');await pause();
 H.App.openChat('pv','دوم');finishRead('data:text/plain;base64,c2FmZQ==');await mediaSend;
 assert.equal(posted.length,0,'attachment from old chat was sent to the new recipient');H.U.blobToDataURL=originalRead;
 H.App.openChat('group','عمومی');
 // Late microphone permission must release the track, not start recording in another chat.
 let releasePermission,stoppedTracks=0;
 w.navigator.mediaDevices={getUserMedia:()=>new Promise(resolve=>releasePermission=resolve)};
 w.MediaRecorder=class {constructor(){throw new Error('stale permission must never instantiate a recorder')}};
 const starting=H.Recorder.start();H.App.openChat('pv','دوم');
 releasePermission({getTracks:()=>[{stop(){stoppedTracks++}}]});await starting;
 assert.equal(stoppedTracks,1);H.App.openChat('group','عمومی');
 // Queue must preserve the first account's work without displaying/sending it as account two.
 const future={action:'message',from_user:'آزمایش',to_group:'عمومی',text:'پیام برنامه‌ریزی‌شده',clientId:'future-a',date:new Date().toISOString()};
 H.Outbox.add(future,'برنامه‌ریزی‌شده',Date.now()+3600000);
 holdMessages=true;const pendingRead=H.Data.fetchMessages();await pause();const staleRead=deferred.find(x=>x.action==='messages');
 assert.ok(staleRead);
 await logout(H);assert.equal(H.S.me,null);assert.equal(H.S.role,'student');assert.equal(H.S.messages.length,0);assert.equal($('msgs').textContent,'');assert.equal($('teacherBody').textContent,'');assert.equal($('msgInput').value,'');
 assert.equal(staleRead.init.signal.aborted,true,'logout did not abort API requests');
 staleRead.resolve(response({messages:[{...row,text:'STALE SECRET'}]}));await pendingRead;assert.equal(H.S.messages.length,0,'late read repopulated messages after logout');holdMessages=false;
 H.Auth.loginSuccess('دوم','student');H.Poll.stop();await pause();assert.equal(H.S.outbox.length,0);assert.equal(H.S.profile.display,'','global profile leaked to another account');
 H.Compose.restoreDraft();assert.equal($('msgInput').value,'','another user’s draft leaked');await H.Outbox.flush();assert.equal(posted.length,0,'another account sent the first user’s queue');
 H.Outbox.add({action:'message',from_user:'دوم',to_group:'عمومی',text:'دوم',clientId:'future-b'},'دوم',Date.now()+3600000);
 assert.equal(H.DB.get('outbox',[]).length,2,'saving a different account erased the first account queue');
 H.DB.softClear();assert.ok(H.DB.get('outbox',[]).some(x=>x.id==='future-a'),'clear local account cache erased another user’s pending messages');
 await logout(H);H.Auth.loginSuccess('آزمایش','student');H.Poll.stop();assert.equal($('msgInput').value,'پیش‌نویس خصوصی حساب اول','login must restore the account draft before any navigation blur');await pause(120);assert.equal(H.S.outbox.length,1);H.Compose.restoreDraft();assert.equal($('msgInput').value,'پیش‌نویس خصوصی حساب اول','delayed focus must not erase a restored account draft');
 // Logout while a POST is pending must not acknowledge or delete it in a newer session.
 H.S.outbox[0].at=Date.now();H.Outbox.save();holdPosts=true;const posting=H.Outbox.flush();await pause();const stalePost=deferred.find(x=>x.action==='message');assert.ok(stalePost);
 await logout(H);H.Auth.loginSuccess('دوم','student');H.Poll.stop();stalePost.resolve(response({ok:true}));await posting;
 assert.ok(H.DB.get('outbox',[]).some(x=>x.id==='future-a'),'late send completion removed another account queue');holdPosts=false;
 // A rejected destructive endpoint must not erase local data or display a successful wipe.
 H.S.role='teacher';H.S.authenticated=true;H.S.teacherTab='tools';H.App.showPage('teacher');H.Poll.stop();rejectWipe=true;
 const secret=H.Norm.msg({...row,id:'keep',text:'KEEP AFTER REJECTED WIPE'});H.S.messages=[secret];
 $('tWipeAll').click();await pause(80);assert.equal(H.S.messages[0].text,'KEEP AFTER REJECTED WIPE');assert.equal($('tWipeAll').disabled,false);
 assert.ok(!$('toasts').textContent.includes('همه پیام‌ها پاک شدن'),'rejected wipe was announced as successful');
 assert.deepEqual(errors,[]);
 console.log('PASS messenger workspace: safe JSON/import, CSV injection, PIN unlock/reset, corrupt storage, XSS, self-typing, delayed media, per-account drafts/profile/outbox, logout cancellation and rejected wipe.');
}finally{w.close()}})().catch(e=>{console.error(e);process.exitCode=1});
