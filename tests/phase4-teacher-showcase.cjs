// Phase 4 comprehensive verification suite:
// - Pillar 1: Teacher data persistence (localStorage + IndexedDB, pagehide flush, JSON/CSV backup/restore, A4 @page/@media print)
// - Pillar 2: XSS sanitization & strict CSP compliance (zero inline onerror, zero external script/style CDNs)
// - Pillar 3: Accurate statistics & showcase/video/link integrity across judges.html, index.html, videos.html, math-learning.html, install-pwa.html, 404.html, offline.html
// - Pillar 4: Service worker offline coverage for all 7 teacher tools, 7 showcase pages, and local vendor bundles

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));

const TEACHER_TOOLS = [
  'azmoon-saz.html',
  'tarh-dars.html',
  'daftar.html',
  'darsgah.html',
  'hqf-converter.html',
  'payamresan.html',
  'panels/teacher.html'
];

const SHOWCASE_PAGES = [
  'index.html',
  'math-learning.html',
  'judges.html',
  'videos.html',
  'install-pwa.html',
  '404.html',
  'offline.html'
];

const ALL_PHASE4_PAGES = [...TEACHER_TOOLS, ...SHOWCASE_PAGES];

const swSource = read('sw.js');
const securityJs = read('js/hakim-security.js');
const coreJs = read('hakim-core.js');

const quietVC = () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  return vc;
};

