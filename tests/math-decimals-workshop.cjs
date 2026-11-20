const assert=require('node:assert/strict'),D=require('../games/math-decimals/data.js'),W=require('../games/math-decimals/workshop.js');
const fromSteps=s=>s.reduce((n,x)=>n+x.digit*10**(3-x.index),0);
let cases=0;
for(let a=0;a<=9000;a+=137)for(let b=0;b<=9000;b+=191){for(const op of ['+','−']){if(op==='+'&&a+b>=10000||op==='−'&&a<b)continue;const t={a:(a/1000).toFixed(3),b:(b/1000).toFixed(3),op};const steps=W.columnSteps(t);assert.equal(steps.length,4);assert.equal(fromSteps(steps),op==='+'?a+b:a-b);assert(W.columnComplete(t,steps.map(x=>x.digit)));assert(!W.columnComplete(t,new Array(4)));cases++;}}
for(const t of D.stages.flatMap(s=>s.tasks).filter(t=>t.op)){const steps=W.columnSteps(t);assert.equal(fromSteps(steps)*1000,D.parse(t.answer));for(let i=0;i<4;i++){const wrong=steps.map(x=>x.digit);wrong[i]=(wrong[i]+1)%10;assert.equal(W.validColumns(t,wrong).length,i);}}
assert.equal(W.columnSteps({a:'0.820',b:'0.456',op:'−'}).filter(s=>s.exchange).length,2);
assert.equal(W.columnSteps({a:'2.28',b:'1.47',op:'+'})[2].incoming,1);
for(const s of D.stages)for(let i=0;i<3;i++){const h=W.visual(s.id,i);assert(h.includes('figcaption'));assert(!h.includes('NaN'));}
console.log('PASS: '+cases+' independent integer-oracle column cases, carry/borrow through zero, invalid prefix rejection, 30 lesson visual states.');
