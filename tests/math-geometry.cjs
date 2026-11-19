const assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../games/math-geometry/data.js');
assert.equal(D.stages.length,12);const tasks=D.stages.flatMap(s=>s.tasks);
assert.equal(tasks.length,48);assert.equal(new Set(tasks.map(t=>t.id)).size,48);
for(const t of tasks){
 assert(t.prompt&&t.hint&&t.why);
 const answer=t.type==='grid'?t.expected.map(D.key):t.answer;
 assert(D.correct(t,answer),t.id+' expected answer rejected');
 assert(!D.correct(t,null),t.id+' accepts empty answer');
 if(t.type==='grid'){
  assert.equal(new Set(answer).size,answer.length);
  t.expected.forEach(p=>assert(p.every(v=>Number.isInteger(v)&&v>=0&&v<=8)));
  if(t.axis!=='none')assert.deepEqual(t.expected,t.points.map(p=>D.reflect(p,t.axis)));
  assert(!D.correct(t,[...answer,'0,0']),t.id+' extra point accepted');
 }else if(['axes','properties'].includes(t.type))assert(!D.correct(t,[]));
 else if(t.type==='number'){
  const fa=String(t.answer).replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]);assert(D.correct(t,fa));assert(!D.correct(t,t.answer+1));
 }else assert(!D.correct(t,-1));
}
for(const axis of ['v','h','d','c'])for(const p of [[0,0],[2,6],[4,4],[8,1]])assert.deepEqual(D.reflect(D.reflect(p,axis),axis),p);
const panel=fs.readFileSync('panels/teacher.html','utf8');
assert(panel.includes("'math-geometry':'نقشستان'"));
assert(panel.includes('<option value="math-geometry">نقشستان</option>'));
assert(panel.includes("'games/math-geometry.html':'نقشستان'"));
const sw=fs.readFileSync('sw.js','utf8');
for(const file of ['games/math-geometry.html','games/math-geometry/style.css','games/math-geometry/data.js','games/math-geometry/app.js'])assert(sw.includes("'./"+file+"'"));
console.log('PASS: 12 lessons, 48 validated tasks; reflection involution, input validation, teacher mappings, offline assets.');
