// 25 Nov 2026, owner: "there is no tab on the page for agents" (he chose a nav tab and a section). The home page's top
// bar has an "AI agents" item (and a phone link beside Start, since the in-page links are hidden at 60rem and below),
// a section #agents with three tabs, and every page with a top bar links the assistants page.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const home = read('index.html');
const css = read('assets/site/home.css');
const js = read('assets/site/home.js');
const section = (home.match(/<section class="agents" id="agents">[\s\S]*?<\/section>/) || [''])[0];

test('the home top bar has "AI agents", on desktop and on the phone', () => {
  const nav = (home.match(/<nav class="mast__start"[\s\S]*?<\/nav>/) || [''])[0];
  assert.match(nav, /<li class="mast__start-ai"><a href="#agents">AI agents<\/a><\/li>\s*<\/ul>/, 'the fifth item of the top bar');
  assert.match(css, /@media \(max-width: 75rem\) \{ \.mast__start-ai \{ display: none; \} \.mast__ai \{ display: inline-flex; \} \}/,
    'where five items do not fit beside the name, the link beside Start takes over');
  const end = (home.match(/<div class="mast__end">[\s\S]*?<\/div>/) || [''])[0];
  assert.match(end, /<a class="mast__ai" href="#agents">AI agents<\/a>\s*<a class="btn btn--nav" href="journey\/upload\.html">Start<\/a>/,
    'a quiet text link beside Start, not a second button');
  assert.match(css, /\.mast__ai \{ display: none;/);
  assert.match(css, /@media \(max-width: 60rem\) \{\n  \.mast__start \{ display: none; \}\n  \.mast__ai \{ display: inline-flex; \}/,
    'the phone link shows exactly where the in-page links are hidden');
});

test('the #agents section: heading, three real tabs and panels, the note, the link, no price', () => {
  assert.ok(section, 'the section is on the page');
  assert.ok(home.indexOf('id="questions"') < home.indexOf('id="agents"') && home.indexOf('id="agents"') < home.indexOf('id="start"'),
    'after Questions, before Start');
  assert.match(section, /<h2>Use Home&nbsp;&amp;&nbsp;Me with your AI assistant\.<\/h2>/);
  assert.match(section, /role="tablist"/);
  const tabs = [...section.matchAll(/<button class="agents__tab" type="button" role="tab" id="(at\d)" aria-controls="(ap\d)" aria-selected="(true|false)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(tabs.map((m) => m[4]), ['Claude Code', 'Other assistants', 'No install']);
  assert.deepEqual(tabs.map((m) => m[3]), ['true', 'false', 'false']);
  for (const [, tab, panel] of tabs) {
    assert.match(section, new RegExp(`role="tabpanel" id="${panel}" aria-labelledby="${tab}"`), `${panel} is labelled by ${tab}`);
  }
  // without script the panels are not hidden: all three show in order, each with its own heading
  assert.doesNotMatch(section, /role="tabpanel"[^>]*hidden/);
  assert.match(css, /\.agents__tabs \{ display: none;[^}]*\}\n\.js \.agents__tabs \{ display: flex; \}/);
  assert.match(css, /\.js \.agents__panel h3 \{ display: none; \}/);
  for (const words of ['/plugin marketplace add favianyip/homeandme-mcp', '/plugin install homeandme@homeandme',
    '<code>dist/server.mjs</code> with Node 18 or newer', 'href="https://github.com/favianyip/homeandme-mcp"',
    'href="llms.txt">homeandme.sg/llms.txt</a>', 'It never sends anything about you. You send your own request.',
    '<a class="textlink" href="ai-assistants.html">Read the full page for assistants</a>']) {
    assert.ok(section.includes(words), `missing: ${words}`);
  }
  assert.doesNotMatch(section, /\$|S\$|price/i, 'no price in the section');
  assert.doesNotMatch(section, /\u2014/, 'no em dash in the new copy');
});

test('the tabs work from the keyboard and settle without motion when asked', () => {
  assert.match(js, /document\.querySelectorAll\('\.agents \[role="tab"\]'\)/);
  assert.match(js, /ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1/);
  assert.match(js, /if \(aTabs\.length\) aChoose\(aTabs\[0\], false\);/);
  assert.match(css, /\.agents__tab:focus-visible \{ outline: 2px solid var\(--color-focus\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.agents__panel\.is-in \{ animation: none; \}/);
});

test('every public page with a top bar links the assistants', () => {
  // the pages with a top navigation today: the home page (its masthead nav) and Legal (its sticky bar)
  assert.match(home, /<nav class="mast__start"[\s\S]*?href="#agents">AI agents<\/a>/);
  const legal = read('Legal.dc.html');
  const bar = (legal.match(/<header style="position: sticky[\s\S]*?<\/header>/) || [''])[0];
  assert.match(bar, /<a href="ai-assistants\.html"[^>]*>AI AGENTS<\/a>/);
  assert.match(bar, /BACK TO HOME/);
  assert.match(legal, /@media \(max-width: 560px\) \{ \.legal-label \{ display: none !important; \} \}/, 'the bar fits a phone');
  // known-bad: a bar without the link fails the check
  assert.doesNotMatch('<header style="position: sticky"><a href="./">BACK TO HOME</a></header>', /href="ai-assistants\.html"/);
});
