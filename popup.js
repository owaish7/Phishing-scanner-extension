// popup.js — improved UI wiring
const scanBtn = document.getElementById('scanBtn');
const status = document.getElementById('status');
const resultsEl = document.getElementById('results');
const openBackend = document.getElementById('openBackend');

const STORAGE_KEY = 'lastScan';

function setStatus(text, busy = false) {
  status.textContent = text || '';
  if (busy) {
    const s = document.createElement('span');
    s.className = 'spinner';
    status.prepend(s);
  }
}

function clearResults() { resultsEl.innerHTML = ''; }

function renderEmpty(message) {
  clearResults();
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = message || 'No results';
  resultsEl.appendChild(li);
}

// load cached results if present
async function loadCachedResults() {
  try {
    // First check if there's an active scan in the service worker
    chrome.runtime.sendMessage({ type: 'GET_SCAN_STATUS' }, (response) => {
      // Check global scan state from service worker
      const globalScan = response && response.scanStatus;
      
      // Load from storage
      chrome.storage.local.get([STORAGE_KEY], (obj) => {
        const cached = obj[STORAGE_KEY];
        
        // If global scan exists and is in progress, show that
        if (globalScan && globalScan.inProgress === true) {
          setStatus(`Scan in progress — ${globalScan.results.length} of ${globalScan.scannedCount} results received...`);
          clearResults();
          globalScan.results.forEach(item => resultsEl.appendChild(createResultItem(item)));
          scanBtn.disabled = true;
          return;
        }
        
        // No active global scan - check storage
        if (cached && Array.isArray(cached.results) && cached.results.length) {
          // If global scan is complete or doesn't exist, mark storage as complete too
          if (!globalScan || globalScan.inProgress === false) {
            // Update storage to mark as complete if it's not already
            if (cached.inProgress === true) {
              cached.inProgress = false;
              chrome.storage.local.set({ [STORAGE_KEY]: cached });
            }
            setStatus(`Last scan — ${cached.results.length} links`);
            scanBtn.disabled = false;
          } else if (cached.inProgress === true) {
            setStatus(`Scan in progress — ${cached.results.length} results so far...`);
            scanBtn.disabled = true;
          } else {
            setStatus(`Last scan — ${cached.results.length} links`);
            scanBtn.disabled = false;
          }
          clearResults();
          cached.results.forEach(item => resultsEl.appendChild(createResultItem(item)));
        } else {
          renderEmpty('No previous scan — click Scan');
          scanBtn.disabled = false;
        }
      });
    });
  } catch (e) {
    renderEmpty('No previous scan');
    scanBtn.disabled = false;
  }
}

function createResultItem(item) {
  const li = document.createElement('li');
  li.className = 'result';

  const left = document.createElement('div');
  left.className = 'left';

  const badge = document.createElement('div');
  badge.className = 'badge ' + (item.verdict || 'safe');
  badge.textContent = (item.verdict || 'safe').toUpperCase();

  const info = document.createElement('div');
  info.style.minWidth = '0';
  const urlEl = document.createElement('div');
  urlEl.className = 'small';
  urlEl.title = item.url;
  urlEl.textContent = item.url;

  info.appendChild(urlEl);
  left.appendChild(badge);
  left.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'icon-btn';
  openBtn.title = 'Open link in new tab';
  openBtn.textContent = 'Open';
  openBtn.addEventListener('click', () => chrome.tabs.create({ url: item.url }));

  const copyBtn = document.createElement('button');
  copyBtn.className = 'icon-btn';
  copyBtn.title = 'Copy link';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    } catch (e) {
      copyBtn.textContent = 'Err';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    }
  });

  actions.appendChild(openBtn);
  actions.appendChild(copyBtn);

  li.appendChild(left);
  li.appendChild(actions);
  return li;
}

