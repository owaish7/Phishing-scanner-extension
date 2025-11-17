// server.js - simple mock backend for extension testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function scoreUrl(url) {
  url = (url || '').toLowerCase();
  const suspiciousWords = ['login','secure','update','account','verify','bank','confirm','signin','verify-account','security'];
  let score = 0.0;
  for (const w of suspiciousWords) if (url.includes(w)) score += 0.25;
  if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) score += 0.3;
  try {
    const host = new URL(url).hostname || '';
    if (host.split('-').length > 2) score += 0.15;
    if (host.length > 30) score += 0.1;
  } catch (e) {}
  if (url.startsWith('https://')) score = Math.max(0, score - 0.1);
  if (score > 1) score = 1;
  if (score < 0) score = 0;
  return Number(score.toFixed(2));
}

function verdictFromScore(score) {
  if (score >= 0.6) return 'unsafe';
  if (score >= 0.25) return 'suspicious';
  return 'safe';
}

app.post('/api/check_urls', (req, res) => {
  const urls = Array.isArray(req.body.urls) ? req.body.urls : (req.body && req.body.urls) || [];
  const results = urls.map(u => {
    const s = scoreUrl(u);
    return { url: u, verdict: verdictFromScore(s), score: s, reason: 'heuristic-mock' };
  });
  setTimeout(() => res.json({ results }), 300);
});

app.get('/', (req, res) => res.send('Phish mock backend running'));

app.listen(PORT, () => console.log(`Mock backend listening at http://localhost:${PORT}`));