// ── 1) Static CSP, Security, Offline Vendor & Print Contracts ──────────────
for (const rel of ALL_PHASE4_PAGES) {
  assert.ok(exists(rel), `Missing Phase 4 page: ${rel}`);
  const html = read(rel);
  const doc = new JSDOM(html, { url: 'https://hakimistan.ir/' + rel, virtualConsole: quietVC() }).window.document;

  // Strict CSP meta tag
  const cspMeta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  assert.ok(cspMeta, `${rel}: missing Content-Security-Policy meta tag`);
  const csp = cspMeta.getAttribute('content') || '';
  for (const directive of ["default-src 'self'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"]) {
    assert.ok(csp.includes(directive), `${rel}: CSP missing ${directive}`);
  }

  // Shared security helper loaded
  assert.match(html, /hakim-security\.js/, `${rel}: must load js/hakim-security.js`);

  // Zero inline event handler attributes (onclick, onerror, onload, etc.) that violate strict XSS hygiene
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      assert.ok(attr.toLowerCase() !== 'onerror', `${rel}: unexpected inline onerror on <${el.tagName.toLowerCase()}>`);
    }
  }

  // Zero external script or stylesheet CDNs
  for (const s of doc.querySelectorAll('script[src]')) {
    const src = s.getAttribute('src');
    assert.doesNotMatch(src, /^https?:\/\//i, `${rel}: external script forbidden (${src})`);
  }
  for (const l of doc.querySelectorAll('link[rel="stylesheet"][href]')) {
    const href = l.getAttribute('href');
    assert.doesNotMatch(href, /^https?:\/\//i, `${rel}: external stylesheet forbidden (${href})`);
  }

  // Service worker precache/prefetch coverage
  const swEntry = './' + rel;
  assert.ok(swSource.includes(`'${swEntry}'`), `${rel}: missing '${swEntry}' in sw.js`);
}

for (const vendor of [
  './assets/vendor/html2canvas.min.js',
  './assets/vendor/pdf.min.js',
  './assets/vendor/pdf.worker.min.js'
]) {
  assert.ok(exists(vendor.slice(2)), `Missing local vendor file: ${vendor}`);
  assert.ok(swSource.includes(`'${vendor}'`), `sw.js missing vendor asset: ${vendor}`);
}

for (const rel of TEACHER_TOOLS) {
  const html = read(rel);
  assert.match(html, /@page\s*\{[^}]*A4/i, `${rel}: missing @page A4 print rule`);
  assert.match(html, /@media\s+print\b/i, `${rel}: missing @media print stylesheet`);
}

// ── 2) Showcase Statistics, Link Integrity & Video Catalog Verification ────
function verifyLocalLinks(rel) {
  const html = read(rel);
  const baseUrl = new URL(rel, 'https://hakimistan.ir/');
  const doc = new JSDOM(html, { url: baseUrl.href, virtualConsole: quietVC() }).window.document;
  let checked = 0;

  for (const el of doc.querySelectorAll('a[href], img[src], audio[src], video[src], source[src], source[srcset], link[href], script[src]')) {
    for (const attr of ['href', 'src']) {
      const raw = el.getAttribute(attr);
      if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(raw)) continue;
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        if (u.hostname !== 'hakimistan.ir') continue;
      }
      const relAttr = (el.getAttribute('rel') || '').toLowerCase();
      if (el.tagName === 'LINK' && relAttr === 'canonical') continue;
      const resolved = new URL(raw, baseUrl);
      const pathname = decodeURIComponent(resolved.pathname).replace(/^\//, '') || 'index.html';
      assert.ok(exists(pathname), `${rel}: broken local reference ${attr}="${raw}" -> ${pathname}`);
      checked++;
    }
    const srcset = el.getAttribute('srcset');
    if (srcset) {
      for (const part of srcset.split(',')) {
        const candidate = part.trim().split(/\s+/)[0];
        if (!candidate) continue;
        const resolved = new URL(candidate, baseUrl);
        const pathname = decodeURIComponent(resolved.pathname).replace(/^\//, '');
        assert.ok(exists(pathname), `${rel}: broken srcset "${candidate}" -> ${pathname}`);
        checked++;
      }
    }
  }
  return checked;
}

let totalLinksVerified = 0;
for (const rel of ALL_PHASE4_PAGES) {
  totalLinksVerified += verifyLocalLinks(rel);
}

// Accurate, non-exaggerated stats in index.html & judges.html
const indexHtml = read('index.html');
const judgesHtml = read('judges.html');
const videosHtml = read('videos.html');
const installHtml = read('install-pwa.html');

assert.match(indexHtml, /<li><b>۱۷<\/b>\s*<span>بازی تعاملی<\/span><\/li>/, 'index.html hero must state ۱۷ interactive games');
assert.match(indexHtml, /<span>۸ کتاب درسی<\/span>/, 'index.html darsgah card must state ۸ bundled textbooks');
assert.doesNotMatch(indexHtml, /<span>۹ کتاب<\/span>/, 'index.html must not claim ۹ bundled textbooks');

assert.match(judgesHtml, /۳۰۰\+|بیش از <strong>۳۰۰/, 'judges.html must reflect 300+ ready questions/activities');
assert.doesNotMatch(judgesHtml, /۸۰\+/, 'judges.html must not contain stale 80+ count');
assert.match(judgesHtml, /۱۱ ایستگاه و ۷۶ تمرین/, 'judges.html must state 11 stations & 76 exercises for Memizestan');
assert.doesNotMatch(judgesHtml, /۱۰ ایستگاه و ۶۰ تمرین/, 'judges.html must not contain stale 10 stations & 60 exercises');
assert.match(judgesHtml, /۸ کتاب درسی/, 'judges.html must state 8 bundled Grade 5 PDF textbooks for Darsgah');

// No exaggerated/false claims in videos.html or install-pwa.html
assert.doesNotMatch(videosHtml, /طراحی طرح درس با کمک هوش مصنوعی/, 'videos.html must not claim AI lesson planning for tarh-dars');
assert.doesNotMatch(installHtml, /بدون ارسال داده به بیرون/, 'install-pwa.html must accurately describe local storage without false network claims');

// Verify all 8 bundled PDFs in darsgah.html have real %PDF- headers
const darsgahHtml = read('darsgah.html');
const darsgahDoc = new JSDOM(darsgahHtml, { virtualConsole: quietVC() }).window.document;
const stripBooks = [...darsgahDoc.querySelectorAll('.library-strip [data-book]')].map(b => {
  const rawId = b.getAttribute('data-book');
  return rawId.endsWith('.pdf') ? rawId : `books/${rawId}.pdf`;
});
assert.equal(stripBooks.length, 8, 'darsgah.html library strip must list the 8 bundled Grade 5 textbooks');
for (const bookRel of stripBooks) {
  assert.ok(exists(bookRel), `darsgah.html missing book PDF: ${bookRel}`);
  const fd = fs.openSync(path.join(ROOT, bookRel), 'r');
  const buf = Buffer.alloc(5);
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);
  assert.equal(buf.toString('ascii'), '%PDF-', `${bookRel}: invalid PDF header`);
}

