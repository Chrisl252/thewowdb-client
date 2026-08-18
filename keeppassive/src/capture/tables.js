/** Pure helpers for tables captured from a logged-in Seller Central / Whatnot tab. */

export function normalizeHeader(raw) {
  return String(raw ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const AMAZON_ALIASES = {
  "order-id": "amazon-order-id",
  orderid: "amazon-order-id",
  "amazon-order-id": "amazon-order-id",
  "purchase-date": "purchase-date",
  date: "purchase-date",
  "order-date": "purchase-date",
  status: "order-status",
  "order-status": "order-status",
  sku: "sku",
  "seller-sku": "sku",
  asin: "asin",
  product: "product-name",
  "product-name": "product-name",
  title: "product-name",
  "item-name": "product-name",
  qty: "quantity",
  quantity: "quantity",
  units: "quantity",
  price: "item-price",
  "item-price": "item-price",
  total: "item-price",
  "fulfillment": "fulfillment-channel",
  fnsku: "fnsku",
  available: "afn-fulfillable-quantity",
  fulfillable: "afn-fulfillable-quantity",
  "afn-fulfillable-quantity": "afn-fulfillable-quantity",
  inbound: "afn-inbound-shipped-quantity",
};

const WHATNOT_ALIASES = {
  "order-id": "order-id",
  order: "order-id",
  title: "listing-title",
  "listing-title": "listing-title",
  listing: "listing-title",
  sku: "sku",
  buyer: "buyer-name",
  "buyer-name": "buyer-name",
  amount: "transaction-amount",
  earnings: "transaction-amount",
  "transaction-amount": "transaction-amount",
  price: "original-item-price",
  status: "transaction-type",
  "transaction-type": "transaction-type",
  quantity: "quantity-sold",
  qty: "quantity-sold",
  show: "livestream-title",
  livestream: "livestream-title",
};

export function mapHeader(name, marketplace) {
  const n = normalizeHeader(name);
  const table = marketplace === "whatnot" ? WHATNOT_ALIASES : AMAZON_ALIASES;
  return table[n] || n;
}

export function matrixToRows(headers, matrix, marketplace) {
  const mapped = headers.map((h) => mapHeader(h, marketplace));
  return matrix.map((cells) => {
    const row = {};
    mapped.forEach((key, i) => {
      if (!key) return;
      row[key] = cells[i] == null ? "" : String(cells[i]).replace(/\s+/g, " ").trim();
    });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));
}

export function parseHtmlTables(html) {
  const tables = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = re.exec(html))) {
    const block = match[1];
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(block))) {
      const cells = [];
      const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowMatch[1]))) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length >= 2) tables.push(rows);
  }
  return tables;
}

export function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstTableDataset(html, marketplace) {
  const tables = parseHtmlTables(html);
  if (!tables.length) return null;
  const headers = tables[0][0];
  const matrix = tables[0].slice(1);
  return {
    headers: headers.map((h) => mapHeader(h, marketplace)),
    rows: matrixToRows(headers, matrix, marketplace),
  };
}
