# Phishing Detection Chrome Extension - Project Explanation

## 📋 Overview
This is a Chrome browser extension that scans links on any webpage and identifies whether they are **safe** or **phishing/unsafe** using a Machine Learning model deployed on the cloud.

---

## 🎯 How It Works

### 1. **User Interface (Popup)**
- When you click the extension icon, a popup window appears
- Click "**Scan current page**" button to analyze all links on the current webpage
- Results show each link with a color-coded badge:
  - 🟢 **GREEN (SAFE)** - The link is legitimate
  - 🟠 **ORANGE (SUSPICIOUS)** - The link might be risky
  - 🔴 **RED (UNSAFE)** - The link is likely phishing

### 2. **Link Extraction (Content Script)**
- The extension scans the current webpage
- Extracts all clickable links (`<a href="...">`)
- Filters out non-web links (like `mailto:`, `tel:`, `javascript:`)
- Sends up to **8 links** to be analyzed (to keep it fast)

### 3. **ML Model Analysis (Backend API)**
- Each link is sent to your deployed backend: `https://phis-7.onrender.com/predict`
- The backend uses a **Machine Learning model** to analyze the URL
- Returns a **prediction score**:
  - `0` = Safe/legitimate website
  - `1` = Phishing/malicious website
  - Values in between (0.0 to 1.0) = confidence level

### 4. **Result Display**
- Extension interprets the prediction:
  - Score **< 0.4** → SAFE
  - Score **0.4 to 0.7** → SUSPICIOUS
  - Score **≥ 0.7** → UNSAFE
- Displays results in the popup with Open/Copy buttons
- Automatically highlights suspicious/unsafe links on the actual webpage:
  - **Red shadow** around UNSAFE links
  - **Orange dashed outline** around SUSPICIOUS links

---

## 🏗️ Architecture Components

### **Frontend (Chrome Extension)**
1. **manifest.json** - Extension configuration and permissions
2. **popup.html/popup.js** - User interface that displays results
3. **content_script.js** - Runs on webpages to extract links and highlight them
4. **service_worker.js** - Background script that communicates with the ML backend

### **Backend (Cloud Deployment)**
- Deployed on **Render** at `https://phis-7.onrender.com/predict`
- Accepts POST requests with format: `{ "text": "url_to_check" }`
- Returns prediction: `{ "prediction": 0 or 1 }`
- Uses your trained ML model to classify URLs

---

## ⚙️ Technical Features

### **Performance Optimizations**
1. **Limited URLs**: Only scans first 8 links per page (for speed)
2. **Concurrent Processing**: Checks 2 URLs at a time (parallel requests)
3. **Timeout Handling**: 30-second timeout per URL (handles cold starts)
4. **Retry Logic**: Automatically retries failed requests once
5. **Caching**: Saves last scan results for quick reference

### **Error Handling**
- If backend is unreachable → defaults to SAFE (doesn't falsely alarm users)
- If timeout occurs → retries once, then marks as SAFE
- If backend returns error → marks as SAFE
- All errors logged in browser console for debugging

### **Security Features**
- Only processes HTTP/HTTPS links (skips email, phone, javascript)
- Doesn't send any personal data - only URLs
- All processing happens via secure HTTPS connection
- No data stored permanently (only cached locally in browser)

---

## 📊 How to Demonstrate

### **Setup Steps:**
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder: `simple-phish-scanner`

### **Testing Steps:**
1. Navigate to any website with multiple links (e.g., news site, university site)
2. Click the extension icon in Chrome toolbar
3. Click "**Scan current page**" button
4. Wait for results (first scan takes longer due to backend cold start)
5. Observe:
   - Color-coded badges (SAFE/SUSPICIOUS/UNSAFE)
   - Links highlighted on the actual page
   - Can click "Open" to visit links or "Copy" to copy URLs

### **Key Points to Highlight:**
- ✅ Real-time phishing detection using ML
- ✅ Visual indicators on the actual webpage
- ✅ Cloud-based ML model (scalable)
- ✅ User-friendly interface
- ✅ Fast performance (limited to 8 URLs)
- ✅ Automatic retry on failures

---

## 🔧 Technical Specifications

### **API Integration**
```javascript
// Request Format
POST https://phis-7.onrender.com/predict
Content-Type: application/json
Body: { "text": "https://example.com" }

// Response Format
{ "prediction": 0 }  // 0 = safe, 1 = phishing
```

### **Configuration**
- **MAX_URLS**: 8 (maximum links to scan per page)
- **CONCURRENCY**: 2 (parallel requests)
- **TIMEOUT**: 30 seconds per request
- **RETRIES**: 1 automatic retry on failure

### **Permissions Required**
- `storage` - Save scan results
- `activeTab` - Access current webpage
- `scripting` - Inject content script
- `tabs` - Manage browser tabs
- `<all_urls>` - Scan any website

---

## 💡 Use Cases

1. **Personal Browsing**: Protect yourself from phishing links while browsing
2. **Email Links**: Check suspicious links from emails before clicking
3. **Social Media**: Verify links shared on platforms like Facebook, Twitter
4. **Educational**: Learn about phishing patterns and URL structures
5. **Security Awareness**: Visual demonstration of ML-based threat detection

---

## 🎓 Learning Outcomes

This project demonstrates understanding of:
- **Web Extension Development** (Chrome APIs, manifest v3)
- **Machine Learning Integration** (ML model → REST API)
- **Asynchronous JavaScript** (async/await, Promises, fetch API)
- **Cloud Deployment** (Backend on Render)
- **UI/UX Design** (Popup interface, visual indicators)
- **Error Handling** (Timeouts, retries, fallbacks)
- **Security Best Practices** (HTTPS, permission management)

---

## 📝 Future Enhancements (Optional to Mention)

1. Add ability to report false positives
2. Show detailed analysis (why a URL is flagged)
3. Scan images and form actions too
4. Add whitelist/blacklist functionality
5. Export scan reports
6. Browser notifications for unsafe links
7. Real-time scanning as page loads

---

## 🚀 Conclusion

This extension combines **frontend development** (Chrome extension), **backend ML deployment** (cloud API), and **cybersecurity concepts** (phishing detection) into a practical, working application that protects users from online threats in real-time.

The system is **fast, reliable, and user-friendly**, making it suitable for everyday use while demonstrating strong technical skills in full-stack development and ML integration.