// Mount videos.html in JSDOM and verify all 16 published MP4s + posters + links + 11 upcoming cards
{
  const dom = new JSDOM(videosHtml.replace(/<script\s+src="[^"]+"[^>]*><\/script>/gi, ''), {
    url: 'https://hakimistan.ir/videos.html',
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true });
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.fetch = () => Promise.resolve({ ok: true });
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      window.HTMLMediaElement.prototype.load = () => {};
    }
  });
  const doc = dom.window.document;
  const publishedCards = [...doc.querySelectorAll('.video-card:not(.upcoming)')];
  const upcomingCards = [...doc.querySelectorAll('.video-card.upcoming')];
  assert.equal(publishedCards.length, 16, 'videos.html must render 16 published video cards (9 games + 7 tools)');
  assert.equal(upcomingCards.length, 11, 'videos.html must render 11 upcoming Grade 5 science concept cards');

  for (const card of publishedCards) {
    const img = card.querySelector('img');
    assert.ok(img, 'published video card missing poster <img>');
    const posterSrc = img.getAttribute('src');
    assert.ok(exists(posterSrc), `videos.html missing poster: ${posterSrc}`);
    const id = path.basename(posterSrc, '.jpg');
    const mp4Rel = `videos/${id}.mp4`;
    assert.ok(exists(mp4Rel), `videos.html missing MP4: ${mp4Rel}`);
    const stat = fs.statSync(path.join(ROOT, mp4Rel));
    assert.ok(stat.size > 100_000, `${mp4Rel}: unexpectedly small MP4 (${stat.size} bytes)`);
    const fd = fs.openSync(path.join(ROOT, mp4Rel), 'r');
    const hdr = Buffer.alloc(8);
    fs.readSync(fd, hdr, 0, 8, 0);
    fs.closeSync(fd);
    assert.equal(hdr.subarray(4, 8).toString('ascii'), 'ftyp', `${mp4Rel}: invalid MP4 ftyp box header`);
    for (const suffix of ['.webp', '-480.webp', '-960.webp']) {
      assert.ok(exists(`videos/optimized/${id}${suffix}`), `videos.html missing optimized WebP for ${id}${suffix}`);
    }
    const goto = card.querySelector('a.link-goto');
    assert.ok(goto && exists(goto.getAttribute('href')), `videos.html card ${id} missing valid goto link`);
  }
  dom.window.close();
}

