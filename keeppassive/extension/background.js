const JARVIS = "http://127.0.0.1:4173/api/ingest";

const TARGETS = {
  amazon: [
    "https://sellercentral.amazon.com/home",
    "https://sellercentral.amazon.com/orders-v3",
    "https://sellercentral.amazon.com/inventory",
    "https://sellercentral.amazon.com/learn",
  ],
  whatnot: [
    "https://www.whatnot.com/dashboard",
    "https://www.whatnot.com/dashboard/listings",
    "https://www.whatnot.com/dashboard/listings?status=Sold",
    "https://www.whatnot.com/dashboard/orders",
    "https://www.whatnot.com/dashboard/finances",
  ],
};

const MATCH = {
  amazon: ["https://sellercentral.amazon.com/*", "https://sellercentral.amazon.co.uk/*", "https://sellercentral.amazon.ca/*"],
  whatnot: ["https://www.whatnot.com/*"],
};

const networkByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "network" && sender.tab?.id != null) {
    const list = networkByTab.get(sender.tab.id) || [];
    if (list.length < 40) list.push({ url: msg.url, body: msg.body });
    networkByTab.set(sender.tab.id, list);
    return;
  }
  if (msg?.type === "capture") {
    capture(msg.marketplace)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
});

async function capture(marketplace) {
  if (marketplace !== "amazon" && marketplace !== "whatnot") {
    throw new Error("marketplace must be amazon or whatnot");
  }

  const tab = await findOrOpen(marketplace);
  networkByTab.set(tab.id, []);
  await inject(tab.id);

  const pages = [];
  for (const url of TARGETS[marketplace]) {
    await navigate(tab.id, url);
    await inject(tab.id);
    await sleep(2500);
    const page = await readPage(tab.id);
    pages.push(page);
    if (looksLikeSignIn(page, marketplace)) {
      throw new Error(`Not logged in to ${marketplace} in this Chrome. Sign in on this profile, then capture again. Capture does not type passwords.`);
    }
  }

  const payload = {
    marketplace,
    capturedAt: new Date().toISOString(),
    href: pages[0]?.href || "",
    pages,
    network: networkByTab.get(tab.id) || [],
  };

  const res = await fetch(JARVIS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Jarvis ingest HTTP ${res.status}`);
  }
  return { ok: true, pages: pages.length, article: json.article || null };
}

async function findOrOpen(marketplace) {
  const existing = await chrome.tabs.query({ url: MATCH[marketplace] });
  if (existing[0]) return existing[0];
  return chrome.tabs.create({ url: TARGETS[marketplace][0], active: true });
}

function looksLikeSignIn(page, marketplace) {
  const href = page.href || "";
  const html = page.html || "";
  if (marketplace === "amazon") {
    return /\/ap\/signin/i.test(href) || /id=["']ap_email["']/.test(html);
  }
  return /\/login/i.test(href) && /type=["']password["']/i.test(html);
}

async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", files: ["hook.js"] });
  await chrome.scripting.executeScript({ target: { tabId }, world: "ISOLATED", files: ["relay.js"] });
}

async function readPage(tabId) {
  const [got] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      href: location.href,
      title: document.title,
      html: document.documentElement.outerHTML.slice(0, 1_500_000),
    }),
  });
  return got?.result || { href: "", html: "", title: "" };
}

function navigate(tabId, url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error(`Timed out loading ${url}`));
    }, 45000);

    function onUpdated(id, info) {
      if (id !== tabId || info.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.update(tabId, { url, active: true }).catch((err) => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      reject(err);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
