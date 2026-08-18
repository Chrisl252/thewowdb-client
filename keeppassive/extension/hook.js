(() => {
  if (window.__keeppassiveHook) return;
  window.__keeppassiveHook = true;

  const send = (url, body) => {
    try {
      window.postMessage({ __keeppassive: true, url: String(url || ""), body }, "*");
    } catch {
      /* page may be closing */
    }
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const type = res.headers.get("content-type") || "";
      if (type.includes("json")) {
        res.clone().json().then((body) => send(args[0]?.url || args[0], body)).catch(() => {});
      }
    } catch {
      /* ignore non-json */
    }
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__keeppassiveUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        const type = this.getResponseHeader("content-type") || "";
        if (type.includes("json") && this.responseText) {
          send(this.__keeppassiveUrl, JSON.parse(this.responseText));
        }
      } catch {
        /* ignore */
      }
    });
    return origSend.apply(this, args);
  };
})();
