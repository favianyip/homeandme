// 25 Nov 2026, owner: "there is not loading screen show how much percentage is the progress please create an % so
// customer can see how much time esitmated to wait". The Designing page shows a progress bar with the percent, the
// current step in words and the minutes left when the service gives an estimate. Nothing is invented on the page.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const P = () => { const sb = { window: {} }; vm.runInNewContext(read('journey/progress.js'), sb); return sb.window.HNM_PROGRESS; };

test('every state of the service reads as a step, a percent and honest minutes', () => {
  const { view } = P();
  const v = (doc) => { const r = view(doc); return [r.hidden, r.percent, r.step, r.left]; };
  assert.deepEqual(v({ state: 'received', progress: { stage: 1, percent: 1, minutesLeft: null } }), [false, 1, 'Plan received', '']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 1, percent: 1, minutesLeft: 4 } }), [false, 1, 'Plan received', 'About 4 minutes left']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 1, percent: 2, minutesLeft: null }, queue: { ahead: 2 } }),
    [false, 2, 'Waiting for your turn', '']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 2, percent: 4, minutesLeft: 4 } }), [false, 4, 'Reading your plan', 'About 4 minutes left']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 3, percent: 17, minutesLeft: 2 }, theme: { state: 'generating', canPick: false } }),
    [false, 17, 'Laying out your themes', 'About 2 minutes left']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 3, percent: 30, minutesLeft: null }, theme: { state: 'ready', canPick: true } }),
    [false, 30, 'Waiting for your theme choice', 'It goes on as soon as you pick.']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 3, percent: 55, minutesLeft: 1 }, theme: { state: 'chosen', chosen: 2 } }),
    [false, 55, 'Placing cameras in your rooms', 'About 1 minute left']);
  assert.deepEqual(v({ state: 'preparing', progress: { stage: 4, percent: 86, minutesLeft: 2 }, theme: { chosen: 2 } }),
    [false, 86, 'Making your pictures', 'About 2 minutes left']);
  assert.deepEqual(v({ state: 'checking', progress: { stage: 5, percent: 99, minutesLeft: null } }),
    [false, 99, 'A person is checking your design', 'The work is done. A person checks it before it reaches you.']);
  assert.deepEqual(v({ state: 'ready' }), [false, 100, 'Your design is ready', '']);
  // a designer prepares it (no progress) and final answers: no bar, never a made-up number
  assert.equal(view({ state: 'checking', words: 'A designer is preparing this design for you.' }).hidden, true);
  assert.equal(view({ state: 'designer' }).hidden, true);
  assert.equal(view({ state: 'resubmit', progress: { stage: 1, percent: 1 } }).hidden, true);
  // never 100 before ready, never a broken number
  assert.equal(view({ state: 'checking', progress: { stage: 5, percent: 140 } }).percent, 99);
  assert.equal(view({ state: 'preparing', progress: { stage: 2, percent: 'x' } }).percent, 1);
  assert.equal(view({ state: 'preparing', progress: { stage: 2, percent: 5, minutesLeft: 0 } }).left, '');
});

test('the bar never moves back on a late answer, and says it to screen readers', () => {
  const H = P();
  const el = () => ({ style: {}, hidden: true, textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const els = { box: el(), fill: el(), pct: el(), step: el(), track: el(), left: el() };
  H.render({ state: 'preparing', progress: { stage: 3, percent: 40, minutesLeft: 5 }, theme: { chosen: 2 } }, els);
  assert.equal(els.fill.style.width, '40%');
  assert.equal(els.track.attrs['aria-valuenow'], '40');
  assert.equal(els.track.attrs['aria-valuetext'], 'Placing cameras in your rooms, 40 percent');
  H.render({ state: 'preparing', progress: { stage: 3, percent: 31, minutesLeft: 7 }, theme: { chosen: 2 } }, els);
  assert.equal(els.pct.textContent, '40%', 'a late answer never moves the bar back');
  assert.equal(els.box.hidden, false);
});

test('the Designing page carries the bar in the journey style, and the file is public', () => {
  const page = read('journey/preparing.html');
  assert.match(page, /<div class="pbar__track" id="pTrack" role="progressbar" aria-label="Design progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="1">/);
  assert.match(page, /<div class="pbar__top" aria-live="polite">/);
  assert.match(page, /<script src="progress\.js"><\/script>/);
  assert.match(page, /window\.HNM_PROGRESS\.render\(doc, pEls\);/);
  const css = read('journey/journey.css');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{ \.pbar__fill \{ transition: width 600ms ease-out; \} \}/);
  assert.doesNotMatch(css.slice(css.indexOf('.pbar {'), css.indexOf('.pbar {') + 900), /#[0-9a-f]{3,6}\b|rgb\(/i, 'no new colours');
  assert.ok(read('deploy/public-pages.txt').split(/\r?\n/).includes('journey/progress.js'));
});
