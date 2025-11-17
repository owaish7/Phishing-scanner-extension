# Technical Documentation

## Architecture

Three-component system: **Popup UI** (user interface) ↔ **Service Worker** (background processing, API calls) ↔ **Content Script** (webpage interaction, link extraction).

## Core Files

- `manifest.json` - Extension configuration & permissions
- `popup.html/js` - UI and scan logic
- `service_worker.js` - Background processing, batch API calls
- `content_script.js` - Link extraction & highlighting

## Data Flow

1. User clicks scan → popup requests links from content script
2. Content script extracts links → sends to popup
3. Popup sends links to service worker for processing
4. Service worker processes URLs in batches (3 concurrent requests)
5. Results stream back to popup & content script in real-time
6. Completion message sent when all batches finish

## Key Features

### Concurrency
Processes 3 URLs simultaneously using `Promise.all()` for 3× speed improvement:
```javascript
const CONCURRENCY = 3;
for (let i = 0; i < urls.length; i += CONCURRENCY) {
  const batch = await Promise.all(urls.slice(i, i + CONCURRENCY).map(checkUrl));
}
```

### State Management
- **Global state** (service worker): Active scan tracking, cleared after 5s
- **Persistent state** (chrome.storage): Results cache, survives popup closure

### Error Handling
- Backend errors (5xx): Retry once with 1s delay
- Timeouts (45s): Retry once, then default to "safe"
- Message errors: Silently ignore if popup closed

## Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `REQUEST_SCAN` | popup → content | Extract links |
| `PAGE_SCAN` | popup → worker | Start scan |
| `SCAN_RESULT_SINGLE` | worker → popup/content | Single result |
| `SCAN_COMPLETE` | worker → popup/content | Scan finished |

## Permissions

- `storage` - Save results locally
- `activeTab` - Access current page
- `scripting` - Inject content script
- `tabs` - Tab management
- `<all_urls>` - Scan any website

## Performance

| URLs | Sequential | Concurrent (3) |
|------|-----------|---------------|
| 10 | ~7.5 min | ~2.5 min |
| 20 | ~15 min | ~5 min |
| 30 | ~22 min | ~7.5 min |

## Security

**Sent to backend:** Only URLs (no personal data, cookies, or page content)  
**Stored locally:** Scan results and timestamps only

## Testing

1. Link extraction on pages with varying link counts
2. Concurrency monitoring via service worker console
3. Error handling (disconnect internet, test timeouts)
4. State persistence (close/reopen popup during scan)
