import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractAmazonPage, pickTodaysArticle } from "../src/capture/amazonDom.js";
import { classifyNetwork, normalizeCapturePayload } from "../src/capture/payload.js";
import { extractWhatnotPage } from "../src/capture/whatnotDom.js";

const dir = join(process.cwd(), ".data");
const fileFor = (marketplace) => join(dir, `${marketplace}.json`);

export async function saveCapture(marketplace, record) {
  await mkdir(dir, { recursive: true });
  await writeFile(fileFor(marketplace), JSON.stringify(record, null, 2), "utf8");
}

export async function loadCapture(marketplace) {
  try {
    return JSON.parse(await readFile(fileFor(marketplace), "utf8"));
  } catch {
    return null;
  }
}

export async function loadAllCaptures() {
  const amazon = await loadCapture("amazon");
  const whatnot = await loadCapture("whatnot");
  return { amazon, whatnot };
}

export function processCapture(raw) {
  const payload = normalizeCapturePayload(raw);
  const pages = (raw.pages || []).map((page) => {
    const parsed = payload.marketplace === "whatnot"
      ? extractWhatnotPage(page.html || "", page.href || "")
      : extractAmazonPage(page.html || "", page.href || "");
    return {
      href: page.href,
      title: page.title,
      session: parsed.session,
      news: parsed.news || [],
      table: parsed.table,
      heading: parsed.heading || "",
    };
  });

  const signedOut = pages.find((p) => p.session && p.session.loggedIn === false && /signin|password|login/i.test(p.session.reason || ""));
  if (signedOut) {
    return {
      ok: false,
      error: `Not logged in to ${payload.marketplace} in this Chrome (${signedOut.session.reason}). Open that site in this profile, sign in yourself, then capture again.`,
    };
  }

  const news = pages.flatMap((p) => p.news || []);
  const tables = pages.filter((p) => p.table?.rows?.length).map((p) => ({ href: p.href, ...p.table }));
  const network = (payload.network || []).map((n) => ({
    ...classifyNetwork(n.url, n.body),
    url: n.url,
    body: n.body,
  }));
  const article = payload.marketplace === "amazon" ? pickTodaysArticle(news) : null;

  return {
    ok: true,
    marketplace: payload.marketplace,
    capturedAt: payload.capturedAt,
    article,
    news,
    tables,
    network,
    pages: pages.map(({ href, title, session, heading }) => ({ href, title, session, heading })),
  };
}
