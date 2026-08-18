window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.__keeppassive !== true) return;
  chrome.runtime.sendMessage({
    type: "network",
    url: event.data.url,
    body: event.data.body,
  });
});
