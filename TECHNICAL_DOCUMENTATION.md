# Technical Documentation

## 📐 Architecture Overview

This Chrome extension uses a **three-component architecture**:

```
┌─────────────────┐
│   Popup UI      │ ← User Interface (popup.html, popup.js)
│  (popup.html)   │
└────────┬────────┘
         │ Messages
         ↓
┌─────────────────┐
│ Service Worker  │ ← Background Script (service_worker.js)
│ (Background)    │   - API Communication
└────────┬────────┘   - Batch Processing
         │ Messages   - State Management
         ↓
┌─────────────────┐
│ Content Script  │ ← Runs on Webpages (content_script.js)
│  (Webpage)      │   - Extract Links
└─────────────────┘   - Highlight Results
```

---

## 🗂️ File Structure

### Core Extension Files

| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| `manifest.json` | Extension configuration | 17 | Defines permissions, scripts |
| `popup.html` | User interface layout | 63 | UI structure, styling |
| `popup.js` | UI logic & interaction | 273 | Scan trigger, result display |
| `service_worker.js` | Background processing | 252 | API calls, concurrency |
| `content_script.js` | Webpage interaction | 46 | Link extraction, highlighting |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Quick overview |
| `INSTALLATION_GUIDE.md` | Setup instructions |
| `TECHNICAL_DOCUMENTATION.md` | This file - architecture details |
| `EXPLANATION.md` | Feature explanation for presentation |

### Testing Files

| File | Purpose |
|------|---------|
| `test_page.html` | Simple test page with links |
| `debug_test.html` | Detailed testing page with instructions |

---

## 🔄 Data Flow

### 1. User Initiates Scan

```
User clicks "Scan current page"
  ↓
popup.js sends REQUEST_SCAN message to content_script.js
  ↓
content_script.js extracts links from webpage
  ↓
content_script.js returns links to popup.js
  ↓
popup.js sends PAGE_SCAN message to service_worker.js
```

### 2. Background Processing

```
service_worker.js receives links
  ↓
Initializes global scan state (currentScan)
  ↓
Saves initial state to chrome.storage.local
  ↓
Responds immediately to popup (streaming mode)
  ↓
Starts async batch processing:
  - Batch 1: URLs 0-2 (3 parallel requests)
  - Batch 2: URLs 3-5 (3 parallel requests)
  - Batch 3: URLs 6-8 (3 parallel requests)
  - ...
```

### 3. Result Streaming

```
For each URL result:
  ↓
service_worker.js sends SCAN_RESULT_SINGLE to:
  - popup.js (display in UI)
  - content_script.js (highlight on page)
  ↓
popup.js adds result to UI immediately
  ↓
chrome.storage.local updated with partial results
```

### 4. Completion

```
All batches complete
  ↓
service_worker.js sends SCAN_COMPLETE message
  ↓
popup.js updates status to "Scan complete"
  ↓
chrome.storage.local marked as complete (inProgress: false)
  ↓
Global scan state cleared after 5 seconds
```

---

## 🔐 Permissions Explained

```json
{
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["<all_urls>"]
}
```

| Permission | Why Needed |
|------------|------------|
| `storage` | Save scan results locally |
| `activeTab` | Access current webpage content |
| `scripting` | Inject content script dynamically |
| `tabs` | Manage browser tabs, send messages |
| `<all_urls>` | Scan any website user visits |

---

## ⚡ Concurrency Implementation

### Problem: Sequential Scanning is Slow

```
URL1 → 45s → URL2 → 45s → URL3 → 45s
Total: 135 seconds for 3 URLs
```

### Solution: Batch Processing with Promise.all()

```javascript
const CONCURRENCY = 3;  // Process 3 URLs simultaneously

for (let i = 0; i < urlsToScan.length; i += CONCURRENCY) {
  const slice = urlsToScan.slice(i, i + CONCURRENCY);
  // slice = [URL1, URL2, URL3]
  
  const batch = await Promise.all(slice.map(checkUrl));
  // Sends 3 separate HTTP requests in parallel
  // Waits for ALL 3 to complete
  
  results.push(...batch);
}
```