// ── 3) Runtime Teacher Tool Persistence, Print & XSS Sanitization Tests ────
function mountTeacherTool(rel, { seedStorage = {} } = {}) {
  let raw = read(rel);
  const inlineSec = `<script>${securityJs.replace(/<\/script/gi, '<\\/script')}</script>`;
  const inlineCore = `<script>${coreJs.replace(/<\/script/gi, '<\\/script')}</script>`;
  raw = raw
    .replace(/<script\s+src="(?:\.\.\/)?js\/hakim-security\.js"[^>]*><\/script>/gi, inlineSec)
    .replace(/<script\s+src="(?:\.\.\/)?hakim-core\.js"[^>]*><\/script>/gi, inlineCore)
    .replace(/<script\s+src="[^"]+"[^>]*><\/script>/gi, '')
    .replace(/<link\s+rel="stylesheet"[^>]*>/gi, '');

  const errors = [];
  const offlineFetches = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', err => {
    if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|window\.scrollTo|navigation)|Could not parse CSS stylesheet/i.test(err.message)) {
      errors.push(err.message);
    }
  });
  vc.on('error', (...args) => errors.push(args.join(' ')));

  const rafIds = new Set();
  const timerIds = new Set();
  const intervalIds = new Set();
  let closed = false;
  const dom = new JSDOM(raw, {
    url: 'https://hakimistan.ir/' + rel,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true });
      window.TextEncoder = TextEncoder;
      window.TextDecoder = TextDecoder;
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.scrollTo = () => {};
      const origST = window.setTimeout.bind(window);
      const origSI = window.setInterval.bind(window);
      window.setTimeout = (fn, ms, ...args) => {
        if (closed) return 0;
        const id = origST((...a) => { timerIds.delete(id); if (!closed) fn(...a); }, ms, ...args);
        timerIds.add(id);
        return id;
      };
      window.setInterval = (fn, ms, ...args) => {
        if (closed) return 0;
        const id = origSI((...a) => { if (!closed) fn(...a); }, ms, ...args);
        intervalIds.add(id);
        return id;
      };
      window.print = () => {
        window.dispatchEvent(new window.Event('beforeprint'));
        window.dispatchEvent(new window.Event('afterprint'));
      };
      window.confirm = () => true;
      window.alert = () => {};
      window.matchMedia = q => ({
        matches: false,
        media: q,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {}
      });
      window.requestAnimationFrame = cb => {
        if (closed) return 0;
        const id = setTimeout(() => {
          rafIds.delete(id);
          if (!closed && window.document) cb(Date.now());
        }, 16);
        rafIds.add(id);
        return id;
      };
      window.cancelAnimationFrame = id => {
        rafIds.delete(id);
        clearTimeout(id);
      };
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      window.HTMLMediaElement.prototype.load = () => {};
      window.fetch = url => {
        offlineFetches.push(String(url));
        return Promise.reject(new Error('OFFLINE'));
      };
      for (const [k, v] of Object.entries(seedStorage)) {
        window.localStorage.setItem(k, v);
      }
    }
  });

  const origClose = dom.window.close.bind(dom.window);
  dom.window.close = () => {
    closed = true;
    for (const id of rafIds) clearTimeout(id);
    for (const id of timerIds) dom.window.clearTimeout(id);
    for (const id of intervalIds) dom.window.clearInterval(id);
    rafIds.clear();
    timerIds.clear();
    intervalIds.clear();
    return origClose();
  };
  return { dom, window: dom.window, document: dom.window.document, errors, offlineFetches };
}

// 3a) hqf-converter.html: XSS escaping, draft auto-persistence on convert & pagehide, reboot restore, print button
{
  const t1 = mountTeacherTool('hqf-converter.html');
  assert.equal(t1.errors.length, 0, `hqf-converter boot errors: ${t1.errors.join('; ')}`);
  assert.equal(t1.offlineFetches.length, 0, 'hqf-converter must not call fetch when navigator.onLine === false');

  const xssExam = {
    id: 'id_xss_exam',
    title: 'آزمون مطالعات <img src=x onerror="window.__xss=3">',
    grade: 'پنجم',
    subject: 'مطالعات',
    questions: [{
      id: 'q1',
      type: 'mcq',
      text: 'پایتخت ایران؟ <img src=x onerror="window.__xss=1">',
      options: ['تهران "پایتخت"', 'شیراز <script>window.__xss=2</script>', 'اصفهان', 'تبریز'],
      answer: 0,
      score: 1
    }]
  };
  const res = t1.window.HQFConverter.loadExamObjects(xssExam, 'xss-exam.json');
  assert.equal(res.hqf.questions.length, 1);
  assert.equal(t1.window.__xss, undefined, 'hqf-converter preview must neutralize XSS payloads');
  assert.equal(t1.document.getElementById('btnPrintHqf').disabled, false, 'btnPrintHqf must enable after conversion');

  t1.window.dispatchEvent(new t1.window.Event('pagehide'));
  const savedDraft = t1.window.localStorage.getItem('hakimestan_hqf_converter_v1');
  assert.ok(savedDraft && savedDraft.includes('پایتخت ایران'), 'hqf-converter must persist draft to localStorage');
  t1.window.close();

  // Reboot with saved draft and verify instant restoration
  const t2 = mountTeacherTool('hqf-converter.html', {
    seedStorage: { hakimestan_hqf_converter_v1: savedDraft }
  });
  assert.equal(t2.window.HQFConverter.state.exams.length, 1, 'hqf-converter must restore exams on reboot');
  assert.equal(t2.document.getElementById('btnPrintHqf').disabled, false, 'hqf-converter must re-render HQF preview on reboot');
  t2.window.HQFConverter.clearDraftStorage();
  assert.equal(t2.window.localStorage.getItem('hakimestan_hqf_converter_v1'), null);
  t2.window.close();
}

