import { FALLBACK_AMAZON_ARTICLE } from "../src/data/briefing.js";
import { fetchAmazonBriefing } from "./briefing.js";
import { loadAllCaptures, processCapture, saveCapture } from "./captureStore.js";

function cors(req, res) {
  const origin = req.headers.origin || "";
  if (origin.startsWith("chrome-extension://") || origin.startsWith("http://127.0.0.1:4173") || origin.startsWith("http://localhost:4173")) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function json(req, res, status, body) {
  cors(req, res);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 8_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("capture too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function handleKeepPassiveApi(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  cors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return json(req, res, 200, {
      ok: true,
      capture: "logged-in-chrome-only",
      amazonApi: false,
      whatnotApi: false,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/briefing") {
    const captures = await loadAllCaptures();
    const fromChrome = captures.amazon?.article;
    if (fromChrome?.title) {
      return json(req, res, 200, {
        ok: true,
        article: { ...FALLBACK_AMAZON_ARTICLE, ...fromChrome, live: true, via: "seller-central-chrome" },
        fetchedAt: captures.amazon.capturedAt,
      });
    }
    const briefing = await fetchAmazonBriefing();
    return json(req, res, 200, { ...briefing, via: briefing.article ? "public-blog-fallback" : "baked" });
  }

  if (req.method === "GET" && url.pathname === "/api/capture") {
    return json(req, res, 200, { ok: true, ...(await loadAllCaptures()) });
  }

  if (req.method === "POST" && url.pathname === "/api/ingest") {
    let raw;
    try {
      raw = JSON.parse(await readBody(req));
    } catch (err) {
      return json(req, res, 400, { ok: false, error: err.message || "invalid json" });
    }
    const processed = processCapture(raw);
    if (!processed.ok) return json(req, res, 401, processed);
    await saveCapture(processed.marketplace, processed);
    return json(req, res, 200, processed);
  }

  return json(req, res, 404, { ok: false, error: "unknown endpoint" });
}
