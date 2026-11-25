// 26 Nov 2026 (lead, from the live Designing page at "checking"): the line under "Your theme" said "We are making the
// photos of this theme." while a person was checking them, and the options made from the customer's own plan carried
// the site's layout names (Open living, Feature wall, ...) although the engine's theme N is a furniture and carpentry
// package. The line follows the state; the options read "Theme 1" to "Theme 4" with the service's own description.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const P = () => { const sb = { window: {} }; vm.runInNewContext(read('journey/progress.js'), sb); return sb.window.HNM_PROGRESS; };
const chosen = (state) => ({ state, progress: { stage: 4, percent: 90 }, theme: { state: 'chosen', chosen: 2, options: [] } });

test('the line under "Your theme" follows the state: making, being checked, ready', () => {
  const raw = P().themeWords, themeWords = (d) => { const r = raw(d); return r && { ...r }; };   // out of the vm realm
  assert.deepEqual(themeWords(chosen('preparing')), { head: 'Your theme: theme 2.', hint: 'We are making the photos of this theme.' });
  assert.deepEqual(themeWords(chosen('checking')), { head: 'Your theme: theme 2.', hint: 'The photos of this theme are being checked by our designer.' });
  assert.deepEqual(themeWords(chosen('ready')), { head: 'Your theme: theme 2.', hint: 'The photos of this theme are ready.' });
  assert.equal(themeWords(chosen('designer')).hint, '');                      // a final answer: no promise of photos
  assert.equal(themeWords({ state: 'preparing', theme: { state: 'generating', canPick: false, optionsReady: 1, optionsTotal: 4 } }).hint,
    '1 of 4 themes laid out so far.');
  assert.equal(themeWords({ state: 'preparing', theme: { state: 'ready', canPick: true } }).hint, null);
  assert.equal(themeWords({ state: 'preparing' }), null);
  // known-bad: at "checking" the old line never comes back
  assert.doesNotMatch(themeWords(chosen('checking')).hint, /making/);
});

test('the options are "Theme N" with the service\'s own description, never the site\'s layout names', () => {
  const { optionLabel, optionLine } = P();
  assert.equal(optionLabel({ theme: 3 }), 'Theme 3');
  assert.equal(optionLine({ theme: 2, description: 'Low platform bed, low modular sofa.' }), 'Low platform bed, low modular sofa.');
  assert.equal(optionLine({ theme: 2 }), '');
  assert.equal(optionLine({ theme: 2, description: 7 }), '');
  assert.equal(optionLine({ theme: 2, description: 'x'.repeat(201) }), '');
  const page = read('journey/preparing.html');
  const script = page.slice(page.indexOf('the theme step (status.json'));
  for (const name of ['Open living', 'Feature wall', 'Dining room', 'Library wall', 'NAMES[']) {
    assert.ok(!script.includes(name), `the Designing page's theme step still uses ${name}`);
  }
  assert.match(script, /PR\.optionLabel\(o\)/);
  assert.match(script, /PR\.themeWords\(doc\)/);
  // the redraw key holds the page state, so "checking" re-renders the line
  assert.match(script, /JSON\.stringify\(\[doc\.state, th\.state/);
});
