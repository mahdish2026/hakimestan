const assert=require('node:assert/strict'),D=require('../games/math-decimals/data.js');
assert.equal(D.stages.length,10);assert.equal(new Set(D.stages.flatMap(s=>s.tasks.map(t=>t.id))).size,60);
for(const s of ['۰٫۳۷','٠٫٣٧','0.370'])assert.equal(D.parse(s),370000);
for(const s of ['',null,'1e3','Infinity','-1','0.1.2','1/2/3','7/10','<img>','1,000'])assert.equal(D.parse(s),null);
assert.equal(D.calculate('0.1','+','0.2'),300000);assert.equal(D.calculate('0.82','−','0.456'),364000);assert.equal(D.calculate('0.6','×','0.35'),210000);
for(let a=0;a<=100;a++)for(let b=0;b<=100;b++){assert.equal(D.calculate((a/100).toFixed(2),'+',(b/100).toFixed(2)),(a+b)*10000);assert.equal(D.calculate((a/100).toFixed(2),'×',(b/100).toFixed(2)),a*b*100);}
for(const s of D.stages)for(const t of s.tasks){assert.equal(D.correct(t,t.answer===null?'0.35':t.answer,{jumps:5,x:2,y:4}),true,t.id);assert.equal(D.correct(t,t.kind==='choice'?99:'99999',{jumps:5,x:2,y:4}),false,t.id);}
const between=D.stages[2].tasks[2];for(const x of ['0.3','0.4','0.299','0.401'])assert(!D.correct(between,x));assert(D.correct(between,'0.300001'));assert(!D.correct(D.stages[6].tasks[0],'3.5',{jumps:0}));assert(!D.correct(D.stages[7].tasks[0],'0.08',{x:0,y:0}));console.log('PASS: exact decimal parser, 20,402 arithmetic combinations, all 60 task validators and practical gates.');
