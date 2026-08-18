import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseWhatnotReport, summarizeWhatnot } from "./whatnotReports.js";

const dir = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(join(dir, "../../samples/whatnot-weekly-orders.csv"), "utf8");

test("detects Whatnot weekly orders report", () => {
  const parsed = parseWhatnotReport(sample);
  assert.equal(parsed.type, "weekly-orders");
  assert.ok(parsed.rows.length >= 4);
});

test("nets earnings against refunds", () => {
  const sum = summarizeWhatnot(parseWhatnotReport(sample));
  assert.equal(sum.orders, 3);
  assert.equal(sum.refunds, 1);
  assert.ok(sum.net < sum.gmv);
  assert.ok(sum.shows >= 1);
});

test("detects inventory CSV template", () => {
  const text = "Category,Title,Quantity,Price,SKU\nToys,Robot,3,25.00,BOT-1\n";
  assert.equal(parseWhatnotReport(text).type, "inventory");
});
