import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Historical pre-merge check requires local branches; it is not a runtime contract.
// Every new release separately verifies its exact commit against fresh origin/main.
test('R3-1: main is an ancestor of paperclip/FAV-87 (fast-forward possible)', {
  skip: process.env.HNM_FAV87_HISTORICAL_REVIEW !== '1'
    && 'historical branch check: run with HNM_FAV87_HISTORICAL_REVIEW=1',
}, () => {
  // execFileSync throws on non-zero exit, so reaching the assert means exit 0
  execFileSync('git', ['-C', SITE, 'merge-base', '--is-ancestor', 'main', 'paperclip/FAV-87'], { stdio: 'pipe' });
  assert.ok(true);
});

test('R3-2: Home Direct.dc.html has no "project visual" text', () => {
  const lines = readFileSync(join(SITE, 'Home Direct.dc.html'), 'utf8').split('\n');
  const bad = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /project visual/i.test(l));
  assert.deepEqual(bad, []);
});
