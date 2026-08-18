import { firstPresent, integer, money, parseDelimited } from "./csv.js";

export function detectWhatnotReport(headers) {
  const set = new Set(headers);
  if (set.has("transaction-type") && (set.has("order-id") || set.has("ledger-transaction-id"))) {
    return "weekly-orders";
  }
  if (set.has("balance") && (set.has("message") || set.has("ledger-transaction-id") || set.has("type"))) {
    return "ledger";
  }
  if (set.has("livestream-id") && (set.has("buyer-name") || set.has("shipment-id"))) {
    return "livestream";
  }
  if (set.has("title") && (set.has("quantity") || set.has("price") || set.has("sku"))) {
    return "inventory";
  }
  return "unknown";
}

export function parseWhatnotReport(text) {
  const parsed = parseDelimited(text);
  const type = detectWhatnotReport(parsed.headers);
  return {
    source: "whatnot",
    type,
    ...parsed,
    ingestedAt: new Date().toISOString(),
  };
}

function isEarnings(row) {
  return /order earnings/i.test(row["transaction-type"] || "");
}

function isRefund(row) {
  return /refund/i.test(row["transaction-type"] || "");
}

export function summarizeWhatnot(dataset) {
  const rows = dataset?.rows ?? [];
  const type = dataset?.type ?? "unknown";

  if (type === "weekly-orders") {
    const earningsRows = rows.filter(isEarnings);
    const refundRows = rows.filter(isRefund);
    const tips = rows.filter((r) => /tips?/i.test(r["transaction-type"] || ""));
    const gmv = earningsRows.reduce((sum, r) => sum + money(r["post-coupon-price"] || r["original-item-price"] || r["buyer-paid"]), 0);
    const net = rows.reduce((sum, r) => sum + money(r["transaction-amount"]), 0);
    const shows = new Set(earningsRows.map((r) => r["livestream-id"]).filter(Boolean)).size;
    const orders = new Set(earningsRows.map((r) => r["order-id"]).filter(Boolean)).size;
    return {
      type,
      orders,
      gmv,
      net,
      refunds: refundRows.length,
      tips: tips.reduce((sum, r) => sum + money(r["transaction-amount"]), 0),
      shows,
      rows: rows.length,
      headline: `${orders} completed orders · $${net.toFixed(2)} net`,
    };
  }

  if (type === "inventory") {
    const qty = rows.reduce((sum, r) => sum + integer(r.quantity), 0);
    return {
      type,
      listings: rows.length,
      units: qty,
      rows: rows.length,
      headline: `${rows.length} listings · ${qty} units`,
    };
  }

  if (type === "ledger") {
    const last = rows[rows.length - 1];
    return {
      type,
      rows: rows.length,
      balance: money(last?.balance),
      headline: `${rows.length} ledger rows`,
    };
  }

  return {
    type,
    rows: rows.length,
    headline: rows.length ? `${rows.length} rows` : "No Whatnot export yet",
  };
}

export function whatnotSaleRows(dataset, limit = 12) {
  if (!dataset?.rows?.length) return [];
  const sales = dataset.type === "weekly-orders"
    ? dataset.rows.filter((r) => isEarnings(r) || isRefund(r))
    : dataset.rows;
  return sales.slice(0, limit).map((r) => ({
    id: firstPresent(r, ["order-id", "shipment-id"]),
    date: firstPresent(r, ["order-placed-at-utc", "transaction-completed-at-utc", "report-start-date"]),
    title: firstPresent(r, ["listing-title", "title"]),
    sku: r.sku || "",
    type: firstPresent(r, ["transaction-type", "buy-format"]),
    show: firstPresent(r, ["livestream-title", "livestream-id"]),
    amount: money(r["transaction-amount"] || r.price),
    buyer: firstPresent(r, ["buyer-name"]),
  }));
}

export const WHATNOT_EXPORTS = [
  {
    id: "weekly-orders",
    label: "Weekly orders report",
    how: "whatnot.com → profile → Financials → Statements → Download",
    cadence: "Every Monday 06:00 UTC",
  },
  {
    id: "ledger",
    label: "Ledger CSV",
    how: "Seller Hub → Financials → Ledger → Export",
    cadence: "On demand",
  },
  {
    id: "livestream",
    label: "Livestream / shipments report",
    how: "Seller Hub → Shipments → select show → Export Livestream Report",
    cadence: "After each show",
  },
  {
    id: "inventory",
    label: "Inventory CSV (same template as bulk upload)",
    how: "Keep a local copy of the CSV you upload to Seller Hub → Inventory",
    cadence: "Whenever you change stock",
  },
];
