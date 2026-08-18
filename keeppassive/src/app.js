import { FALLBACK_AMAZON_ARTICLE, JARVIS_ALERTS } from "./data/briefing.js";
import { AMAZON_TOOLKIT, WHATNOT_TOOLKIT } from "./data/toolkit.js";
import { amazonOrderRows } from "./ingest/amazonReports.js";
import { whatnotSaleRows } from "./ingest/whatnotReports.js";
import {
  amazonSummary,
  applyServerCapture,
  ensureDemo,
  ingestAmazonText,
  ingestWhatnotText,
  loadDemo,
  loadState,
  saveState,
  whatnotSummary,
} from "./store.js";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  return hash.startsWith("/") ? hash : `/${hash}`;
}

export function boot(root) {
  let state = ensureDemo(loadState());
  let article = state.article || FALLBACK_AMAZON_ARTICLE;
  let captureMeta = { amazon: null, whatnot: null };

  async function refreshRemote() {
    try {
      const [briefing, capture] = await Promise.all([
        fetch("/api/briefing").then((r) => r.json()),
        fetch("/api/capture").then((r) => r.json()),
      ]);
      if (briefing?.article?.title) article = briefing.article;
      if (capture?.ok) {
        captureMeta = { amazon: capture.amazon, whatnot: capture.whatnot };
        state = applyServerCapture(state, capture);
        saveState(state);
        if (capture.amazon?.article?.title) article = { ...FALLBACK_AMAZON_ARTICLE, ...capture.amazon.article };
      }
    } catch {
      /* Jarvis page still renders from local demo / last capture */
    }
    render();
  }

  function render() {
    const path = route();
    root.innerHTML = `
      <div class="shell">
        ${topNav(path)}
        <div class="page">${view(path)}</div>
      </div>
    `;
    bind(root);
  }

  function topNav(path) {
    const links = [
      ["/", "KeepPassive"],
      ["/jarvis", "Jarvis"],
      ["/jarvis/amazon", "Amazon"],
      ["/jarvis/whatnot", "Whatnot"],
      ["/jarvis/chrome", "This Chrome"],
    ];
    return `
      <header class="top">
        <a class="brand" href="#/">KeepPassive<small>Jarvis</small></a>
        <nav>
          ${links.map(([href, label]) => `<a class="${path === href || (href !== "/" && path.startsWith(href)) ? "active" : ""}" href="#${href}">${label}</a>`).join("")}
        </nav>
      </header>
    `;
  }

  function view(path) {
    if (path === "/") return landing();
    return `
      <div class="layout">
        <aside class="side">
          <a class="${path === "/jarvis" ? "active" : ""}" href="#/jarvis">Today</a>
          <a class="${path === "/jarvis/amazon" ? "active" : ""}" href="#/jarvis/amazon">Amazon</a>
          <a class="${path === "/jarvis/whatnot" ? "active" : ""}" href="#/jarvis/whatnot">Whatnot</a>
          <a class="${path === "/jarvis/chrome" ? "active" : ""}" href="#/jarvis/chrome">This Chrome</a>
        </aside>
        <main>
          ${path === "/jarvis/amazon" ? amazonView() : ""}
          ${path === "/jarvis/whatnot" ? whatnotView() : ""}
          ${path === "/jarvis/chrome" ? chromeView() : ""}
          ${path === "/jarvis" ? todayView() : ""}
        </main>
      </div>
    `;
  }

  function articleBlock(compact = false) {
    const a = article || FALLBACK_AMAZON_ARTICLE;
    const via = a.via === "seller-central-chrome" || a.source === "seller-news"
      ? "Pulled from Seller News in this logged-in Chrome"
      : "Waiting on Seller Central capture — showing the public Selling Partner Blog copy so this slot is never empty";
    return `
      <section class="article" id="amazon-today">
        <div>
          <p class="kicker">Today’s Amazon article</p>
          <p class="dateline">${esc(a.displayDate || a.date || "")} · ${esc(a.source || "Amazon")}${a.author ? ` · ${esc(a.author)}` : ""}</p>
          ${compact ? `<h2>${esc(a.title)}</h2>` : `<h1>${esc(a.title)}</h1>`}
          <p class="dek">${esc(a.dek || "")}</p>
          <p class="meta">${esc(via)}</p>
          <p><a href="${esc(a.url)}" target="_blank" rel="noreferrer">Open the article</a></p>
        </div>
        <div>
          <p class="kicker">Jarvis read</p>
          <ul class="takeaways">${(a.takeaways || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        </div>
      </section>
    `;
  }

  function landing() {
    const amz = amazonSummary(state);
    const wn = whatnotSummary(state);
    return `
      ${articleBlock(false)}
      <div class="grid">
        <section class="card span-6">
          <p class="kicker">Amazon · this Chrome</p>
          <h3>Seller Central</h3>
          <p class="metric">${esc(amz.orders.headline)}</p>
          <p class="muted">Capture from the KeepPassive extension while Seller Central is signed in on this profile. APIs are not wired.</p>
          <p><a href="#/jarvis/amazon">Open Amazon in Jarvis</a></p>
        </section>
        <section class="card span-6">
          <p class="kicker">Whatnot · this Chrome</p>
          <h3>Seller Hub</h3>
          <p class="metric">${esc(wn.weekly.headline)}</p>
          <p class="muted">Whatnot is not accepting Seller API applicants. Same extension, same logged-in Chrome.</p>
          <p><a href="#/jarvis/whatnot">Open Whatnot in Jarvis</a></p>
        </section>
      </div>
    `;
  }

  function todayView() {
    const amz = amazonSummary(state);
    const wn = whatnotSummary(state);
    return `
      <p class="banner">${state.demo ? "<strong>Demo numbers</strong> until this Chrome captures live sessions." : "<strong>Live capture</strong> from this Chrome."} Amazon last: ${esc(state.amazon.capturedAt || captureMeta.amazon?.capturedAt || "never")}. Whatnot last: ${esc(state.whatnot.capturedAt || captureMeta.whatnot?.capturedAt || "never")}.</p>
      ${articleBlock(true)}
      <div class="grid">
        ${JARVIS_ALERTS.map((alert) => `
          <section class="card span-6">
            <p class="kicker">${esc(alert.level)}</p>
            <h3>${esc(alert.title)}</h3>
            <p class="muted">${esc(alert.detail)}</p>
          </section>
        `).join("")}
        <section class="card span-6">
          <p class="kicker">Amazon</p>
          <p class="metric">${esc(amz.orders.headline)}</p>
          <p class="muted">${esc(amz.inventory.headline)}</p>
        </section>
        <section class="card span-6">
          <p class="kicker">Whatnot</p>
          <p class="metric">${esc(wn.weekly.headline)}</p>
          <p class="muted">Developer program closed — Chrome session only.</p>
        </section>
      </div>
    `;
  }

  function amazonView() {
    const amz = amazonSummary(state);
    const ordersFile = state.amazon.files.find((f) => f.type === "orders");
    const rows = amazonOrderRows(ordersFile || { rows: [] });
    return `
      <p class="kicker">Amazon</p>
      <h2 style="font-family:var(--serif);font-size:36px;margin:0 0 12px">Seller Central in this Chrome</h2>
      <p class="muted">No SP-API. The extension walks home, orders, inventory, and Learn using the session already in this browser, then stops if a sign-in form appears.</p>
      <div class="grid">
        <section class="card span-4"><p class="kicker">Orders</p><p class="metric">${amz.orders.orders ?? 0}</p><p class="muted">${esc(amz.orders.headline)}</p></section>
        <section class="card span-4"><p class="kicker">FBA</p><p class="metric">${amz.inventory.fulfillable ?? 0}</p><p class="muted">${esc(amz.inventory.headline)}</p></section>
        <section class="card span-4"><p class="kicker">News</p><p class="metric">${(state.amazon.news || []).length}</p><p class="muted">Seller News cards from the capture</p></section>
        <section class="card span-12">
          <h3>Latest order rows</h3>
          ${table(rows, ["id", "date", "sku", "asin", "qty", "amount", "status"])}
        </section>
        <section class="card span-12">
          <h3>Drop a report this Chrome already downloaded</h3>
          <div class="drop" data-drop="amazon">Drop Seller Central TSV/CSV here, or click to choose a file.</div>
          <input id="amazon-file" type="file" accept=".txt,.tsv,.csv" hidden />
        </section>
        <section class="card span-12">
          <p class="kicker">Toolkit</p>
          <p>${esc(AMAZON_TOOLKIT.why)}</p>
          <ul class="muted">${AMAZON_TOOLKIT.pages.map((p) => `<li><span class="mono">${esc(p.url)}</span> — ${esc(p.use)}</li>`).join("")}</ul>
        </section>
      </div>
    `;
  }

  function whatnotView() {
    const wn = whatnotSummary(state);
    const file = state.whatnot.files[0];
    const rows = whatnotSaleRows(file || { rows: [] });
    return `
      <p class="kicker">Whatnot</p>
      <h2 style="font-family:var(--serif);font-size:36px;margin:0 0 12px">Seller Hub in this Chrome</h2>
      <p class="muted">${esc(WHATNOT_TOOLKIT.why)}</p>
      <div class="grid">
        <section class="card span-6"><p class="kicker">Capture</p><p class="metric">${esc(wn.weekly.headline)}</p></section>
        <section class="card span-6"><p class="kicker">API</p><p class="metric">Closed</p><p class="muted">Not accepting new Seller API applicants.</p></section>
        <section class="card span-12">
          <h3>Latest rows</h3>
          ${table(rows, ["id", "date", "title", "sku", "type", "amount"])}
        </section>
        <section class="card span-12">
          <h3>Drop a Seller Hub CSV</h3>
          <div class="drop" data-drop="whatnot">Weekly orders, ledger, livestream, or inventory CSV.</div>
          <input id="whatnot-file" type="file" accept=".csv,.txt" hidden />
        </section>
      </div>
    `;
  }

  function chromeView() {
    return `
      <p class="kicker">This Chrome only</p>
      <h2 style="font-family:var(--serif);font-size:36px;margin:0 0 12px">Load the capture extension</h2>
      <p class="muted">Jarvis does not log in for you. It only reads tabs in the Chrome profile where you already signed in to Seller Central and Whatnot.</p>
      <ol class="steps">
        <li>Keep this app running at <span class="mono">http://127.0.0.1:4173</span>.</li>
        <li>Open <span class="mono">chrome://extensions</span>, turn on Developer mode, Load unpacked, select <span class="mono">keeppassive/extension</span>.</li>
        <li>In this same Chrome, sign in to Seller Central and Whatnot yourself.</li>
        <li>Click the KeepPassive icon → Capture Amazon / Capture Whatnot.</li>
        <li>If a password page appears, capture stops. It will not fill the form.</li>
      </ol>
      <p><button type="button" id="reload-demo">Reload demo numbers</button></p>
    `;
  }

  function table(rows, keys) {
    if (!rows.length) return `<p class="muted">Nothing captured yet.</p>`;
    return `<table><thead><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map((r) => `<tr>${keys.map((k) => `<td>${esc(r[k])}</td>`).join("")}</tr>`).join("")}
    </tbody></table>`;
  }

  function bind(el) {
    el.querySelectorAll("[data-drop]").forEach((zone) => {
      const market = zone.getAttribute("data-drop");
      const input = el.querySelector(`#${market}-file`);
      zone.addEventListener("click", () => input?.click());
      zone.addEventListener("dragover", (e) => { e.preventDefault(); });
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) readFile(market, file);
      });
      input?.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) readFile(market, file);
      });
    });
    el.querySelector("#reload-demo")?.addEventListener("click", () => {
      state = loadDemo();
      saveState(state);
      render();
    });
  }

  function readFile(market, file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      state = market === "amazon"
        ? ingestAmazonText(state, text, file.name)
        : ingestWhatnotText(state, text, file.name);
      saveState(state);
      render();
    };
    reader.readAsText(file);
  }

  window.addEventListener("hashchange", render);
  render();
  refreshRemote();
  setInterval(refreshRemote, 8000);
}
