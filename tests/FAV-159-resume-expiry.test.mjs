import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// FAV-159 (FAV-50 round 2): resume uses the saved send time; saved entry expires after 14 days.
const page = readFileSync(new URL('../Renovation%20Enquiry.dc.html', import.meta.url), 'utf8').replace('const ENQUIRY_OPEN = false;', 'const ENQUIRY_OPEN = true;');
const base = page.match(/const STATUS_BASE = '[^']+';/);
const block = page.match(/\/\/ FAV-50 design-link helpers \(start\)([\s\S]*?)\/\/ FAV-50 design-link helpers \(end\)/);
const ctx = Object.create(null);
vm.runInNewContext(`${base[0]}\n${block[1]}\nthis.h = { POLL_GIVE_UP_MS, TRACK_KEEP_MS, readSavedTrack, keepPolling };`, ctx, { timeout: 500 });
const h = ctx.h;
const KEY = '0123456789abcdef0123456789abcdef';
const REF = 'HNM-261101-1234';
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 1, 15, 0, 0);

test('14-day expiry of the saved entry', () => {
  assert.equal(h.TRACK_KEEP_MS, 14 * DAY);
  const ok = h.readSavedTrack({ ref: REF, statusKey: KEY, at: NOW - 13 * DAY }, NOW);
  assert.equal(ok.ref, REF); assert.equal(ok.statusKey, KEY); assert.equal(ok.at, NOW - 13 * DAY);
  assert.equal(h.readSavedTrack({ ref: REF, statusKey: KEY, at: NOW - 14 * DAY + 1 }, NOW).at, NOW - 14 * DAY + 1);
  assert.equal(h.readSavedTrack({ ref: REF, statusKey: KEY, at: NOW - 14 * DAY }, NOW), null);
  assert.equal(h.readSavedTrack({ ref: REF, statusKey: KEY, at: NOW - 30 * DAY }, NOW), null);
});

test('damaged saved entries are ignored', () => {
  for (const bad of [null, 'x', {}, { ref: REF, statusKey: KEY }, { ref: REF, statusKey: KEY, at: 'yesterday' },
    { ref: REF, statusKey: KEY, at: NaN }, { ref: REF, statusKey: KEY, at: NOW + DAY },
    { ref: REF, statusKey: KEY.toUpperCase(), at: NOW }, { ref: 'HNM-1', statusKey: KEY, at: NOW }]) {
    assert.equal(h.readSavedTrack(bad, NOW), null, JSON.stringify(bad));
  }
});

test('resume uses the saved send time, so the 3-hour give-up does not restart on reload', () => {
  const s = h.readSavedTrack({ ref: REF, statusKey: KEY, at: NOW - 4 * 60 * 60 * 1000 }, NOW);
  assert.equal(h.keepPolling('designing', s.at, NOW), false, '4 hours after sending: no more repeated checks');
  assert.match(page, /saved = readSavedTrack\(raw, Date\.now\(\)\);\n      if \(raw && !saved\) localStorage\.removeItem\(TRACK_STORE\);/);
  assert.match(page, /\} else if \(saved\) this\.startTracking\(saved\.ref, saved\.statusKey, saved\.at\);/);
  assert.match(page, /this\.startTracking\(fromHash\.ref, fromHash\.statusKey, same \? saved\.at : undefined\);/);
  assert.match(page, /if \(typeof savedAt === 'number'\) this\._pollStart = savedAt;/);
  // A resume still asks once, so a design that finished after 3 hours is shown, not "taking longer".
  assert.match(page, /if \(!this\._checkOnce && !keepPolling\(t\.step, this\._pollStart, Date\.now\(\)\)\) \{/);
  assert.match(page, /this\._polling = true;\n    this\._checkOnce = false;/);
});

test('waiting copy says a designer checks it; no instant or quote', () => {
  assert.ok(page.includes('Our designer checks every design before it is ready. Usually within 30 minutes in the daytime.'));
  assert.ok(!page.includes("'Usually within 30 minutes. You can keep this page open.'"));
});
