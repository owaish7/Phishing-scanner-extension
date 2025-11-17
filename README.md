# 🔍 Phishing Detection Chrome Extension

A Chrome browser extension that scans links on webpages and identifies phishing/malicious URLs using a Machine Learning model deployed on the cloud.

## ✨ Features

- 🎯 **Real-time Phishing Detection** - Scans up to 30 links per page
- ⚡ **Concurrent Processing** - 3 parallel requests for faster scanning
- 🔄 **Background Scanning** - Continues even when popup is closed
- 💾 **Result Persistence** - Saves scan results locally
- 🎨 **Visual Indicators** - Highlights unsafe links directly on webpages
- 🔁 **Automatic Retry** - Handles backend cold starts and timeouts
- 📊 **Real-time Updates** - Streaming results as they arrive

## 🚀 Quick Start

### Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (top-right toggle)
4. Click **"Load unpacked"** and select the project folder
5. The extension icon will appear in your toolbar

### Usage

1. Navigate to any webpage with links
2. Click the extension icon
3. Click **"Scan current page"** button
4. View results with color-coded badges:
   - 🟢 **SAFE** - Legitimate link
   - 🔴 **UNSAFE** - Phishing detected

## 📁 Project Structure

```
simple-phish-scanner/
├── manifest.json              # Extension configuration
├── popup.html                 # User interface
├── popup.js                   # UI logic
├── service_worker.js          # Background processing & API calls
├── content_script.js          # Link extraction & highlighting
├── test_page.html            # Simple test page
├── INSTALLATION_GUIDE.md     # Detailed setup instructions
├── TECHNICAL_DOCUMENTATION.md # Architecture & implementation details
└── EXPLANATION.md            # Feature explanation for presentations
```

## 🏗️ Architecture

```
┌─────────────┐
│  Popup UI   │ ← User clicks "Scan"
└──────┬──────┘
       │ Messages
       ↓
┌─────────────┐
│   Service   │ ← Processes URLs in batches
│   Worker    │   Calls ML backend API
└──────┬──────┘
       │ Results
       ↓
┌─────────────┐
│  Content    │ ← Highlights unsafe links
│  Script     │   on the webpage
└─────────────┘
```

## ⚙️ Configuration

Edit `service_worker.js` to customize:

```javascript
const MAX_URLS = 30;           // Maximum links to scan (default: 30)
const CONCURRENCY = 3;         // Parallel requests (default: 3)
const REQ_TIMEOUT_MS = 45000;  // Timeout per request (default: 45s)
const API_ENDPOINT = "https://phis-7.onrender.com/predict";
```

## 🔌 Backend API

The extension connects to a cloud-hosted ML model:

**Endpoint:** `https://phis-7.onrender.com/predict`

**Request Format:**
```json
POST /predict
{
  "text": "https://example.com"
}
```

**Response Format:**
```json
{
  "prediction": 0  // 0 = safe, 1 = phishing
}
```

## 📚 Documentation

- **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Setup and configuration
- **[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)** - Architecture and implementation
- **[EXPLANATION.md](EXPLANATION.md)** - Feature overview for presentations

## 🧪 Testing

Use the included test pages:
- `test_page.html` - Simple page with test links
- `debug_test.html` - Detailed testing page with instructions

## 🎓 Technical Highlights

- ✅ Chrome Extension Manifest V3
- ✅ Asynchronous JavaScript (async/await, Promises)
- ✅ Concurrent request handling with `Promise.all()`
- ✅ Chrome Storage API for data persistence
- ✅ Message passing between extension components
- ✅ Error handling and automatic retry logic
- ✅ Real-time UI updates with streaming results

## 🔒 Security & Privacy

- Only URLs are sent to the backend (no personal data)
- Uses HTTPS for secure communication
- No cookies, passwords, or form data transmitted
- Results stored locally in browser only

## 📊 Performance

**Typical scan times** (30 URLs):
- Sequential (CONCURRENCY=1): ~22 minutes
- Parallel (CONCURRENCY=3): ~7.5 minutes ⚡
- Parallel (CONCURRENCY=5): ~4.5 minutes ⚡⚡

## 🤝 Contributing

This is an educational project demonstrating Chrome extension development and ML integration.

## 📝 License

This project is for educational purposes.

## 👨‍💻 Author

Created as a demonstration of full-stack development skills combining:
- Frontend: Chrome Extension (HTML/CSS/JavaScript)
- Backend: Cloud-deployed ML model
- Concepts: Cybersecurity, Phishing Detection, API Integration
