# Project Summary

## Overview

Chrome extension that detects phishing links on webpages using a cloud-hosted ML model.

**Tech Stack:** JavaScript, Chrome Extension API, REST API, HTML/CSS  
**Backend:** `https://phis-7.onrender.com/predict`

## Features

- Scans up to 30 links per page
- Processes 3 URLs concurrently (3× faster)
- Background scanning (continues when popup closed)
- Highlights unsafe links on webpage (red outline)
- Saves results locally for review
- Auto-retry on errors

## Architecture

**Popup UI** (user interface) ↔ **Service Worker** (background processing, API calls) ↔ **Content Script** (link extraction, highlighting)

## How It Works

1. User clicks "Scan current page"
2. Content script extracts all links from webpage
3. Service worker sends URLs to ML backend in batches
4. Backend returns prediction: 0 (safe) or 1 (phishing)
5. Results stream back to UI in real-time
6. Unsafe links highlighted on page

## Performance

| URLs | Sequential | Concurrent (3) |
|------|-----------|---------------|
| 10 | ~7.5 min | ~2.5 min |
| 30 | ~22 min | ~7.5 min |

**Implementation:** `Promise.all()` for batch processing

## Key Technical Features

- **Async Programming:** Parallel requests with `async/await`
- **Message Passing:** Communication between extension components
- **State Management:** Global + persistent storage (survives popup closure)
- **Error Handling:** Retry logic, timeout management, graceful fallbacks

## Security

**Sent to backend:** Only URLs  
**Stored locally:** Scan results + timestamps  
**Not collected:** Personal data, cookies, passwords, page content

## Installation

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select project folder

## Files

- `manifest.json` - Configuration
- `popup.html/js` - UI
- `service_worker.js` - Background processing
- `content_script.js` - Link extraction
