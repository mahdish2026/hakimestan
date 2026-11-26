// CSP regression gate: every public page has a CSP meta tag and no page allows unsafe-eval.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const pages = execSync('git ls-files "*.html"', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
assert.ok(pages.length >= 40, `expected many pages, got ${pages.length}`);

const cspRe = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i;
for (const rel of pages) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const m = html.match(cspRe);
  assert.ok(m, `${rel}: missing Content-Security-Policy meta`);
  const csp = m[1].replace(/&#39;|&apos;/g, "'");
  assert.ok(!/unsafe-eval/.test(csp), `${rel}: CSP must not allow 'unsafe-eval'`);
  assert.match(csp, /object-src 'none'/, `${rel}: CSP must set object-src 'none'`);
  assert.match(csp, /base-uri 'self'/, `${rel}: CSP must set base-uri 'self'`);
  assert.match(csp, /default-src 'self'/, `${rel}: CSP must set default-src 'self'`);
}

const tool = fs.readFileSync(path.join(root, 'tools/inject-csp.mjs'), 'utf8');
assert.ok(!/'unsafe-eval'"/.test(tool.replace(/\/\/.*$/gm, '')), 'inject-csp template must not re-add unsafe-eval');
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
assert.ok(!/unsafe-eval/.test(headers), '_headers CSP must not allow unsafe-eval');

// pdf.js must keep eval disabled so it works under the stricter policy
const darsgah = fs.readFileSync(path.join(root, 'darsgah.html'), 'utf8');
assert.match(darsgah, /getDocument\(\{[^}]*isEvalSupported:false/, 'darsgah: pdf.js must run with isEvalSupported:false');

console.log(`CSP hardening: ${pages.length} pages have CSP without unsafe-eval`);
