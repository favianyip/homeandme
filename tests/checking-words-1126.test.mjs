// 26 Nov 2026 (lead, live Designing page at "checking"): "Your design is being checked by our team before it reaches
// you." (the service's line) sat beside "The work is done. A person checks it before it reaches you." (the bar) and
// "A person checks your design before it reaches you. This page updates by itself..." (the note). One is kept: the
// service's own line (it also carries the designer's words when a designer prepares the design).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const P = () => { const sb = { window: {} }; vm.runInNewContext(read('journey/progress.js'), sb); return sb.window.HNM_PROGRESS; };

test('at "checking" only the service\'s own line says a person checks before it reaches you', () => {
  const v = P().view({ state: 'checking', progress: { stage: 5, percent: 99, minutesLeft: null } });
  assert.equal(v.step, 'A person is checking your design');
  assert.doesNotMatch(v.left, /reaches you|checks it/);
  const page = read('journey/preparing.html');
  const m = page.match(/NOTE_CHECKING = '([^']*)'/);
  assert.ok(m, 'the checking note is defined');
  assert.doesNotMatch(m[1], /person|checks|reaches you/i);
  assert.match(page, /note\.textContent = state === 'checking' \? NOTE_CHECKING : NOTE_WAIT;/);
  // while the design is still being made the note keeps its first words
  assert.match(page, /id="waitNote">A person checks your design before it reaches you\./);
});
