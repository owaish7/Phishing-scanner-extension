
function extractLinks() {
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const set = new Set();
  const out = [];
  for (const a of anchors) {
    const raw = a.getAttribute('href');
    if (!raw) continue;
    if (raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    try {
      const url = new URL(raw, document.baseURI).toString();
      if (!set.has(url)) {
        set.add(url);
        out.push({ url, text: (a.innerText || '').trim().slice(0, 120) });
      }
    } catch (e) {}
    if (out.length >= 200) break;
  }
  return out;
}

// Respond to popup request for a scan
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'REQUEST_SCAN') {
    sendResponse({ links: extractLinks() });
  }
  if (msg && msg.type === 'SCAN_RESULT_SINGLE') {
    const item = msg.data;
    if (item.verdict === 'unsafe') {
      document.querySelectorAll('a[href]').forEach(a => {
        try {
          if (new URL(a.href).toString() === item.url) {
            a.style.boxShadow = '0 0 0 3px rgba(255,0,0,0.5)';
            a.style.outline = '2px solid red';
            a.title = `⚠️ Warning: Phishing detected!`;
          }
        } catch {}
      });
    }
  }
});


