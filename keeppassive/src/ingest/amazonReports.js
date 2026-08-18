import { firstPresent, hasHeaders, integer, money, parseDelimited } from "./csv.js";

const ORDER_HINTS = ["amazon-order-id", "amazonorderid"];
const INVENTORY_HINTS = ["afn-fulfillable-quantity", "fnsku", "afn-total-quantity"];
const LISTING_HINTS = ["seller-sku", "status", "asin1"];
const SETTLEMENT_HINTS = ["settlement-id", "total-amount"];
const SALES_TRAFFIC_HINTS = ["ordered-product-sales", "sessions", "page-views"];

export function detectAmazonReport(headers) {
  if (headers.some((h) => ORDER_HINTS.includes(h)) && headers.includes("asin")) {
    return "orders";
  }
  if (headers.some((h) => INVENTORY_HINTS.includes(h))) return "inventory";
  if (headers.some((h) => SETTLEMENT_HINTS.includes(h))) return "settlement";
  if (headers.some((h) => SALES_TRAFFIC_HINTS.includes(h))) return "sales-traffic";
  if (hasHeaders(headers, ["sku", "asin"]) || headers.some((h) => LISTING_HINTS.includes(h))) {
    return "listings";
  }
  return "unknown";
}

export function parseAmazonReport(text) {
  const parsed = parseDelimited(text);
  const type = detectAmazonReport(parsed.headers);
  return {
    source: "amazon",
    type,
    ...parsed,
    ingestedAt: new Date().toISOString(),
  };
}

export function summarizeAmazon(dataset) {
  const rows = dataset?.rows ?? [];
  const type = dataset?.type ?? "unknown";

  if (type === "orders") {
    const shipped = rows.filter((r) => /ship|pending|unshipped/i.test(r["order-status"] || r["item-status"] || ""));
    const revenue = rows.reduce((sum, r) => sum + money(r["item-price"]), 0);
    const units = rows.reduce((sum, r) => sum + integer(r.quantity), 0);
    const asins = new Set(rows.map((r) => r.asin).filter(Boolean));
    return {
      type,
      orders: new Set(rows.map((r) => r["amazon-order-id"]).filter(Boolean)).size,
      units,
      revenue,
      asins: asins.size,
      rows: rows.length,
      headline: `${units} units · $${revenue.toFixed(2)}`,
    };
  }

  if (type === "inventory") {
    const fulfillable = rows.reduce((sum, r) => sum + integer(r["afn-fulfillable-quantity"]), 0);
    const inbound = rows.reduce(
      (sum, r) =>
        sum +
        integer(r["afn-inbound-working-quantity"]) +
        integer(r["afn-inbound-shipped-quantity"]) +
        integer(r["afn-inbound-receiving-quantity"]),
      0,
    );
    const stranded = rows.filter((r) => integer(r["afn-fulfillable-quantity"]) === 0 && integer(r["afn-total-quantity"]) > 0);
    return {
      type,
      skus: rows.length,
      fulfillable,
      inbound,
      stranded: stranded.length,
      rows: rows.length,
      headline: `${fulfillable} fulfillable units · ${rows.length} SKUs`,
    };
  }

  if (type === "listings") {
    const active = rows.filter((r) => /active/i.test(r.status || "")).length;
    return {
      type,
      listings: rows.length,
      active,
      rows: rows.length,
      headline: `${rows.length} listings`,
    };
  }

  if (type === "settlement") {
    const total = rows.reduce((sum, r) => sum + money(r["amount"] || r["total-amount"]), 0);
    return {
      type,
      rows: rows.length,
      total,
      headline: `Settlement $${total.toFixed(2)}`,
    };
  }

  return {
    type,
    rows: rows.length,
    headline: rows.length ? `${rows.length} rows` : "No Amazon report yet",
  };
}

export function amazonOrderRows(dataset, limit = 12) {
  if (!dataset?.rows?.length) return [];
  return dataset.rows.slice(0, limit).map((r) => ({
    id: firstPresent(r, ["amazon-order-id", "order-id"]),
    date: firstPresent(r, ["purchase-date", "payments-date"]),
    sku: firstPresent(r, ["sku", "seller-sku"]),
    asin: r.asin || "",
    title: firstPresent(r, ["product-name", "item-name"]),
    qty: integer(r.quantity),
    amount: money(r["item-price"]),
    status: firstPresent(r, ["order-status", "item-status"]),
  }));
}

/** Official Seller Central report types this app will pull through SP-API Reports. */
export const AMAZON_SELF_REPORTS = [
  {
    id: "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
    label: "All orders (by order date)",
    sellerCentral: "Reports → Fulfillment → All Orders",
    needsRange: true,
  },
  {
    id: "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA",
    label: "FBA manage inventory",
    sellerCentral: "Inventory → Manage FBA Inventory",
    needsRange: false,
  },
  {
    id: "GET_MERCHANT_LISTINGS_ALL_DATA",
    label: "Merchant listings",
    sellerCentral: "Reports → Inventory → Inventory Report",
    needsRange: false,
  },
  {
    id: "GET_FBA_REIMBURSEMENTS_DATA",
    label: "FBA reimbursements",
    sellerCentral: "Reports → Payments → Reimbursements",
    needsRange: true,
  },
];