scanBtn.addEventListener('click', async () => {
  clearResults();
  setStatus('Scanning page...', true);
  scanBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) { setStatus('No active tab'); scanBtn.disabled = false; return; }

    // First, try to inject content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_script.js']
      });
      console.log('Content script injected');
    } catch (e) {
      // Content script might already be there, that's ok
      console.log('Content script already present or injection failed:', e);
    }

    // Small delay to let content script initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SCAN' }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        setStatus('Cannot scan this page (try reloading the page first)');
        renderEmpty('Cannot scan this page');
        scanBtn.disabled = false;
        return;
      }

      const links = resp.links || [];
      if (links.length === 0) { setStatus('No links found.'); renderEmpty('No links on page'); scanBtn.disabled = false; return; }

      chrome.runtime.sendMessage({ type: 'PAGE_SCAN', data: { links } }, (r) => {
        if (!r || !r.ok) { 
          setStatus('Error contacting backend.'); 
          renderEmpty('Scan failed'); 
          scanBtn.disabled = false;
          return; 
        }

        // Clear previous results and mark new scan as in progress
        try {
          chrome.storage.local.set({ [STORAGE_KEY]: { 
            results: [], 
            scannedAt: Date.now(),
            inProgress: true 
          } });
        } catch (e) {
          console.error('Failed to reset cache:', e);
        }

        // Show initial scanning status
        if (r.streaming) {
          if (typeof r.totalCount === 'number' && typeof r.scannedCount === 'number') {
            setStatus(`Scanning ${r.scannedCount} of ${r.totalCount} links... 0 results received`, true);
          } else {
            setStatus('Scanning...', true);
          }
        } else {
          // Non-streaming mode (shouldn't happen but just in case)
          scanBtn.disabled = false;
          if (typeof r.totalCount === 'number' && typeof r.scannedCount === 'number') {
            setStatus(`Scan complete: ${r.scannedCount} of ${r.totalCount} links${r.limited ? ' (limited)' : ''}`);
          } else {
            setStatus(`Scan complete: ${r.results.length} links`);
          }
          const res = r.results || [];
          if (res.length === 0) { renderEmpty('No results'); return; }
          res.forEach(item => resultsEl.appendChild(createResultItem(item)));
        }
      });
    });
  } catch (err) {
    setStatus('Unexpected error');
    renderEmpty('Error');
    scanBtn.disabled = false;
  }
});

openBackend.addEventListener('click', (e) => {
  e.preventDefault();
  // open the included test page in a new tab
  chrome.tabs.create({ url: chrome.runtime.getURL('test_page.html') });
});

// initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadCachedResults();
});

// Listen for individual results as they come in
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'SCAN_RESULT_SINGLE') {
    const item = msg.data;
    // Add result to UI immediately
    resultsEl.appendChild(createResultItem(item));
    // Update status WITHOUT spinner
    const currentCount = resultsEl.querySelectorAll('.result').length;
    setStatus(`Scanning... ${currentCount} results received`);
    // Keep button disabled during active scan
    scanBtn.disabled = true;
    
    // Cache partial results immediately as they come in
    try {
      chrome.storage.local.get([STORAGE_KEY], (obj) => {
        const cached = obj[STORAGE_KEY] || { results: [], scannedAt: Date.now() };
        cached.results.push(item);
        cached.scannedAt = Date.now();
        cached.inProgress = true; // Mark as ongoing scan
        chrome.storage.local.set({ [STORAGE_KEY]: cached });
      });
    } catch (e) {
      console.error('Failed to cache partial result:', e);
    }
  }
  if (msg && msg.type === 'SCAN_COMPLETE') {
    // Final status update when scan completes
    const data = msg.data;
    setStatus(`Scan complete: ${data.scannedCount} of ${data.totalCount} links`);
    scanBtn.disabled = false; // Re-enable button
    
    // Cache all results and mark as complete
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: { 
        results: data.results || [], 
        scannedAt: Date.now(),
        inProgress: false, // Mark as completed
        totalCount: data.totalCount,
        scannedCount: data.scannedCount
      } });
    } catch (e) {
      console.error('Failed to cache results:', e);
    }
  }
});
