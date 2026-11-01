import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../Renovation Enquiry.dc.html', import.meta.url), 'utf8');

test('after a send timeout the main button does not offer an instant TRY AGAIN (duplicate-enquiry risk)', () => {
  const labelLine = html.split('\n').find((l) => l.includes("if (step === 5) primaryLabel ="));
  const disabledLine = html.split('\n').find((l) => l.includes('primaryDisabled:'));
  assert.ok(labelLine && disabledLine, 'could not find the step 5 button logic');
  const guarded = /timedOut/.test(labelLine) || /timedOut/.test(disabledLine);
  assert.ok(guarded,
    'timeout panel says "Please wait a minute before sending again" but the main button reads TRY AGAIN and is enabled at once: '
    + labelLine.trim() + ' | ' + disabledLine.trim());
});
