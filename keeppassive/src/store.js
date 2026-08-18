import { parseAmazonReport, summarizeAmazon } from "./ingest/amazonReports.js";
import { parseWhatnotReport, summarizeWhatnot } from "./ingest/whatnotReports.js";
import amazonOrdersSample from "../samples/amazon-orders.tsv?raw";
import amazonInventorySample from "../samples/amazon-inventory.tsv?raw";
import whatnotOrdersSample from "../samples/whatnot-weekly-orders.csv?raw";

const KEY = "keeppassive.v1";

const empty = () => ({
  amazon: { files: [], news: [], capturedAt: null },
  whatnot: { files: [], capturedAt: null },
  article: null,
  demo: false,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      amazon: {
        files: parsed.amazon?.files ?? [],
        news: parsed.amazon?.news ?? [],
        capturedAt: parsed.amazon?.capturedAt ?? null,
      },
      whatnot: {
        files: parsed.whatnot?.files ?? [],
        capturedAt: parsed.whatnot?.capturedAt ?? null,
      },
      article: parsed.article ?? null,
      demo: Boolean(parsed.demo),
    };
  } catch {
    return empty();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function datasetFromTable(table, source) {
  if (!table?.rows?.length) return null;
  return {
    source,
    type: source === "amazon" ? guessAmazonType(table.headers || Object.keys(table.rows[0] || {})) : guessWhatnotType(table.headers || Object.keys(table.rows[0] || {})),
    headers: table.headers || Object.keys(table.rows[0] || {}),
    rows: table.rows,
    ingestedAt: new Date().toISOString(),
    filename: table.href || "chrome-capture",
  };
}

function guessAmazonType(headers) {
  const h = new Set(headers);
  if (h.has("amazon-order-id") || h.has("asin") && h.has("quantity")) return "orders";
  if (h.has("fnsku") || h.has("afn-fulfillable-quantity")) return "inventory";
  return "listings";
}

function guessWhatnotType(headers) {
  const h = new Set(headers);
  if (h.has("transaction-type") || h.has("order-id")) return "weekly-orders";
  if (h.has("title") || h.has("listing-title")) return "inventory";
  return "weekly-orders";
}

export function ingestAmazonText(state, text, name = "upload") {
  const parsed = parseAmazonReport(text);
  parsed.filename = name;
  const files = state.amazon.files.filter((f) => f.type !== parsed.type);
  files.unshift(parsed);
  return { ...state, amazon: { ...state.amazon, files }, demo: false };
}

export function ingestWhatnotText(state, text, name = "upload") {
  const parsed = parseWhatnotReport(text);
  parsed.filename = name;
  const files = state.whatnot.files.filter((f) => f.type !== parsed.type);
  files.unshift(parsed);
  return { ...state, whatnot: { ...state.whatnot, files }, demo: false };
}

export function applyServerCapture(state, bundle) {
  let next = { ...state, demo: false };
  if (bundle.amazon) {
    const files = (bundle.amazon.tables || []).map((t) => datasetFromTable(t, "amazon")).filter(Boolean);
    next = {
      ...next,
      amazon: {
        files: files.length ? files : next.amazon.files,
        news: bundle.amazon.news || [],
        capturedAt: bundle.amazon.capturedAt || null,
      },
      article: bundle.amazon.article || next.article,
    };
  }
  if (bundle.whatnot) {
    const files = (bundle.whatnot.tables || []).map((t) => datasetFromTable(t, "whatnot")).filter(Boolean);
    next = {
      ...next,
      whatnot: {
        files: files.length ? files : next.whatnot.files,
        capturedAt: bundle.whatnot.capturedAt || null,
      },
    };
  }
  return next;
}

export function loadDemo() {
  let state = empty();
  state = ingestAmazonText(state, amazonOrdersSample, "amazon-orders.tsv");
  state = ingestAmazonText(state, amazonInventorySample, "amazon-inventory.tsv");
  state = ingestWhatnotText(state, whatnotOrdersSample, "whatnot-weekly-orders.csv");
  state.demo = true;
  return state;
}

export function amazonSummary(state) {
  const orders = state.amazon.files.find((f) => f.type === "orders");
  const inventory = state.amazon.files.find((f) => f.type === "inventory");
  return {
    orders: orders ? summarizeAmazon(orders) : summarizeAmazon({ type: "orders", rows: [] }),
    inventory: inventory ? summarizeAmazon(inventory) : summarizeAmazon({ type: "inventory", rows: [] }),
    files: state.amazon.files,
  };
}

export function whatnotSummary(state) {
  const weekly = state.whatnot.files.find((f) => f.type === "weekly-orders" || f.type === "inventory");
  return {
    weekly: weekly
      ? (weekly.type === "inventory" ? { ...summarizeWhatnot(weekly), headline: summarizeWhatnot(weekly).headline } : summarizeWhatnot(weekly))
      : summarizeWhatnot({ type: "weekly-orders", rows: [] }),
    files: state.whatnot.files,
  };
}

export function ensureDemo(state) {
  if (state.amazon.files.length || state.whatnot.files.length || state.amazon.capturedAt) return state;
  const demo = loadDemo();
  saveState(demo);
  return demo;
}
