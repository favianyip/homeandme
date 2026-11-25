// 25 Nov 2026, owner: "the website live doesnt show any ai agent integration instruction like link mcp plugins etc".
// A visible "For AI assistants" page, honest about what exists: how an assistant can help a homeowner today, what it
// must not do, where the machine-readable facts are, and that a connector (MCP) is planned and not available yet.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = read('deploy/public-pages.txt').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const publicPages = manifest.filter((p) => p.endsWith('.html'));
const PAGE = 'ai-assistants.html';

test('the page is public, in the sitemap, and is a normal light page', () => {
  assert.ok(manifest.includes(PAGE), 'on the public list');
  assert.match(read('sitemap.xml'), /<loc>https:\/\/homeandme\.sg\/ai-assistants\.html<\/loc>/);
  const html = read(PAGE);
  assert.match(html, /<title>For AI assistants, Home &amp; Me<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/homeandme\.sg\/ai-assistants\.html">/);
  assert.match(html, /color-scheme: light;/);
  assert.doesNotMatch(html, /prefers-color-scheme:\s*dark/, 'no dark scheme (owner: keep it white)');
  assert.doesNotMatch(html, /name="robots" content="noindex"/, 'the page is meant to be found');
});

test('every public page links to it with the words "For AI assistants"', () => {
  for (const path of publicPages) {
    if (path === PAGE) continue;
    const html = read(path);
    assert.match(html, /<a [^>]*href="(?:\.\.\/|\/)?ai-assistants\.html"[^>]*>For AI assistants<\/a>|<a [^>]*href="ai-assistants\.html"[^>]*>FOR AI ASSISTANTS<\/a>/,
      `${path} has no "For AI assistants" link`);
  }
  // known-bad: the check must catch a page without the link
  assert.doesNotMatch('<a href="ContactUs.dc.html">Contact</a>', /href="(?:\.\.\/|\/)?ai-assistants\.html"/);
});

test('the page says how to help, what not to do, where the facts are, and that no connector exists yet', () => {
  const html = read(PAGE);
  for (const words of ['How an assistant can help today', 'What an assistant must not do', 'Machine-readable facts',
    'Connector for assistants (MCP)', 'href="llms.txt"', 'href="journey/upload.html"', 'href="ContactUs.dc.html"',
    'the unit number as printed on the plan', 'the PDF floor plan of their HDB flat',
    'Do not fill in or send the request for the person', 'Do not promise a price, a quote or a timeline',
    'Do not present the paid extras as available', 'has been built and is being checked', 'there is no install link today']) {
    assert.ok(html.includes(words), `missing: ${words}`);
  }
  // no price, no fake endpoint or install link, no manifest
  assert.doesNotMatch(html, /S\$\s?\d/, 'no price on the page');
  assert.doesNotMatch(html, /\/mcp\b|\.well-known|ai-plugin|mcp\.json|npx |claude mcp add|"url":/i);
  assert.ok(!existsSync(new URL('.well-known/mcp.json', root)) && !existsSync(new URL('.well-known/ai-plugin.json', root)));
  assert.ok(!manifest.some((p) => p.startsWith('.well-known/')), 'no well-known file is published');
  // the switch: one marked block on the page; the "available" variant lives in deploy/ (never published) with a
  // placeholder the lead fills in after the owner approves publishing
  assert.equal((html.match(/<!-- connector:soon/g) || []).length, 1);
  assert.equal((html.match(/<!-- \/connector -->/g) || []).length, 1);
  assert.ok(!html.includes('INSTALL_LINK_PLACEHOLDER') && !html.includes('connector:available'));
  const available = read('deploy/connector-available.html');
  assert.match(available, /<!-- connector:available/);
  assert.match(available, /INSTALL_LINK_PLACEHOLDER/);
  assert.ok(!manifest.includes('deploy/connector-available.html'));
});

test('llms.txt points to the page with the same do and do-not list', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^## For assistants$/m);
  assert.match(llms, /https:\/\/homeandme\.sg\/ai-assistants\.html/);
  assert.match(llms, /- Do: explain the service/);
  assert.match(llms, /- Do not: fill in or send the request/);
  assert.match(llms, /has been built but is not published yet: there is no install link today/);
  assert.match(llms, /Paid extras \(a walkthrough video, carpentry drawings\) are not on sale yet/);
});

test('nothing internal is published on the new page, the list, llms.txt or the sitemap', () => {
  const forbidden = [/127\.0\.0\.1/, /localhost/i, /\.jobs\b/, /spark/i, /tail[0-9a-f]{6}\.ts\.net/i, /\.ts\.net/i,
    /(^|[\s"'(])\/home\//m, /100\.\d+\.\d+\.\d+/];
  for (const path of [PAGE, 'llms.txt', 'sitemap.xml', 'deploy/public-pages.txt', 'journey/journey.css']) {
    const text = read(path);
    for (const bad of forbidden) assert.doesNotMatch(text, bad, `${path} carries ${bad}`);
  }
});
