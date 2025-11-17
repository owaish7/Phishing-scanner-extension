const API_ENDPOINT = "https://phis-7.onrender.com/predict";
const MAX_URLS = 30;           // hard cap to avoid too many requests
const CONCURRENCY = 3;         // number of parallel requests
const REQ_TIMEOUT_MS = 45000;  // per-request timeout (45s to handle cold starts)
const STORAGE_KEY = 'lastScan';


let currentScan = null; 

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg && msg.type === 'GET_SCAN_STATUS') {
    sendResponse({ scanStatus: currentScan });
    return;
  }
  if (msg && msg.type === 'PAGE_SCAN') {
    const urls = (msg.data.links || []).map(l => l.url);
    if (urls.length === 0) {
      sendResponse({ ok: true, results: [], totalCount: 0, scannedCount: 0, limited: false });
      return;
    }

    console.log(`Scanning ${urls.length} URLs...`);
    const urlsToScan = urls.slice(0, MAX_URLS);
    if (urlsToScan.length < urls.length) {
      console.log(`Limited to first ${urlsToScan.length} of ${urls.length} URLs`);
    }

    
    const tabId = sender.tab ? sender.tab.id : null;

    currentScan = {
      tabId: tabId,
      totalCount: urls.length,
      scannedCount: urlsToScan.length,
      results: [],
      inProgress: true,
      startedAt: Date.now()
    };

    
    chrome.storage.local.set({ 
      [STORAGE_KEY]: { 
        results: [], 
        scannedAt: Date.now(),
        inProgress: true,
        totalCount: urls.length,
        scannedCount: urlsToScan.length
      } 
    });

    
    sendResponse({ 
      ok: true, 
      results: [],
      totalCount: urls.length,
      scannedCount: urlsToScan.length,
      limited: urlsToScan.length < urls.length,
      streaming: true 
    });

    
    (async () => {
      try {
       
        async function checkUrl(url, retryCount = 0){
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQ_TIMEOUT_MS);
            const resp = await fetch(API_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: url }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!resp.ok) {
              console.error('Backend error for', url, 'Status:', resp.status);
             
              if (resp.status >= 500 && retryCount < 1) {
                console.log('Retrying', url);
                await new Promise(r => setTimeout(r, 1000)); // wait 1s
                return checkUrl(url, retryCount + 1);
              }
             
              const result = { url, verdict: 'safe', score: 0 };
              
            
              if (currentScan) {
                currentScan.results.push(result);
              }
              
             
              chrome.runtime.sendMessage({ type: 'SCAN_RESULT_SINGLE', data: result }, () => {
                if (chrome.runtime.lastError) {
                
                }
              });
              
              if (sender.tab && sender.tab.id) {
                chrome.tabs.sendMessage(sender.tab.id, { type: 'SCAN_RESULT_SINGLE', data: result }, () => {
                  if (chrome.runtime.lastError) {
                   
                  }
                });
              }
              return result;
            }
            const json = await resp.json();
            let prediction = 0;
            if (json && typeof json.prediction !== 'undefined') {
              const p = Number(json.prediction);
              prediction = isNaN(p) ? 0 : p;
            }
            // Simple binary classification: 0 = safe, 1 = unsafe
            let verdict = prediction >= 0.5 ? 'unsafe' : 'safe';
            let score = prediction;
            console.log(`✓ ${url.substring(0, 40)}: ${verdict} (${prediction})`);
            const result = { url, verdict, score };
            
          
            if (currentScan) {
              currentScan.results.push(result);
            }
            
            // Send individual result to popup via runtime messaging
            chrome.runtime.sendMessage({ type: 'SCAN_RESULT_SINGLE', data: result }, () => {
              if (chrome.runtime.lastError) {
                
              }
            });
           
            if (sender.tab && sender.tab.id) {
              chrome.tabs.sendMessage(sender.tab.id, { type: 'SCAN_RESULT_SINGLE', data: result }, () => {
                if (chrome.runtime.lastError) {
                  // Content script not available, ignore
                }
              });
            }
            return result;
          } catch (e) {
            if (e.name === 'AbortError') {
              console.warn('Timeout checking', url, '- Backend may be cold starting');
              // Retry once on timeout (might be cold start)
              if (retryCount < 1) {
                console.log('Retrying after timeout:', url);
                return checkUrl(url, retryCount + 1);
              }
            } else {
              console.warn('Error checking', url, e.message);
            }
           
            const result = { url, verdict: 'safe', score: 0 };
            
           
            if (currentScan) {
              currentScan.results.push(result);
            }
            
          
            chrome.runtime.sendMessage({ type: 'SCAN_RESULT_SINGLE', data: result }, () => {
              if (chrome.runtime.lastError) {
              
              }
            });
           
            if (sender.tab && sender.tab.id) {
              chrome.tabs.sendMessage(sender.tab.id, { type: 'SCAN_RESULT_SINGLE', data: result }, () => {
                if (chrome.runtime.lastError) {
                  // Content script not available, ignore
                }
              });
            }
            return result;
          }
        }

      
        const results = [];
        for (let i = 0; i < urlsToScan.length; i += CONCURRENCY) {
          const slice = urlsToScan.slice(i, i + CONCURRENCY);
          console.log(`Batch ${Math.floor(i/CONCURRENCY)+1}: ${slice.length} requests`);
          const batch = await Promise.all(slice.map(checkUrl));
          results.push(...batch);
        }

        console.log(`Scan complete: ${results.length} processed (of ${urls.length})`);

       
        if (currentScan) {
          currentScan.inProgress = false;
          currentScan.completedAt = Date.now();
        }

        
        chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', data: { 
          results, 
          totalCount: urls.length, 
          scannedCount: urlsToScan.length 
        }}, () => {
          if (chrome.runtime.lastError) {

          }
        });
        
      
        try {
          chrome.storage.local.set({ 
            [STORAGE_KEY]: { 
              results, 
              scannedAt: Date.now(),
              inProgress: false,
              totalCount: urls.length,
              scannedCount: urlsToScan.length
            } 
          });
        } catch (e) {
          console.log('Could not save to storage:', e);
        }
        
      
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, { type: 'SCAN_COMPLETE', data: { 
            results, 
            totalCount: urls.length, 
            scannedCount: urlsToScan.length 
          }}, () => {
            if (chrome.runtime.lastError) {
              
            }
          });
        }

        // Clear global scan state after a short delay (keep it briefly in case popup reopens immediately)
        setTimeout(() => {
          if (currentScan && !currentScan.inProgress) {
            console.log('Clearing completed scan state');
            currentScan = null;
          }
        }, 5000); // Clear after 5 seconds
      } catch (e) {
        console.error('scan error', e);
      }
    })();
    
    return false; // sendResponse already called synchronously
  }
});
