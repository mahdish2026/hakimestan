// Offline regression checks against an in-memory CacheStorage, without live endpoints.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const handlers = {}, scope = 'https://school.example/site/';
let writes = 0, online = true, broken = false, pending;
const entries = new Map();
const ctx = { URL, Request, Response, console, caches: {
  match: async (r, opts) => { if (broken) throw Error('storage unavailable'); return entries.get((opts?.cacheName || '') + (r.url || r))?.clone(); },
  open: async name => ({put: async (r, res) => { entries.set(name + r.url, res); writes++; }})
}, self: { registration: { scope }, addEventListener: (k, fn) => handlers[k] = fn }, fetch: async () => { if (!online) throw Error('offline'); return new Response('network'); }};
vm.runInNewContext(require('node:fs').readFileSync('sw.js','utf8'), ctx);
function load(path, options) {
  let response;
  handlers.fetch({ request:new Request(new URL(path,scope), options), respondWith:r=>response=r, waitUntil:r=>pending=r });
  return response;
}
(async()=>{
  for (const [path,opts] of [['https://external.example/resource'],['secret.html',{cache:'no-store'}],['private.json',{headers:{Authorization:'test'}}]]) assert.equal(load(path,opts),undefined);
  await load('class.html?group=one'); assert.equal(writes,0);
  for(const cc of ['Private, max-age=60','NO-STORE']) assert.equal(await ctx.putSafe('test',new Request(scope),new Response('test',{headers:{'Cache-Control':cc}})),false);
  entries.set(scope+'class.html',new Response('public shell')); online=false;
  assert.equal(await (await load('class.html?group=two')).text(),'public shell'); online=true;
  entries.set(scope+'app.js',new Response('installed')); assert.equal(await (await load('app.js')).text(),'installed'); await pending;
  assert.equal(await (await load('app.js')).text(),'network'); await pending;
  broken=true; assert.equal(await (await load('new.css')).text(),'network');
  console.log('PASS: cache privacy, offline shell, stale asset refresh, network fallback on storage failure');
})().catch(e=>{console.error(e);process.exitCode=1});
