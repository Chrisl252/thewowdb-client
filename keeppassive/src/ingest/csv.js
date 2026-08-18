/** Delimited-text ingest for Seller Central TSV/CSV and Whatnot Seller Hub CSV. */

export function stripBom(text) {
  if (!text) return "";
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : String(text);
}

export function normalizeHeader(raw) {
  return stripBom(String(raw ?? ""))
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function detectDelimiter(text) {
  const first = stripBom(text).split(/\r?\n/).find((line) => line.trim()) ?? "";
  const tabs = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  if (tabs === 0 && commas === 0) return ",";
  return tabs >= commas ? "\t" : ",";
}

/**
 * RFC 4180-style records, plus tab-separated Seller Central reports.
 * Quotes toggle; doubled quotes inside a quoted field become a literal quote.
 */
export function parseRecords(text, delimiter = detectDelimiter(text)) {
  const src = stripBom(text);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (quoted) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }

  if (quoted) throw new Error("unterminated quoted field");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

export function recordsToObjects(records) {
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map((h, i) => normalizeHeader(h) || `col-${i + 1}`);
  const rows = records.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] == null ? "" : String(cells[i]).trim();
    });
    return obj;
  });
  return { headers, rows };
}

export function parseDelimited(text) {
  return recordsToObjects(parseRecords(text));
}

export function money(value) {
  if (value == null || value === "") return 0;
  const n = Number(String(value).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function integer(value) {
  if (value == null || value === "") return 0;
  const n = parseInt(String(value).replace(/,/g, "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export function hasHeaders(headers, needed) {
  const set = new Set(headers);
  return needed.every((h) => set.has(h));
}

export function firstPresent(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  return "";
}
