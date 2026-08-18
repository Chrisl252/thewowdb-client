import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDelimiter, normalizeHeader, parseDelimited, parseRecords, stripBom } from "./csv.js";

test("strips BOM and normalizes headers", () => {
  assert.equal(stripBom("\uFEFFsku"), "sku");
  assert.equal(normalizeHeader("Amazon Order ID"), "amazon-order-id");
  assert.equal(normalizeHeader("Transaction Type"), "transaction-type");
});

test("detects Amazon TSV vs Whatnot CSV", () => {
  assert.equal(detectDelimiter("amazon-order-id\tasin\tsku"), "\t");
  assert.equal(detectDelimiter("Order ID,Listing Title,SKU"), ",");
});

test("parses quoted commas and doubled quotes", () => {
  const records = parseRecords('title,note\n"Mug, black","He said ""sold"""');
  assert.deepEqual(records[1], ["Mug, black", 'He said "sold"']);
});

test("parses TSV orders into objects", () => {
  const text = "amazon-order-id\tasin\tquantity\n111-1\tB0AAA\t2\n";
  const { headers, rows } = parseDelimited(text);
  assert.deepEqual(headers, ["amazon-order-id", "asin", "quantity"]);
  assert.equal(rows[0].asin, "B0AAA");
});
