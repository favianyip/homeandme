#!/usr/bin/env node
// Runs the design checker on one page. Laptop only: the checker is not installed on the
// build machines, so this is never part of `node --test` or of the deploy workflow.
//
// The checker reads its notes (which rules were waived for this page, and why) from the top of
// a stylesheet. Those notes are kept out of the published files, in design/stamps/<page>.css.
// This script puts a copy beside the page for the length of one run, then removes it.
//
//   node scripts/design-check.mjs <page.html> --checker <path to the checker script> [checker options]
//   e.g. node scripts/design-check.mjs index.html --checker ~/tools/checker.mjs --genre editorial --render
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const at = args.indexOf('--checker');
if (!args.length || at < 0 || !args[at + 1] || args[0].startsWith('--')) {
  console.error('usage: node scripts/design-check.mjs <page.html> --checker <path to the checker script> [checker options]');
  process.exit(2);
}
const checker = resolve(args[at + 1]);
const page = args[0];
const rest = args.slice(1).filter((_, i) => i + 1 !== at && i + 1 !== at + 1);

const name = basename(page).replace(/\.html?$/i, '');
const notes = join(root, 'design', 'stamps', `${name}.css`);
if (!existsSync(join(root, page))) { console.error(`no such page: ${page}`); process.exit(2); }
if (!existsSync(checker)) { console.error(`no checker at: ${checker}`); process.exit(2); }

const withNotes = existsSync(notes) && !rest.includes('--without-notes');
const checkerArgs = [checker, page];
const copies = [];
let status = 1;
try {
  // the page's own local stylesheets are checked as files too, not only read through the page
  const html = readFileSync(join(root, page), 'utf8');
  const sheets = [];
  for (const m of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)) {
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1];
    if (href && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) sheets.push(join(dirname(page), href.split(/[?#]/)[0]));
  }
  if (withNotes) {
    // one copy beside the page (for the page's checks) and one beside each stylesheet folder
    // (for the stylesheet's own checks); the checker groups files by folder
    const places = new Set([dirname(page), ...sheets.map((sheet) => dirname(sheet))]);
    for (const place of places) {
      const copy = join(place, `${name}.stamp.css`);
      copyFileSync(notes, join(root, copy));
      copies.push(copy);
    }
  } else {
    console.error(`running without checker notes (${existsSync(notes) ? 'asked' : `none at design/stamps/${name}.css`})`);
  }
  checkerArgs.push(...copies, ...sheets, ...rest.filter((a) => a !== '--without-notes'));
  const run = spawnSync(process.execPath, checkerArgs, { cwd: root, stdio: 'inherit' });
  status = run.status ?? 1;
} finally {
  for (const copy of copies) rmSync(join(root, copy), { force: true });
}
process.exit(status);
