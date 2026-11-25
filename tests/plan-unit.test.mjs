// 25 Nov 2026: a sales brochure shows several flats on one plan, and the design needs the customer's unit number
// to pick the right one. The upload page asks for it (optional), and it travels as a "unit:N" entry after the
// theme in `styles`. Nothing else about the enquiry changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function sender(sent) {
  const sandbox = {
    window: {}, Promise, setTimeout, clearTimeout, encodeURIComponent, JSON, Math, Date, String, AbortController,
    fetch: async (url, opts) => {
      sent.push({ url, headers: opts.headers, body: opts.body });
      const body = url.endsWith('/plans') ? { ok: true, planId: '0123456789abcdef' } : { ok: true, ref: JSON.parse(opts.body).ref };
      return { ok: true, json: async () => body };
    },
  };
  vm.runInNewContext(read('journey/send.js'), sandbox);
  return sandbox.window.HNM_SEND;
}

test('the unit number is optional, checked, and sent as a unit: entry after the theme', async () => {
  const sent = [];
  const S = sender(sent);
  assert.equal(S.unitProblem(''), '');
  assert.equal(S.unitProblem('710'), '');
  assert.equal(S.unitProblem('#07-710'), '');
  for (const bad of ['7 10', '../x', '123456789', '<b>', 'unit 5']) assert.ok(S.unitProblem(bad), bad);
  assert.equal(S.unitToken(' #07-710 '), '07-710');
  assert.equal(S.unitToken('a12'), 'A12');
  const file = { name: 'brochure.pdf', type: 'application/pdf', size: 2048 };
  await S.send({ name: 'A', wa: '91234567', email: 'a@b.sg', styleId: 'minimalist', styleName: 'Minimalist',
    themeNo: 2, themeName: 'x', planName: 'brochure.pdf', planUnit: '710' }, file);
  const lead = JSON.parse(sent[1].body);
  assert.deepEqual(Array.from(lead.styles), ['minimalist', 'theme:2', 'unit:710']);
  assert.ok(!('unit' in lead) && !('planUnit' in lead), 'no new field: the enquiry service keeps only its own');
  assert.ok(lead.styles.every((s) => s.length <= 60) && lead.styles.length <= 12);
  sent.length = 0;
  await S.send({ name: 'A', wa: '91234567', email: 'a@b.sg', styleId: 'minimalist', styleName: 'Minimalist',
    themeNo: 2, themeName: 'x', planName: 'p.pdf', planUnit: '7 10' }, file);
  assert.deepEqual(Array.from(JSON.parse(sent[1].body).styles), ['minimalist', 'theme:2'], 'a bad unit is not sent');
});

test('the field is on the upload page, saved on Continue, removed with the plan box, and passed on at Send', () => {
  const upload = read('journey/upload.html');
  assert.match(upload, /<input type="text" id="planUnit" name="planUnit" maxlength="12" autocomplete="off" placeholder="e\.g\. 710">/);
  assert.match(upload, /\['dz', 'planErr', 'planHint', 'unitField'\]/);
  assert.match(upload, /planUnit: \(document\.getElementById\('planUnit'\) \|\| \{ value: '' \}\)\.value\.trim\(\)/);
  assert.match(upload, /var uErr = \(PLAN && uEl\) \? HNM_SEND\.unitProblem\(uEl\.value\) : '';/);
  assert.match(read('journey/check.html'), /planName: s\.planName, planUnit: s\.planUnit \|\| '',/);
});
