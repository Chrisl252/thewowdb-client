const status = document.getElementById("status");
const amazon = document.getElementById("amazon");
const whatnot = document.getElementById("whatnot");

async function jarvisUp() {
  try {
    const res = await fetch("http://127.0.0.1:4173/api/status");
    return res.ok;
  } catch {
    return false;
  }
}

function setStatus(text, kind) {
  status.textContent = text;
  status.className = `status ${kind || ""}`;
}

async function refresh() {
  const up = await jarvisUp();
  if (!up) {
    setStatus("Start Jarvis first: in keeppassive/ run npm run dev (http://127.0.0.1:4173).", "bad");
    amazon.disabled = true;
    whatnot.disabled = true;
    return;
  }
  setStatus("Jarvis is on localhost. Capture uses this Chrome's existing login.", "ok");
  amazon.disabled = false;
  whatnot.disabled = false;
}

async function run(marketplace) {
  amazon.disabled = true;
  whatnot.disabled = true;
  setStatus(`Capturing ${marketplace} from this logged-in Chrome…`);
  try {
    const result = await chrome.runtime.sendMessage({ type: "capture", marketplace });
    if (!result?.ok) throw new Error(result?.error || "capture failed");
    setStatus(`Sent ${marketplace} capture to Jarvis (${result.pages || 0} pages).`, "ok");
  } catch (err) {
    setStatus(err.message || String(err), "bad");
  }
  amazon.disabled = false;
  whatnot.disabled = false;
}

amazon.addEventListener("click", () => run("amazon"));
whatnot.addEventListener("click", () => run("whatnot"));
refresh();
