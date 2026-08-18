import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { detectAmazonReport, parseAmazonReport, summarizeAmazon } from "./amazonReports.js";

const dir = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(join(dir, "../../samples/amazon-orders.tsv"), "utf8");

test("detects Seller Central all-orders TSV", () => {
  const parsed = parseAmazonReport(sample);
  assert.equal(parsed.type, "orders");
  assert.equal(detectAmazonReport(parsed.headers), "orders");
  assert.ok(parsed.rows.length >= 3);
});

test("summarizes own-account order revenue and units", () => {
  const parsed = parseAmazonReport(sample);
  const sum = summarizeAmazon(parsed);
  assert.equal(sum.units, 6);
  assert.equal(sum.orders, 4);
  assert.equal(sum.revenue, 89.5);
});

test("detects FBA inventory headers", () => {
  const text = "sku\tfnsku\tasin\tafn-fulfillable-quantity\tafn-total-quantity\nA\tX\tB0\t4\t4\n";
  assert.equal(parseAmazonReport(text).type, "inventory");
  assert.equal(summarizeAmazon(parseAmazonReport(text)).fulfillable, 4);
});
