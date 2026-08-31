import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const page = readFileSync(new URL('Renovation%20Enquiry.dc.html', root), 'utf8');

function constantValue(name, nextName) {
  const match = page.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n(?:\\n|const ${nextName})`));
  assert.ok(match, `${name} must remain a readable top-level constant`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 500 });
}

test('adaptive enquiry keeps two distinct five-screen routes', () => {
  const routes = constantValue('ROUTES', 'JOURNEYS');
  const journeys = constantValue('JOURNEYS', 'TEAL');
  assert.deepEqual(Object.keys(routes), ['whole', 'selected']);
  assert.equal(routes.whole.name, 'WHOLE HOME');
  assert.equal(routes.selected.name, 'SELECTED ROOMS');
  assert.equal(journeys.whole.length, 5);
  assert.equal(journeys.selected.length, 5);
  assert.notDeepEqual(journeys.whole, journeys.selected, 'the middle questions must adapt to the route');
  assert.match(page, /onIdeasStep: !!route && step === ideasStep/);
  assert.match(page, /onScopeStep: !!route && step === scopeStep/);
  assert.match(page, /onStep4: step === 4, onStep5: step === 5/);
});

test('adaptive enquiry preserves every live area and trade', () => {
  const areas = Array.from(constantValue('AREAS', 'TRADES'));
  const trades = Array.from(constantValue('TRADES', 'TEXTURES'));
  assert.deepEqual(areas.map((area) => area.id), [
    'whole', 'living', 'kitchen', 'master', 'common', 'mbath', 'cbath', 'yard', 'balcony', 'study',
  ]);
  assert.deepEqual(trades.map((trade) => trade.id), [
    'hack', 'tiling', 'paint', 'carpentry', 'plumb', 'elec', 'ceiling', 'glass', 'water', 'floor', 'aircon', 'haul',
  ]);
  assert.doesNotMatch(page, /id: 'bathrooms'/, 'the two live bathroom scopes must not be merged');
  assert.match(page, /flatType: ''/, 'property type must start blank');
});

test('24-hour progress keeps only the non-contact project brief', () => {
  assert.match(page, /localStorage\.setItem\('hnm\.enquiry\.v3'/);
  assert.match(page, /localStorage\.removeItem\('hnm\.enquiry\.v3'/);
  assert.doesNotMatch(page, /sessionStorage\.setItem\(/);
  assert.match(page, /24 \* 60 \* 60 \* 1000/);
  assert.match(page, /localStorage\.removeItem\('hnm\.enquiry\.v2'\)/, 'the former PII draft is actively removed');
  const persist = page.match(/persist\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
  for (const pii of ['street:', 'unit:', 'postal:', 'name:', 'phone:', 'email:', 'coordinator:', 'consent:']) {
    assert.doesNotMatch(persist, new RegExp(pii), `${pii} must not enter saved project progress`);
  }
});

test('scope uncertainty is explicit and removed rooms are pruned', () => {
  assert.match(page, /CONTRACTOR TO ADVISE/);
  assert.match(page, /\['contractor-to-advise'\]/);
  assert.match(page, /next\.length \? false : true/, 'removing the final trade restores advice');
  assert.match(page, /delete trades\[id\]; delete advice\[id\]/, 'removed rooms must not leak stale scope');
  assert.match(page, /MARK ALL UNDECIDED FOR ADVICE/);
});

test('plan input matches the server file contract', () => {
  assert.match(page, /accept="image\/png,image\/jpeg,image\/webp,application\/pdf"/);
  assert.match(page, /10 \* 1024 \* 1024/);
  assert.match(page, /Choose a PNG, JPG, WebP or PDF file/);
  assert.match(page, /That file is over 10\\u00a0MB/);
  assert.match(page, /This is not automatic floor-plan reading/);
  assert.match(page, /document\.querySelector\('input\[name="plan"\]'\)/, 'remove must clear the browser file input');
});

test('submission keeps the sanctioned schema and blocks duplicate sends', () => {
  assert.match(page, /if \(this\._sendInFlight \|\| this\.state\.sending \|\| this\.state\.delivered\) return/);
  assert.match(page, /primaryDisabled: this\.state\.sending \|\| this\.state\.delivered/);
  const payload = page.match(/const leadPayload = \{([\s\S]*?)\n    \};/)?.[1] || '';
  for (const required of [
    'ref:', 'name:', 'phone:', 'email:', 'street:', 'unit:', 'postal:', 'flatType:', 'sqm:', 'styles:',
    'customStyle:', 'areas:', 'trades:', 'timing:', 'notes:', 'coordinator:', 'consent:', 'planFilename:',
    "hp: ''", 'consentVersion:', 'page:',
  ]) assert.match(payload, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing payload field ${required}`);
  assert.match(page, /body: JSON\.stringify\(\{ \.\.\.leadPayload, planId \}\)/);
  assert.ok(page.indexOf('const leadPayload = {') < page.indexOf('await fetch(PLAN_ENDPOINT'), 'the validated lead must be frozen before upload');
  assert.match(payload, /customStyle: f\.styles\.includes\('custom'\) \? f\.customStyle : ''/);
  assert.doesNotMatch(payload, /route:|keyStatus:|detectedType:/, 'unknown server fields must not be posted');
  assert.match(page, /Project path: /);
  assert.match(page, /Key status: /);
  assert.match(page, /Plan layout: /);
});