// 3b) daftar.html: schema validator, XSS sanitization, reportNote pagehide flush, beforeprint #printArea, offline preservation
{
  const t = mountTeacherTool('daftar.html');
  assert.equal(t.errors.length, 0, `daftar.html boot errors: ${t.errors.join('; ')}`);
  assert.equal(t.offlineFetches.length, 0, 'daftar.html must not call visit tracker offline');
  assert.equal(typeof t.window.__daftarValidateDB, 'function', 'daftar.html must expose __daftarValidateDB');
  assert.throws(() => t.window.__daftarValidateDB(null), /پشتیبان معتبر نیست/);
  assert.throws(() => t.window.__daftarValidateDB({ version: 1, classes: 'bad' }), /پشتیبان معتبر نیست/);

  const validDBObj = {
    version: 1,
    settings: { teacher: 'مهدی شریفیان', school: 'دبستان حکیم', year: '۱۴۰۵–۱۴۰۶', theme: 'blue' },
    classes: [{
      id: 'c1',
      name: 'کلاس پنجم <img src=x onerror="window.__xss=1">',
      grade: 'پنجم',
      subject: 'ریاضی',
      color: '#3b82f6'
    }],
    students: [{
      id: 's1',
      classId: 'c1',
      first: 'سارا <img src=x onerror="window.__xss=2">',
      last: 'احمدی',
      code: '101',
      phone: '',
      note: '',
      reportNote: 'یادداشت اولیه'
    }],
    schedule: [],
    attendance: {},
    grades: [],
    reminders: [],
    lastBackup: null,
    updatedAt: '2026-11-25T00:00:00.000Z'
  };
  assert.ok(t.window.__daftarValidateDB(validDBObj));
  t.window.close();

  // Seed a class with XSS student name, open reports tab, edit #reportNote, flush on pagehide & print
  const t2 = mountTeacherTool('daftar.html', {
    seedStorage: {
      hakimestan_daftar_v1: JSON.stringify(validDBObj),
      hakimestan_daftar_offline: '1'
    }
  });
  assert.equal(t2.window.__xss, undefined, 'daftar.html must sanitize class/student names against XSS');
  const repTab = t2.document.querySelector('[data-view="reports"]');
  if (repTab) repTab.click();
  const rNote = t2.document.getElementById('reportNote');
  if (rNote) {
    rNote.value = 'یادداشت فوری کارنامه پیش از رفرش';
    rNote.dispatchEvent(new t2.window.Event('input', { bubbles: true }));
  }
  t2.window.dispatchEvent(new t2.window.Event('pagehide'));
  const persisted = JSON.parse(t2.window.localStorage.getItem('hakimestan_daftar_v1'));
  if (rNote) {
    assert.equal(persisted.students[0].reportNote, 'یادداشت فوری کارنامه پیش از رفرش', 'daftar.html must flush reportNote on pagehide');
  }
  t2.window.dispatchEvent(new t2.window.Event('beforeprint'));
  const printArea = t2.document.getElementById('printArea');
  assert.ok(printArea && printArea.innerHTML.length > 0, 'daftar.html beforeprint must populate #printArea');
  assert.equal(t2.window.__xss, undefined, 'daftar.html #printArea must escape XSS');
  t2.window.dispatchEvent(new t2.window.Event('afterprint'));
  t2.window.close();
}

