import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// FAV-119: the "What needs doing?" (trades) step is hidden on both routes.
const page = readFileSync(new URL('../Renovation%20Enquiry.dc.html', import.meta.url), 'utf8').replace('const ENQUIRY_OPEN = false;', 'const ENQUIRY_OPEN = true;');

function load() {
  const flag = page.match(/const SHOW_TRADES_STEP = (true|false);/);
  assert.ok(flag, 'SHOW_TRADES_STEP flag must exist');
  const scope = page.match(/const SCOPE_STEP = (\{[^\n]*\});/);
  const fn = page.match(/function visibleSteps\(route\) \{[^\n]*\}/);
  const journeys = page.match(/const JOURNEYS = (\{[\s\S]*?\n\});/);
  assert.ok(scope && fn && journeys, 'step helpers must stay readable');
  const ctx = Object.create(null);
  vm.runInNewContext(`SHOW_TRADES_STEP = ${flag[1]}; SCOPE_STEP = ${scope[1]}; JOURNEYS = ${journeys[1]}; ${fn[0]}; this.visibleSteps = visibleSteps;`, ctx, { timeout: 500 });
  return { flag: flag[1] === 'true', visibleSteps: ctx.visibleSteps, JOURNEYS: ctx.JOURNEYS };
}

test('trades step is off and hidden on both routes; 4 steps each', () => {
  const { flag, visibleSteps, JOURNEYS } = load();
  assert.equal(flag, false);
  assert.deepEqual(Array.from(visibleSteps('whole')), [1, 2, 4, 5]);
  assert.deepEqual(Array.from(visibleSteps('selected')), [1, 3, 4, 5]);
  const labels = (route) => Array.from(visibleSteps(route)).map((s) => JOURNEYS[route][s - 1]);
  assert.deepEqual(labels('whole'), ['WHAT ARE YOU RENOVATING?', 'PLAN AND STYLE', 'WHERE CAN WE REACH YOU?', 'REVIEW AND SEND']);
  assert.deepEqual(labels('selected'), ['WHAT ARE YOU RENOVATING?', 'ADD PLANS OR IDEAS', 'WHERE CAN WE REACH YOU?', 'REVIEW AND SEND']);
  for (const route of ['whole', 'selected']) assert.ok(!labels(route).includes('WHAT NEEDS DOING?'));
  // Header and progress use the position among visible steps: STEP 01..04 OF 04.
  assert.match(page, /stepOf: 'STEP 0' \+ stepPosition \+ ' OF 0' \+ shownSteps\.length/);
  assert.match(page, /progress: Math\.round\(\(stepPosition \/ shownSteps\.length\) \* 100\) \+ '%'/);
  assert.match(page, /const journeyItems = shownSteps\.map\(/);
  assert.doesNotMatch(page, /' OF 05'/);
  // Next, back, go and restored drafts never land on the hidden step.
  assert.match(page, /const nextStep = visibleSteps\(this\.state\.route\)\.find\(\(s\) => s > this\.state\.step\) \|\| 5;/);
  assert.match(page, /this\.go\(visibleSteps\(this\.state\.route\)\.filter\(\(s\) => s < this\.state\.step\)\.pop\(\) \|\| 1\)/);
  assert.match(page, /if \(!visibleSteps\(this\.state\.route\)\.includes\(step\)\) step = /);
  assert.match(page, /step: route \? visibleSteps\(route\)\.find\(/);
});

test('trade chips render only inside the scope step, which is gated by the flag', () => {
  assert.match(page, /onScopeStep: SHOW_TRADES_STEP && !!route && step === scopeStep,/);
  const scopeBlock = page.match(/<sc-if value="\{\{ onScopeStep \}\}"[\s\S]*?\n    <\/sc-if>/)?.[0] || '';
  assert.match(scopeBlock, /g\.trades/);
  assert.equal(page.split('{{ g.trades }}').length - 1, 1, 'trade chips appear in exactly one place');
  assert.equal(page.split('{{ scopeGroups }}').length - 1, 1);
  assert.match(page, /\.\.\.\(SHOW_TRADES_STEP \? \[\{ k: 'ROOM-BY-ROOM SCOPE'/, 'scope review row hidden');
});

test('selected route still requires a room on step 1', () => {
  assert.match(page, /if \(route === 'selected' && !f\.areas\.length\) return 'Choose at least one room to build the selected-room scope\.';/);
  const step1 = page.match(/if \(step === 1\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(step1, /Choose at least one room/);
});

test('timing and note move to the plan/ideas step and reach review and payload', () => {
  assert.match(page, /showTimingOnIdeas: route === 'selected' \|\| !SHOW_TRADES_STEP, showTimingOnScope: route === 'whole' && SHOW_TRADES_STEP, showNotesOnIdeas: !SHOW_TRADES_STEP/);
  const ideasBlock = page.match(/<sc-if value="\{\{ onIdeasStep \}\}"[\s\S]*?\n    <\/sc-if>/)?.[0] || '';
  assert.match(ideasBlock, /showNotesOnIdeas[\s\S]*name="notes"[\s\S]*onInput="\{\{ setNotes \}\}"/);
  assert.match(ideasBlock, /showTimingOnIdeas[\s\S]*\{\{ timings \}\}/);
  assert.match(page, /\{ k: 'START', v: f\.timing \|\| 'Not stated', edit: edit\(route === 'whole' && SHOW_TRADES_STEP \? scopeStep : ideasStep\) \}/);
  assert.match(page, /\{ k: 'YOUR NOTE', v: f\.notes\.trim\(\) \|\| 'None added', edit: edit\(SHOW_TRADES_STEP \? scopeStep : ideasStep\) \}/);
  const payload = page.match(/const leadPayload = \{([\s\S]*?)\n    \};/)?.[1] || '';
  assert.match(payload, /timing: f\.timing/);
  assert.match(payload, /notes: this\.deliveryNotes\(\)/);
  assert.match(page, /if \(f\.notes\.trim\(\)\) lines\.push\('', 'Customer note:', f\.notes\.trim\(\)\);/);
  // Trades stay in the payload as empty lists (already allowed when every room was left blank).
  assert.match(payload, /trades: this\.payloadTrades\(\)/);
});
