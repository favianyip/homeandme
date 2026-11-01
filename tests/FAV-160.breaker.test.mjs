// FAV-160 breaker (A1): the owner script must not make private Funnel ports public.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BACKUP = '/home/favianyip/homeandme/operations/tailscale/serve-config-backup-20261101.json';
const SCRIPT = '/home/favianyip/homeandme/.jobs/fav-50-status/scripts/enable_customer_status_link.sh';
// These two deployment checks need this operator host's private inventory.
// They remain explicit local gates; CI runs the public-page contract below.
const operatorOnly = { skip: process.env.HNM_OPERATOR_CHECKS !== '1'
  && 'operator-host check: run with HNM_OPERATOR_CHECKS=1 on the deployment host' };

const OLD443 = 'spark-792d-old.tail223b04.ts.net:443';

test('(a) backup: -old:443 holds private paths and was not public', operatorOnly, () => {
  const c = JSON.parse(readFileSync(BACKUP, 'utf8'));
  assert.ok('/api/chat-webhooks/' in c.Web[OLD443].Handlers);
  assert.notEqual((c.AllowFunnel || {})[OLD443], true);
});

test('(b) script reads Funnel/serve status before any funnel change, and never touches 443 or 8443', operatorOnly, () => {
  const lines = readFileSync(SCRIPT, 'utf8').split('\n');
  const code = lines.filter((l) => !/^\s*#/.test(l));
  const firstFunnel = lines.findIndex((l) => !/^\s*#/.test(l) && /tailscale funnel --bg/.test(l));
  assert.ok(firstFunnel > 0, 'script has a funnel --bg line');
  assert.ok(lines.slice(0, firstFunnel).some((l) => !/^\s*#/.test(l) && /tailscale (funnel|serve) status/.test(l)),
    'a status read comes before the first funnel --bg');
  const all = code.join('\n');
  assert.doesNotMatch(all, /--https[= ]+(443|8443)\b/);
  assert.doesNotMatch(readFileSync(SCRIPT, 'utf8'), /--https[= ]+(443|8443)\b/);
  assert.match(all, /--https=\$PORT|--https=10000/);
  assert.match(all, /PORT=10000/);
  // it stops if :10000 is not already public, before any change
  const stop = lines.findIndex((l) => /STOPPED: .*not public/.test(l));
  assert.ok(stop > 0 && stop < firstFunnel, 'not-public stop comes before the change');
  const redeploy = lines.findIndex((l) => !/^\s*#/.test(l) && /redeploy_intake_statuskey\.sh/.test(l));
  assert.ok(stop < redeploy, 'the public check runs before the VPS step too');
});

test('page points status and design links at :10000 only', () => {
  const page = readFileSync(new URL('../Renovation Enquiry.dc.html', import.meta.url), 'utf8');
  assert.match(page, /STATUS_BASE = 'https:\/\/spark-792d-old\.tail223b04\.ts\.net:10000\/hnm-status\/v1\/'/);
  assert.match(page, /DESIGN_LINK_PREFIX = 'https:\/\/spark-792d-old\.tail223b04\.ts\.net:10000\/design-'/);
});