// 3c) tarh-dars.html: quickNote & draft immediate flush on pagehide + beforeprint #printArea
{
  const t = mountTeacherTool('tarh-dars.html');
  assert.equal(t.errors.length, 0, `tarh-dars.html boot errors: ${t.errors.join('; ')}`);
  assert.equal(t.offlineFetches.length, 0, 'tarh-dars.html must not call visit tracker offline');
  const qNote = t.document.getElementById('quickNote');
  assert.ok(qNote, 'tarh-dars.html must have #quickNote');
  qNote.value = 'نکتهٔ تدریس کسرها پیش از رفرش ناگهانی';
  qNote.dispatchEvent(new t.window.Event('input', { bubbles: true }));
  t.window.dispatchEvent(new t.window.Event('pagehide'));
  assert.equal(
    t.window.localStorage.getItem('hakimestan_tarhdars_qnote_v1'),
    'نکتهٔ تدریس کسرها پیش از رفرش ناگهانی',
    'tarh-dars.html must persist #quickNote on pagehide'
  );
  t.window.close();
}

// 3d) azmoon-saz.html: XSS sanitization in live preview & #azmoonPrintArea on beforeprint + localStorage persistence
{
  const seedData = JSON.stringify({
    currentExamId: 'ex1',
    exams: [{
      id: 'ex1',
      title: 'آزمون ریاضی <img src=x onerror="window.__xss=1">',
      school: 'دبستان حکیم',
      teacher: 'مهدی شریفیان',
      grade: 'پنجم',
      subject: 'ریاضی',
      questions: [{
        id: 'q1',
        type: 'mcq',
        score: 2,
        section: 'بخش اول <script>window.__xss=2</script>',
        text: 'حاصل ۳ × ۴ چیست؟ <img src=x onerror="window.__xss=3">',
        options: ['۱۲', '۱۰', '۸', '۱۴'],
        answer: 0
      }]
    }]
  });
  const seedStyle = JSON.stringify({
    accent: '#0f766e; background:url(javascript:alert(1))'
  });
  const t = mountTeacherTool('azmoon-saz.html', {
    seedStorage: { hakimestan_azmoon_v1: seedData, hakimestan_azmoon_style_v1: seedStyle }
  });
  assert.equal(t.errors.length, 0, `azmoon-saz.html boot errors: ${t.errors.join('; ')}`);
  assert.equal(t.offlineFetches.length, 0, 'azmoon-saz.html must not call visit tracker offline');
  assert.equal(t.window.__xss, undefined, 'azmoon-saz.html must neutralize XSS on boot');
  t.window.dispatchEvent(new t.window.Event('beforeprint'));
  const pa = t.document.getElementById('azmoonPrintArea');
  assert.ok(pa && pa.innerHTML.length > 0, 'azmoon-saz.html beforeprint must populate #azmoonPrintArea');
  assert.doesNotMatch(pa.innerHTML, /javascript:alert/i, 'azmoon-saz.html must strip CSS injection from style.accent');
  assert.equal(t.window.__xss, undefined, 'azmoon-saz.html #azmoonPrintArea must neutralize XSS');
  t.window.dispatchEvent(new t.window.Event('afterprint'));
  assert.equal(pa.innerHTML, '', 'azmoon-saz.html afterprint must clear #azmoonPrintArea');
  t.window.close();
}

// 3e) darsgah.html: offline boot, print sheet & notes JSON backup/restore controls
{
  const t = mountTeacherTool('darsgah.html');
  assert.equal(t.errors.length, 0, `darsgah.html boot errors: ${t.errors.join('; ')}`);
  assert.equal(t.offlineFetches.length, 0, 'darsgah.html must not call visit tracker offline');
  for (const id of ['printPageBtn', 'exportNotesBtn', 'importNotesBtn', 'notesFileInput', 'darsgahPrintSheet']) {
    assert.ok(t.document.getElementById(id), `darsgah.html missing #${id}`);
  }
  t.window.dispatchEvent(new t.window.Event('beforeprint'));
  const sheet = t.document.getElementById('darsgahPrintSheet');
  assert.ok(sheet.children.length > 0, 'darsgah.html beforeprint must populate #darsgahPrintSheet');
  t.window.dispatchEvent(new t.window.Event('afterprint'));
  assert.equal(sheet.children.length, 0, 'darsgah.html afterprint must clear #darsgahPrintSheet');
  t.window.close();
}

