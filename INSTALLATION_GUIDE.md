# Installation & Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have:
- **Google Chrome Browser** (version 88 or higher)
- **Internet connection** (for ML backend API)
- Basic understanding of Chrome extensions

---

## 🚀 Installation Steps

### Step 1: Download the Extension

1. Download or clone this repository to your computer
2. Extract the files to a folder (e.g., `simple-phish-scanner`)

### Step 2: Load Extension in Chrome

1. Open **Google Chrome**
2. Navigate to: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select the `simple-phish-scanner` folder
6. The extension icon should appear in your Chrome toolbar

![Extension loaded successfully](https://via.placeholder.com/600x200/4CAF50/FFFFFF?text=Extension+Loaded+Successfully)

---

## ✅ Verify Installation

1. Click the extension icon in Chrome toolbar
2. You should see the "Phish Scanner" popup
3. Navigate to any webpage with links
4. Click **"Scan current page"** button
5. Results should appear within 10-60 seconds

---

## 🔧 Configuration (Optional)

### Adjust Scan Settings

Open `service_worker.js` and modify these constants:

```javascript
const MAX_URLS = 30;           // Maximum links to scan per page (default: 30)
const CONCURRENCY = 3;         // Parallel requests (default: 3)
const REQ_TIMEOUT_MS = 45000;  // Timeout per request in ms (default: 45s)
```

**Recommendations:**
- **MAX_URLS**: 20-50 for balanced performance
- **CONCURRENCY**: 2-4 (higher values may overload backend)
- **REQ_TIMEOUT_MS**: 30000-60000 (backend cold start takes ~30s)

### Change Backend API (Optional)

If you have your own ML backend:

```javascript
// In service_worker.js, line 3:
const API_ENDPOINT = "https://your-backend-url.com/predict";
```

**API Requirements:**
- Accepts POST requests
- Request format: `{ "text": "url_to_check" }`
- Response format: `{ "prediction": 0 or 1 }` (0=safe, 1=phishing)

---

## 🐛 Troubleshooting

### Extension Not Loading
- **Solution**: Make sure you selected the correct folder containing `manifest.json`
- Check Chrome version is 88+

### "Cannot scan this page" Error
- **Solution**: Reload the webpage and try again
- Some pages (chrome://, file://) cannot be scanned

### Scan Takes Too Long
- **Cause**: Backend cold start (first request after idle)
- **Solution**: Wait 30-60 seconds for first scan, subsequent scans are faster

### No Results Appearing
- **Check**: Service worker console for errors
  1. Go to `chrome://extensions/`
  2. Click "service worker" link under the extension
  3. Look for error messages

### Backend API Not Responding
- **Check**: Internet connection
- **Check**: Backend URL is correct and accessible
- **Test**: Visit `https://phis-7.onrender.com/predict` in browser

---

## 🔄 Updating the Extension

After making code changes:

1. Go to `chrome://extensions/`
2. Find "Simple Phish Scanner"
3. Click the **reload icon** (🔄)
4. Test the changes

---

## 🗑️ Uninstalling

1. Go to `chrome://extensions/`
2. Find "Simple Phish Scanner"
3. Click **"Remove"**
4. Confirm deletion

---

## 📞 Support

If you encounter issues:
1. Check the [Troubleshooting](#-troubleshooting) section above
2. Review `TECHNICAL_DOCUMENTATION.md` for architecture details
3. Check browser console for error messages

---

## 🎓 For Instructors/Reviewers

This extension demonstrates:
- ✅ Chrome Extension Manifest V3 development
- ✅ Asynchronous JavaScript (async/await, Promises)
- ✅ REST API integration with ML backend
- ✅ Concurrent request handling with Promise.all()
- ✅ Chrome Storage API usage
- ✅ Message passing between extension components
- ✅ Error handling and retry logic
- ✅ Real-time UI updates

**Testing Recommendation:**
- Use `test_page.html` for quick testing
- Try closing/reopening popup during scan to see background persistence
- Check service worker console to see batch processing in action
