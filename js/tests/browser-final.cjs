// Run from repository root: node js/tests/browser-final.cjs
// No live API calls: execute the actual client functions with mocked services.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function extract(file, name) {
  const source = fs.readFileSync(file, 'utf8');
  const re = new RegExp('(?:async )?function ' + name + '\\(');
  const start = source.search(re);
  assert(start >= 0, name);
  for (let end = source.indexOf('}', start); end >= 0; end = source.indexOf('}', end + 1)) {
    const code = source.slice(start, end + 1);
    try { new vm.Script(code); return code; } catch (_) {}
  }
  throw Error('Cannot extract ' + name);
}
function context(file, names, mocks = {}) {
  const ctx = vm.createContext(mocks);
  vm.runInContext(names.map(n => extract(file, n)).join('\n'), ctx);
  return ctx;
}
const snake = 'games/snake-ladder-online.html';
const question = {id:'test',type:'mcq',text:'سؤال',options:'["الف","ب"]',answer:0};
for (const [file, names, fn] of [
  [snake,['parseMaybeJson','optionsArray','normalizeQuestion'],'normalizeQuestion'],
  ['games/hakim-quest.html',['parseMaybeJson','optionsArray','convertServerQuestion'],'convertServerQuestion'],
  ['games/hakim-treasure.html',['parseMaybeJson','convertQ'],'convertQ']
]) {
  const c = context(file,names,{normAns: v => String(v)});
  assert.equal(JSON.stringify(c[fn](question).options),'["الف","ب"]');
  assert.equal(JSON.stringify(c[fn]({...question,options:['الف','ب']}).options),'["الف","ب"]');
}
const vocab = context('games/farsi5-vocab.html',['parseMaybeJson','questionToWord'],{enrichWord:x=>x});
const w = vocab.questionToWord({id:'word',text:'واژه',answer:'["معنی"]',options:'["هم‌معنی","متضاد"]'});
assert.equal(w.meaning,'معنی'); assert.equal(w.synonym,'هم‌معنی'); assert.equal(w.antonym,'متضاد');
const roll = context(snake,['parseRoll'],{SNAKES:[],LADDERS:[]});
assert.equal(roll.parseRoll({dice:0},1),null);
assert.equal(roll.parseRoll({dice:6,newPosition:7},1).to,7);
assert.equal(roll.parseRoll({dice:6,newPosition:98},98).kind,'none');
async function answerTest(result, expected, localQuestion = false) {
  let resolve, calls=0, rolls=0, polls=0;
  const button={};
  const c=context(snake,['submitOnline','afterWrongAnswer'],{
    modalLocked:false,currentQ:question,lastAnswer:null,GAME_ID:'snake-ladder-online',
    room:{code:'mock',phase:'playing',turn:0,myIndex:0,myName:'test',myAnswered:0,myCorrect:0,myWrong:0,players:[{}],localQuestion},
    qmFeedback:{innerHTML:''}, document:{getElementById:()=>button},
    slAnswer:()=>{calls++;return new Promise(r=>resolve=r);},
    hasAnswer:()=>false,esc:String,playCorrect(){},playWrong(){},vibrate(){},hakimReact(){},
    closeModal(){},doOnlineRoll(){rolls++;},pollNow(){polls++;},console:{log(){},warn(){}}
  });
  const pending=c.submitOnline({payload:'الف',localOk:true});
  assert.equal(calls,1); assert.equal(c.room.myCorrect,0); assert.equal(rolls,0);
  resolve(result); await pending;
  assert.equal(c.room.myCorrect,expected===true?1:0);
  assert.equal(c.room.myWrong,expected===false?1:0);
  if(typeof expected==='boolean') {
    button.onclick();
    assert.equal(rolls,expected?1:0);
    assert.equal(polls,expected?0:1);
    assert.equal(calls,1); // wrong answer must not be submitted again
  } else assert.equal(rolls,0);
}
(async()=>{
  await answerTest({ok:true,correct:true},true);
  await answerTest({ok:true,correct:false},false);
  await answerTest({ok:false},null);
  await answerTest({ok:true},null);
  await answerTest({ok:true,correct:false},false,true); // localOk cannot override server
  let animatedFrom;
  const movement=context(snake,['processMoveQueue'],{
    moveAnimating:false,room:{moveQueue:[{i:0,from:5,to:8,mv:{dice:3,mid:8,to:8,kind:'plain'},resolve(){}}],displayed:[],rolls:0},
    animateMoveCore:async(i,mv)=>{animatedFrom=mv.from;},syncPieceOffsets(){},updateHUD(){}
  });
  await movement.processMoveQueue();
  assert.equal(animatedFrom,5);
  assert.equal(movement.room.displayed[0],8);
  const lab=fs.readFileSync('games/lab2d.html','utf8');
  assert.equal((lab.match(/action:'session', type:'session'/g)||[]).length,3);
  assert(!fs.readFileSync('js/hakim-sw-register.js','utf8').includes('global.HakimSec.store.get('));
  console.log('PASS: JSON options/answers, server-only verdicts, waiting/error states, no duplicate wrong-answer submission, dice validation, lab session actions, PWA factory usage');
})().catch(e=>{console.error(e);process.exitCode=1;});
