// Game pages ask for the student's name once (HakimStudent gate in hakim-core.js).
// Requiring this helper makes older browser tests behave like a returning student:
//  • every page gets a stored site-wide name before any script runs, so the gate stays closed
//    (a returning geometry/decimals player prepared by the test keeps that player's name);
//  • page.type() into a game's own name field first clears the prefilled name, so tests that type
//    their own name keep the exact name they typed.
// Tests of the gate itself (tests/name-gate*.cjs) do not use this helper.
'use strict';
const {Page} = require('puppeteer-core');
const NAME = 'دانش‌آموز آزمون';
const FIELD = /^#(playerName|studentNameInput|nameInput|studentName|nameIn|nameInp|myName|gameStudentName|profNameInput|f-name|studentIdentity)$/;
if (!Page.prototype.__hakimStudentSeed) {
  Page.prototype.__hakimStudentSeed = true;
  const goto = Page.prototype.goto;
  Page.prototype.goto = async function (url, options) {
    if (!this.__hakimSeeded) {
      this.__hakimSeeded = true;
      await this.evaluateOnNewDocument(name => {
        try {
          const KEY = 'hakimestan_student_name', MARK = 'hk_test_seeded_name';
          const cur = localStorage.getItem(KEY);
          if (cur && cur !== localStorage.getItem(MARK)) return; // the test (or the student) chose a name
          // a returning player prepared by the test keeps their game profile
          for (const k of ['hakim.geometry.v1.last', 'hakim.decimals.v1.last']) {
            try { const v = JSON.parse(localStorage.getItem(k) || 'null'); if (typeof v === 'string' && v.trim().length > 1 && v.trim() !== 'کاوشگر مهمان') { name = v.trim(); break; } } catch (e) { /* ignore */ }
          }
          localStorage.setItem(KEY, name); localStorage.setItem(MARK, name);
        } catch (e) { /* opaque origin */ }
      }, NAME);
    }
    return goto.call(this, url, options);
  };
  const type = Page.prototype.type;
  Page.prototype.type = async function (selector, text, options) {
    if (typeof selector === 'string' && FIELD.test(selector.trim())) {
      await this.$eval(selector, e => {
        let stored = '';
        try { stored = localStorage.getItem('hakimestan_student_name') || ''; } catch (err) { /* */ }
        if (e.value && (e.getAttribute('data-hakim-name-synced') || e.value.trim() === stored)) { e.value = ''; e.removeAttribute('data-hakim-name-synced'); }
      }).catch(() => {});
    }
    return type.call(this, selector, text, options);
  };
}
module.exports = {NAME};