### Timeline with CONCURRENCY = 3

```
Time 0s:  ┌─→ Request URL1 ─┐
          ├─→ Request URL2 ─┤ All 3 in parallel
          └─→ Request URL3 ─┘
Time 45s: All 3 complete

Time 45s: ┌─→ Request URL4 ─┐
          ├─→ Request URL5 ─┤ Next batch
          └─→ Request URL6 ─┘
Time 90s: All 3 complete

Total: 90 seconds for 6 URLs (vs 270s sequential)
```

**Speed Gain:** 3× faster (with CONCURRENCY=3)

---

## 🗄️ State Management

### Two-Level State System

#### 1. Global State (Service Worker)
```javascript
let currentScan = {
  tabId: 123,
  totalCount: 30,
  scannedCount: 30,
  results: [...],
  inProgress: true,
  startedAt: 1234567890
};
```

**Lifetime:** Cleared 5 seconds after completion  
**Purpose:** Track active scans, provide real-time status

#### 2. Persistent State (Chrome Storage)
```javascript
chrome.storage.local.set({
  lastScan: {
    results: [...],
    scannedAt: 1234567890,
    inProgress: false,
    totalCount: 30,
    scannedCount: 30
  }
});
```

**Lifetime:** Persists until next scan  
**Purpose:** Cache results, survive popup closure

### State Reconciliation

When popup opens:
1. Check global state (service worker)
2. Check storage state
3. If conflict: global state is source of truth
4. Auto-fix storage if needed

---

## 🔄 Message Passing

### Message Types

| Type | Direction | Purpose | Data |
|------|-----------|---------|------|
| `REQUEST_SCAN` | popup → content | Request link extraction | - |
| `PAGE_SCAN` | popup → service worker | Start scan | `{ links: [...] }` |
| `SCAN_RESULT_SINGLE` | service worker → popup/content | Single result | `{ url, verdict, score }` |
| `SCAN_COMPLETE` | service worker → popup/content | Scan finished | `{ results, totalCount }` |
| `GET_SCAN_STATUS` | popup → service worker | Query active scan | - |

### Example Message Flow

```javascript
// popup.js → content_script.js
chrome.tabs.sendMessage(tabId, { type: 'REQUEST_SCAN' }, (response) => {
  const links = response.links;
});

// popup.js → service_worker.js
chrome.runtime.sendMessage({ 
  type: 'PAGE_SCAN', 
  data: { links: [...] } 
});

// service_worker.js → popup.js
chrome.runtime.sendMessage({ 
  type: 'SCAN_RESULT_SINGLE', 
  data: { url: '...', verdict: 'safe', score: 0.12 }
}, () => {
  if (chrome.runtime.lastError) {
    // Popup closed, ignore error
  }
});
```

---

## 🛡️ Error Handling

### 1. Backend Errors (5xx)
```javascript
if (resp.status >= 500 && retryCount < 1) {
  await new Promise(r => setTimeout(r, 1000)); // Wait 1s
  return checkUrl(url, retryCount + 1); // Retry once
}
// Default to safe on persistent error
return { url, verdict: 'safe', score: 0 };
```

### 2. Timeout Errors
```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 45000); // 45s timeout

try {
  const resp = await fetch(API_ENDPOINT, { signal: controller.signal });
} catch (e) {
  if (e.name === 'AbortError' && retryCount < 1) {
    return checkUrl(url, retryCount + 1); // Retry once
  }
  return { url, verdict: 'safe', score: 0 };
}
```

### 3. Message Passing Errors
```javascript
chrome.runtime.sendMessage(msg, () => {
  if (chrome.runtime.lastError) {
    // Popup closed or receiver unavailable - ignore
  }
});
```

**Philosophy:** Fail gracefully, default to "safe" to avoid false alarms