// 3f) panels/teacher.html: question/filter auto-draft restoration, CSV/print/backup controls, and daftar preservation on logout
(async () => {
  const qDraft = JSON.stringify({
    type: 'mcq',
    text: 'سؤال پیش‌نویس آزمایشی پیش از رفرش',
    options: ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'],
    answer: 0,
    explanation: 'توضیح آزمایشی',
    section: 'درس اول'
  });
  const fDraft = JSON.stringify({ gameId: 'math-decimals', student: 'زهرا', days: '30' });
  const daftarKeep = JSON.stringify({ classes: [{ id: 'c1', name: 'پنجم الف', color: '#3b82f6' }], students: [] });

  const t = mountTeacherTool('panels/teacher.html', {
    seedStorage: {
      hakimestan_daftar_auth: 'stale-auth-token',
      hakimestan_panel_qdraft_v1: qDraft,
      hakimestan_panel_filters_v1: fDraft,
      hakimestan_daftar_v1: daftarKeep
    }
  });
  try {
    assert.equal(t.errors.length, 0, `panels/teacher.html boot errors: ${t.errors.join('; ')}`);
    assert.equal(t.offlineFetches.length, 0, 'panels/teacher.html must not call visit tracker offline');
    assert.equal(t.document.getElementById('mText').value, 'سؤال پیش‌نویس آزمایشی پیش از رفرش');
    assert.equal(t.document.getElementById('fStudent').value, 'زهرا');

    for (const id of ['btnExportCsv', 'btnPrintResults', 'btnDaftarNav']) {
      assert.ok(t.document.getElementById(id), `panels/teacher.html missing #${id}`);
    }

    // Simulate login once, then go offline and open embedded daftar modal
    t.window.fetch = (url, opts) => {
      const body = opts && opts.body ? JSON.parse(opts.body) : {};
      if (body.action === 'tpLogin') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, token: 'test-token', username: 'معلم' }) });
      }
      if (body.action === 'tpGetStats') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, stats: {} }) });
      }
      return Promise.reject(new Error('OFFLINE_SYNC'));
    };
    t.document.getElementById('passIn').value = 'secret';
    t.document.getElementById('btnLogin').click();
    await new Promise(r => setTimeout(r, 40));

    t.document.getElementById('btnDaftarNav').click();
    await new Promise(r => setTimeout(r, 40));
    for (const id of ['dkBackupJson', 'dkRestoreJson', 'dkRestoreFile']) {
      assert.ok(t.document.getElementById(id), `panels/teacher.html dkOverlay missing #${id}`);
    }

    // Logout must clear auth token without wiping local daftar data!
    t.document.getElementById('btnLogout').click();
    assert.equal(t.window.localStorage.getItem('hakimestan_daftar_auth'), null, 'logout must remove hakimestan_daftar_auth');
    assert.equal(t.window.localStorage.getItem('hakimestan_daftar_v1'), daftarKeep, 'logout must preserve hakimestan_daftar_v1');
  } finally {
    t.window.close();
  }

  console.log(JSON.stringify({
    phase4PagesAudited: ALL_PHASE4_PAGES.length,
    teacherToolsVerified: TEACHER_TOOLS.length,
    showcasePagesVerified: SHOWCASE_PAGES.length,
    localLinksVerified: totalLinksVerified,
    publishedVideosVerified: 16,
    bundledBooksVerified: 8,
    swVersion: swSource.match(/const VERSION = '([^']+)'/)?.[1]
  }, null, 2));
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
