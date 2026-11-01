import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html = fs.readFileSync(new URL("../Renovation Enquiry.dc.html", import.meta.url), "utf8");
test("no visible promise of a scope screen while SHOW_TRADES_STEP is false", () => {
  assert.match(html, /const SHOW_TRADES_STEP = false;/);
  assert.doesNotMatch(html, /<p>All rooms stay visible on the scope screen, where you can pick the work for each one\.<\/p>/);
});