---

## 🎨 UI Components

### Popup Structure

```html
<div class="container">
  <div class="header">
    <div class="logo">🔍</div>
    <h1>Phish Scanner</h1>
  </div>
  
  <div class="controls">
    <button id="scanBtn">Scan current page</button>
    <div id="status">Status message</div>
  </div>
  
  <ul id="results">
    <!-- Results dynamically added here -->
    <li class="result">
      <div class="badge safe">SAFE</div>
      <div class="url">https://example.com</div>
      <button>Open</button>
      <button>Copy</button>
    </li>
  </ul>
</div>
```

### Result Item Creation

```javascript
function createResultItem(item) {
  const li = document.createElement('li');
  li.className = 'result';
  
  const badge = document.createElement('div');
  badge.className = 'badge ' + item.verdict; // 'safe' or 'unsafe'
  badge.textContent = item.verdict.toUpperCase();
  
  // ... add URL, buttons, etc.
  
  return li;
}
```

---

## 🧪 Testing Approach

### Unit Testing (Manual)

1. **Link Extraction:** Test on pages with 0, 1, 10, 100+ links
2. **Concurrency:** Monitor service worker console for batch processing
3. **Error Handling:** Disconnect internet, test timeout behavior
4. **State Persistence:** Close popup during scan, reopen, verify results
5. **Message Passing:** Check for console errors

### Integration Testing

1. **Full Scan Flow:** Start scan → close popup → reopen → verify completion
2. **Multiple Scans:** Run 2-3 scans in succession
3. **Edge Cases:** Empty pages, pages with only mailto: links
4. **Performance:** Time scans with different CONCURRENCY values

---

## 📊 Performance Metrics

### Typical Scan Times

| URLs | CONCURRENCY=1 | CONCURRENCY=3 | CONCURRENCY=5 |
|------|---------------|---------------|---------------|
| 10 | ~450s (7.5min) | ~150s (2.5min) | ~90s (1.5min) |
| 20 | ~900s (15min) | ~300s (5min) | ~180s (3min) |
| 30 | ~1350s (22min) | ~450s (7.5min) | ~270s (4.5min) |

*Assumes 45s per request (worst case with cold start)*

### Optimization Opportunities

1. **Increase CONCURRENCY** (if backend can handle it)
2. **Reduce timeout** after first request (backend warmed up)
3. **Cache results** for recently scanned URLs
4. **Prioritize visible links** (scan above-the-fold first)

---

## 🔒 Security Considerations

### What We Send to Backend
- ✅ Only URLs (no personal data)
- ✅ No cookies, passwords, or form data
- ✅ No page content or HTML

### What We Store Locally
- ✅ Scan results (URLs + verdicts)
- ✅ Timestamps
- ✅ No sensitive information

### Recommendations for Production
- 🔐 Use HTTPS for backend API (already done)
- 🔐 Implement API authentication (API key)
- 🔐 Rate limiting on backend
- 🔐 Don't hardcode API keys (use environment variables)
- 🔐 Validate URLs before sending to backend

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

1. **Chrome Extension Development**
   - Manifest V3 structure
   - Service workers vs background scripts
   - Content scripts and injection
   - Message passing architecture

2. **Asynchronous JavaScript**
   - async/await syntax
   - Promise.all() for concurrency
   - Error handling in async code
   - AbortController for timeouts

3. **API Integration**
   - RESTful API consumption
   - POST requests with fetch()
   - JSON parsing and validation
   - Retry logic and error handling

4. **State Management**
   - Global state in service worker
   - Persistent state with Chrome Storage API
   - State reconciliation between sources
   - Real-time UI updates

5. **Performance Optimization**
   - Concurrent request processing
   - Batch processing patterns
   - Timeout management
   - Resource limitation

6. **User Experience**
   - Real-time result streaming
   - Background processing
   - Graceful error handling
   - Visual feedback and status updates

---

## 📚 Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Promise.all() MDN Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
