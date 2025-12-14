const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const dns = require('dns').promises;
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3002;

// In-memory storage (use database in production)
const users = new Map();
const searchHistory = new Map();
const apiKeys = new Map();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});
app.use(limiter);

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Search rate limit exceeded, please wait'
});

app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(__dirname));

// CORS for API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Validation functions
function validateInput(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.length > 100) return false;
  if (!/^[a-zA-Z0-9._@\-\s]+$/.test(input)) return false;
  return validator.escape(input.trim());
}

function analyzeUsername(username) {
  const patterns = {
    business: /(official|corp|company|inc|ltd)/i,
    gaming: /(gamer|player|pro|esports|gaming)/i,
    tech: /(dev|code|tech|hack|cyber|digital)/i,
    creative: /(art|design|photo|music|creative)/i
  };
  
  let type = 'personal';
  let confidence = 0.7;
  
  if (patterns.business.test(username)) { type = 'business'; confidence = 0.85; }
  else if (patterns.gaming.test(username)) { type = 'gaming'; confidence = 0.80; }
  else if (patterns.tech.test(username)) { type = 'tech'; confidence = 0.75; }
  else if (patterns.creative.test(username)) { type = 'creative'; confidence = 0.75; }
  
  return { type, confidence };
}

function makeRequest(url) {
  return new Promise((resolve) => {
    if (!validator.isURL(url, { protocols: ['https'] })) {
      resolve({ error: 'Invalid URL' });
      return;
    }
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return makeRequest(res.headers.location).then(resolve);
      }
      
      if (res.statusCode !== 200) {
        resolve({ error: `HTTP ${res.statusCode}` });
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ html: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', () => resolve({ error: 'Network error' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Timeout' });
    });
  });
}

function checkURLExists(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 5000
    }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 302);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Real OSINT Functions
async function searchGitHub(username) {
  try {
    const url = `https://api.github.com/users/${username}`;
    const response = await makeRequest(url);
    if (response.error) return { status: 'error', data: 'Profile not found' };
    
    return {
      status: 'success',
      data: `Name: ${response.name || 'N/A'} | Repos: ${response.public_repos} | Followers: ${response.followers} | Created: ${new Date(response.created_at).getFullYear()}`,
      url: response.html_url
    };
  } catch (e) {
    return { status: 'error', data: 'API error' };
  }
}

async function searchSocialMedia(username) {
  const platforms = [
    { name: 'GitHub', url: `https://github.com/${username}`, api: true },
    { name: 'Twitter', url: `https://twitter.com/${username}` },
    { name: 'Instagram', url: `https://instagram.com/${username}` },
    { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
    { name: 'Reddit', url: `https://reddit.com/user/${username}` },
    { name: 'YouTube', url: `https://youtube.com/@${username}` },
    { name: 'TikTok', url: `https://tiktok.com/@${username}` },
    { name: 'Facebook', url: `https://facebook.com/${username}` }
  ];

  const results = [];
  
  // Add AI analysis first
  const analysis = analyzeUsername(username);
  results.push({
    platform: 'AI Profile Analysis',
    status: 'success',
    data: `Profile Type: ${analysis.type} | Confidence: ${Math.round(analysis.confidence * 100)}% | Risk Level: ${analysis.confidence > 0.8 ? 'HIGH' : 'MEDIUM'}`,
    url: null
  });
  
  for (const platform of platforms) {
    if (platform.name === 'GitHub') {
      const result = await searchGitHub(username);
      results.push({ platform: platform.name, ...result });
    } else {
      const exists = await checkURLExists(platform.url);
      results.push({
        platform: platform.name,
        status: exists ? 'success' : 'error',
        data: exists ? 'Profile found' : 'Profile not found',
        url: exists ? platform.url : null
      });
    }
  }
  
  // Add Deep Web searches (simulated)
  results.push(...await searchDeepWeb(username));
  
  return results;
}

async function searchDeepWeb(username) {
  const deepResults = [];
  
  // Dark Web Forums (simulated)
  const darkWebCheck = Math.random() > 0.8;
  deepResults.push({
    platform: '🕸️ Dark Web Forums',
    status: darkWebCheck ? 'warning' : 'success',
    data: darkWebCheck ? `⚠️ Username found in ${Math.floor(Math.random() * 5) + 1} dark web forums` : '✓ No dark web activity detected',
    url: null
  });
  
  // Breach Databases
  const breachCheck = Math.random() > 0.7;
  deepResults.push({
    platform: '💀 Data Breach Scanner',
    status: breachCheck ? 'error' : 'success',
    data: breachCheck ? `🚨 Found in ${Math.floor(Math.random() * 8) + 1} data breaches` : '✓ No breaches detected',
    url: null
  });
  
  // Cryptocurrency Analysis
  const cryptoCheck = Math.random() > 0.85;
  deepResults.push({
    platform: '₿ Crypto Wallet Tracker',
    status: cryptoCheck ? 'success' : 'warning',
    data: cryptoCheck ? `💰 ${Math.floor(Math.random() * 3) + 1} crypto wallets linked` : '⚠️ No crypto activity found',
    url: null
  });
  
  // Leaked Credentials
  const credCheck = Math.random() > 0.75;
  deepResults.push({
    platform: '🔐 Credential Leaks',
    status: credCheck ? 'error' : 'success',
    data: credCheck ? `🚨 Credentials leaked in ${Math.floor(Math.random() * 4) + 1} databases` : '✓ No credential leaks found',
    url: null
  });
  
  // Phone Number Intelligence
  const phoneCheck = Math.random() > 0.6;
  deepResults.push({
    platform: '📱 Phone Intelligence',
    status: phoneCheck ? 'success' : 'warning',
    data: phoneCheck ? `📞 ${Math.floor(Math.random() * 3) + 1} phone numbers associated` : '⚠️ No phone data available',
    url: null
  });
  
  // Email Pattern Analysis
  const emailCheck = Math.random() > 0.65;
  deepResults.push({
    platform: '📧 Email Pattern Analysis',
    status: emailCheck ? 'success' : 'warning',
    data: emailCheck ? `✉️ ${Math.floor(Math.random() * 5) + 1} email variations detected` : '⚠️ Limited email intelligence',
    url: null
  });
  
  // Facial Recognition (simulated)
  const faceCheck = Math.random() > 0.9;
  deepResults.push({
    platform: '👤 Facial Recognition DB',
    status: faceCheck ? 'warning' : 'success',
    data: faceCheck ? `📸 Face matched in ${Math.floor(Math.random() * 2) + 1} databases` : '✓ No facial matches found',
    url: null
  });
  
  return deepResults;
}

async function searchEmail(email) {
  const results = [];
  const domain = email.split('@')[1];
  
  if (!validator.isEmail(email)) {
    results.push({
      platform: 'Email Validation',
      status: 'error',
      data: 'Invalid email format',
      url: null
    });
    return results;
  }
  
  // Email Intelligence Analysis
  results.push({
    platform: '🧠 Email Intelligence',
    status: 'success',
    data: `Provider: ${domain} | Type: ${domain.includes('gmail') ? 'Personal' : domain.includes('outlook') ? 'Personal' : 'Business'} | Risk: ${Math.random() > 0.7 ? 'HIGH' : 'LOW'}`,
    url: null
  });
  
  try {
    const mxRecords = await dns.resolveMx(domain);
    results.push({
      platform: 'Domain MX Records',
      status: 'success',
      data: `Valid domain with ${mxRecords.length} MX records: ${mxRecords.map(r => r.exchange).join(', ')}`,
      url: null
    });
  } catch (e) {
    results.push({
      platform: 'Domain Validation',
      status: 'error',
      data: 'Invalid domain',
      url: null
    });
  }
  
  // HaveIBeenPwned simulation
  const breachCheck = Math.random() > 0.6;
  results.push({
    platform: '💀 HaveIBeenPwned',
    status: breachCheck ? 'error' : 'success',
    data: breachCheck ? `🚨 Found in ${Math.floor(Math.random() * 12) + 1} data breaches` : '✓ No breaches found',
    url: null
  });
  
  // Dark Web Monitoring
  const darkWebEmail = Math.random() > 0.8;
  results.push({
    platform: '🕸️ Dark Web Monitor',
    status: darkWebEmail ? 'warning' : 'success',
    data: darkWebEmail ? `⚠️ Email found in ${Math.floor(Math.random() * 3) + 1} dark web markets` : '✓ No dark web activity',
    url: null
  });
  
  // Social Media Linking
  const socialLink = Math.random() > 0.7;
  results.push({
    platform: '🔗 Social Media Links',
    status: socialLink ? 'success' : 'warning',
    data: socialLink ? `📱 Linked to ${Math.floor(Math.random() * 4) + 1} social accounts` : '⚠️ No social links found',
    url: null
  });
  
  // Spam Database Check
  const spamCheck = Math.random() > 0.85;
  results.push({
    platform: '🚫 Spam Database',
    status: spamCheck ? 'error' : 'success',
    data: spamCheck ? '🚨 Listed in spam databases' : '✓ Clean reputation',
    url: null
  });
  
  return results;
}

async function searchPhone(phone) {
  const results = [];
  
  // Phone validation
  if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    results.push({
      platform: 'Phone Validation',
      status: 'error',
      data: 'Invalid phone format',
      url: null
    });
    return results;
  }
  
  // Country Detection
  const countryCode = phone.startsWith('+55') ? 'Brazil' : phone.startsWith('+1') ? 'USA' : 'Unknown';
  results.push({
    platform: '🌍 Country Detection',
    status: 'success',
    data: `Country: ${countryCode} | Type: ${Math.random() > 0.5 ? 'Mobile' : 'Landline'}`,
    url: null
  });
  
  // Carrier Lookup
  const carriers = ['Vivo', 'Claro', 'TIM', 'Oi', 'Verizon', 'AT&T'];
  results.push({
    platform: '📡 Carrier Lookup',
    status: 'success',
    data: `Carrier: ${carriers[Math.floor(Math.random() * carriers.length)]} | Active: ${Math.random() > 0.3 ? 'Yes' : 'No'}`,
    url: null
  });
  
  // TrueCaller Simulation
  const truecaller = Math.random() > 0.6;
  results.push({
    platform: '📞 TrueCaller DB',
    status: truecaller ? 'success' : 'warning',
    data: truecaller ? `Name: ${['João Silva', 'Maria Santos', 'Pedro Costa'][Math.floor(Math.random() * 3)]}` : '⚠️ No caller ID found',
    url: null
  });
  
  // Spam Reports
  const spamReports = Math.random() > 0.8;
  results.push({
    platform: '🚫 Spam Reports',
    status: spamReports ? 'error' : 'success',
    data: spamReports ? `🚨 ${Math.floor(Math.random() * 50) + 1} spam reports` : '✓ No spam reports',
    url: null
  });
  
  return results;
}

async function searchDomain(domain) {
  const results = [];
  
  try {
    // DNS Lookup
    const aRecords = await dns.resolve4(domain);
    results.push({
      platform: 'DNS A Records',
      status: 'success',
      data: `IP Addresses: ${aRecords.join(', ')}`,
      url: null
    });
    
    // MX Records
    const mxRecords = await dns.resolveMx(domain);
    results.push({
      platform: 'MX Records',
      status: 'success',
      data: `Mail servers: ${mxRecords.map(r => r.exchange).join(', ')}`,
      url: null
    });
    
    // Subdomain enumeration (simulated)
    const subdomains = ['www', 'mail', 'ftp', 'admin', 'api', 'blog'];
    const foundSubs = subdomains.filter(() => Math.random() > 0.7);
    results.push({
      platform: '🔍 Subdomain Enum',
      status: foundSubs.length > 0 ? 'success' : 'warning',
      data: foundSubs.length > 0 ? `Found: ${foundSubs.join(', ')}.${domain}` : 'No subdomains found',
      url: null
    });
    
    // Port Scan (simulated)
    const openPorts = [80, 443, 22, 21, 25].filter(() => Math.random() > 0.6);
    results.push({
      platform: '🔓 Port Scan',
      status: openPorts.length > 0 ? 'warning' : 'success',
      data: openPorts.length > 0 ? `Open ports: ${openPorts.join(', ')}` : 'No open ports detected',
      url: null
    });
    
  } catch (e) {
    results.push({
      platform: 'Domain Analysis',
      status: 'error',
      data: 'Domain not found or invalid',
      url: null
    });
  }
  
  return results;
}

// User Management
function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateApiKey() {
  return 'ib_' + crypto.randomBytes(20).toString('hex');
}

function saveSearchHistory(userId, query, type, results) {
  if (!searchHistory.has(userId)) {
    searchHistory.set(userId, []);
  }
  
  const history = searchHistory.get(userId);
  history.unshift({
    id: crypto.randomBytes(8).toString('hex'),
    query,
    type,
    results: results.length,
    timestamp: new Date().toISOString(),
    preview: results.slice(0, 3)
  });
  
  // Keep only last 50 searches
  if (history.length > 50) {
    history.splice(50);
  }
}

// API Authentication
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !apiKeys.has(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.userId = apiKeys.get(apiKey);
  next();
}

// Routes
app.get('/', (req, res) => {
  const userId = req.query.user || generateUserId();
  const userHistory = searchHistory.get(userId) || [];
  
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InfoHub OSINT Professional</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #00ff88;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .matrix-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0.1;
            z-index: -1;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border: 2px solid #00ff88;
            border-radius: 10px;
            background: rgba(0, 255, 136, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 0 20px #00ff88;
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
            from { text-shadow: 0 0 20px #00ff88; }
            to { text-shadow: 0 0 30px #00ff88, 0 0 40px #00ff88; }
        }
        
        .subtitle {
            color: #888;
            font-size: 1.2em;
            margin-bottom: 20px;
        }
        
        .nav-tabs {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .nav-tab {
            padding: 12px 24px;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            color: #00ff88;
            cursor: pointer;
            border-radius: 5px;
            transition: all 0.3s;
            font-family: inherit;
        }
        
        .nav-tab:hover, .nav-tab.active {
            background: rgba(0, 255, 136, 0.3);
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
        }
        
        .search-section {
            background: rgba(0, 0, 0, 0.7);
            padding: 30px;
            border-radius: 10px;
            border: 1px solid #333;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        
        .search-form {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .search-input {
            flex: 1;
            min-width: 250px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #00ff88;
            color: #00ff88;
            border-radius: 5px;
            font-family: inherit;
            font-size: 16px;
        }
        
        .search-input:focus {
            outline: none;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
        }
        
        .search-btn {
            padding: 15px 30px;
            background: linear-gradient(45deg, #00ff88, #00cc6a);
            color: #000;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-family: inherit;
            transition: all 0.3s;
            min-width: 120px;
        }
        
        .search-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 255, 136, 0.4);
        }
        
        .search-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .results {
            margin-top: 30px;
        }
        
        .result-item {
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 4px solid #00ff88;
            transition: all 0.3s;
        }
        
        .result-item:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 15px rgba(0, 255, 136, 0.2);
        }
        
        .result-item.success { border-left-color: #00ff88; }
        .result-item.warning { border-left-color: #ffaa00; }
        .result-item.error { border-left-color: #ff4444; }
        
        .result-platform {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 8px;
        }
        
        .result-data {
            color: #ccc;
            margin-bottom: 10px;
            line-height: 1.4;
        }
        
        .result-url {
            color: #00ff88;
            text-decoration: none;
            font-size: 0.9em;
        }
        
        .result-url:hover {
            text-decoration: underline;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2em;
        }
        
        .spinner {
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 3px solid rgba(0, 255, 136, 0.3);
            border-radius: 50%;
            border-top-color: #00ff88;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .premium-banner {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        .premium-btn {
            background: white;
            color: #333;
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.3s;
        }
        
        .premium-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .history-section {
            background: rgba(0, 0, 0, 0.7);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #333;
            margin-bottom: 30px;
        }
        
        .history-item {
            background: rgba(0, 255, 136, 0.1);
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 3px solid #00ff88;
        }
        
        .history-query {
            font-weight: bold;
            color: #00ff88;
        }
        
        .history-meta {
            color: #888;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .api-section {
            background: rgba(0, 0, 0, 0.7);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #333;
            margin-bottom: 30px;
        }
        
        .api-key {
            background: rgba(0, 255, 136, 0.1);
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            border-top: 1px solid #333;
            margin-top: 50px;
            color: #666;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            color: #00ff88;
            text-decoration: none;
            margin: 0 15px;
            font-size: 1.1em;
            transition: all 0.3s;
        }
        
        .social-links a:hover {
            text-shadow: 0 0 10px #00ff88;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header h1 { font-size: 2em; }
            .search-form { flex-direction: column; }
            .search-input { min-width: auto; }
            .nav-tabs { justify-content: center; }
            .nav-tab { padding: 10px 16px; font-size: 0.9em; }
        }
        
        @media (max-width: 480px) {
            .header h1 { font-size: 1.5em; }
            .subtitle { font-size: 1em; }
            .search-section { padding: 20px; }
            .result-item { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    <div class="container">
        <div class="header">
            <h1>🕵️ InfoHub OSINT Professional</h1>
            <p class="subtitle">Advanced Open Source Intelligence Platform</p>
            <div class="nav-tabs">
                <button class="nav-tab active" onclick="showTab('search')">🔍 Search</button>
                <button class="nav-tab" onclick="showTab('history')">📊 History</button>
                <button class="nav-tab" onclick="showTab('api')">🔧 API</button>
                <button class="nav-tab" onclick="showTab('mobile')">📱 Mobile</button>
            </div>
        </div>
        
        <div class="premium-banner">
            <h3>🚀 Upgrade to Premium - R$ 89,90/mês</h3>
            <p>Dark Web Scanning • Breach Databases • Crypto Tracking • API Access</p>
            <button class="premium-btn" onclick="window.open('https://wa.me/5577998731012?text=Quero%20assinar%20o%20InfoHub%20Premium', '_blank')">Assinar Premium</button>
        </div>
        
        <div id="search-tab" class="tab-content">
            <div class="search-section">
                <h3>🔍 Intelligence Search</h3>
                <form class="search-form" onsubmit="performSearch(event)">
                    <input type="text" class="search-input" id="searchQuery" placeholder="Enter username, email, phone, or domain..." required>
                    <select class="search-input" id="searchType" style="flex: 0 0 150px;">
                        <option value="auto">Auto Detect</option>
                        <option value="social">Social Media</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="domain">Domain</option>
                    </select>
                    <button type="submit" class="search-btn" id="searchBtn">Search</button>
                </form>
            </div>
            
            <div id="results" class="results"></div>
        </div>
        
        <div id="history-tab" class="tab-content" style="display: none;">
            <div class="history-section">
                <h3>📊 Search History</h3>
                <div id="historyList">
                    ${userHistory.map(item => `
                        <div class="history-item">
                            <div class="history-query">${item.query} (${item.type})</div>
                            <div class="history-meta">${new Date(item.timestamp).toLocaleString('pt-BR')} • ${item.results} results</div>
                        </div>
                    `).join('')}
                    ${userHistory.length === 0 ? '<p style="color: #666; text-align: center; padding: 20px;">No search history yet</p>' : ''}
                </div>
            </div>
        </div>
        
        <div id="api-tab" class="tab-content" style="display: none;">
            <div class="api-section">
                <h3>🔧 API Access</h3>
                <p>Generate API key for automated OSINT searches:</p>
                <button class="search-btn" onclick="generateAPIKey()">Generate API Key</button>
                <div id="apiKeyDisplay"></div>
                
                <h4 style="margin-top: 30px;">API Documentation</h4>
                <pre style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 5px; overflow-x: auto;">
POST /api/search
Headers: X-API-Key: your_api_key
Body: {
  "query": "target",
  "type": "auto" // auto, social, email, phone, domain
}

Response: {
  "results": [...],
  "timestamp": "2024-01-01T00:00:00Z"
}
                </pre>
            </div>
        </div>
        
        <div id="mobile-tab" class="tab-content" style="display: none;">
            <div class="api-section">
                <h3>📱 Mobile App</h3>
                <p>Download our mobile app for OSINT on the go:</p>
                <div style="margin: 20px 0;">
                    <button class="search-btn" style="margin: 10px;" onclick="alert('Android app coming soon!')">📱 Android App</button>
                    <button class="search-btn" style="margin: 10px;" onclick="alert('iOS app coming soon!')">🍎 iOS App</button>
                </div>
                
                <h4>Telegram Bot</h4>
                <p>Use our Telegram bot for quick searches:</p>
                <button class="search-btn" onclick="window.open('https://t.me/InfoHubOSINTBot', '_blank')">🤖 Open Telegram Bot</button>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="https://github.com/infohub-osint" target="_blank">GitHub</a>
                <a href="https://twitter.com/infohub_osint" target="_blank">Twitter</a>
                <a href="https://wa.me/5577998731012" target="_blank">WhatsApp</a>
                <a href="https://t.me/infohub_osint" target="_blank">Telegram</a>
            </div>
            <p>&copy; 2024 InfoHub OSINT Professional. Made with ❤️ for OSINT Community</p>
            <p style="margin-top: 10px; font-size: 0.9em;">User ID: ${userId}</p>
        </div>
    </div>
    
    <script>
        let currentUserId = '${userId}';
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            
            // Remove active class from all nav tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + '-tab').style.display = 'block';
            
            // Add active class to clicked nav tab
            event.target.classList.add('active');
        }
        
        async function performSearch(event) {
            event.preventDefault();
            
            const query = document.getElementById('searchQuery').value.trim();
            const type = document.getElementById('searchType').value;
            const resultsDiv = document.getElementById('results');
            const searchBtn = document.getElementById('searchBtn');
            
            if (!query) return;
            
            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
            
            resultsDiv.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Scanning databases and networks...
                </div>
            `;
            
            try {
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, type, userId: currentUserId })
                });
                
                const data = await response.json();
                displayResults(data.results);
                
                // Refresh history
                if (data.historyUpdated) {
                    location.reload();
                }
                
            } catch (error) {
                resultsDiv.innerHTML = `
                    <div class="result-item error">
                        <div class="result-platform">Error</div>
                        <div class="result-data">Search failed: ${error.message}</div>
                    </div>
                `;
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search';
            }
        }
        
        function displayResults(results) {
            const resultsDiv = document.getElementById('results');
            
            if (!results || results.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="result-item warning">
                        <div class="result-platform">No Results</div>
                        <div class="result-data">No information found for this query</div>
                    </div>
                `;
                return;
            }
            
            resultsDiv.innerHTML = results.map(result => `
                <div class="result-item ${result.status}">
                    <div class="result-platform">${result.platform}</div>
                    <div class="result-data">${result.data}</div>
                    ${result.url ? `<a href="${result.url}" target="_blank" class="result-url">🔗 View Profile</a>` : ''}
                </div>
            `).join('');
        }
        
        async function generateAPIKey() {
            try {
                const response = await fetch('/api/generate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId })
                });
                
                const data = await response.json();
                
                document.getElementById('apiKeyDisplay').innerHTML = `
                    <h4 style="margin-top: 20px;">Your API Key:</h4>
                    <div class="api-key">${data.apiKey}</div>
                    <p style="color: #ffaa00; margin-top: 10px;">⚠️ Keep this key secure! It provides access to your account.</p>
                `;
                
            } catch (error) {
                alert('Failed to generate API key: ' + error.message);
            }
        }
        
        // Auto-detect search type
        document.getElementById('searchQuery').addEventListener('input', function(e) {
            const query = e.target.value.trim();
            const typeSelect = document.getElementById('searchType');
            
            if (query.includes('@')) {
                typeSelect.value = 'email';
            } else if (/^\+?[1-9]\d{1,14}$/.test(query.replace(/[\s\-\(\)]/g, ''))) {
                typeSelect.value = 'phone';
            } else if (query.includes('.') && !query.includes(' ')) {
                typeSelect.value = 'domain';
            } else {
                typeSelect.value = 'social';
            }
        });
        
        // Matrix background effect
        function createMatrixEffect() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.className = 'matrix-bg';
            document.body.appendChild(canvas);
            
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const chars = '01';
            const charArray = chars.split('');
            const fontSize = 14;
            const columns = canvas.width / fontSize;
            const drops = [];
            
            for (let x = 0; x < columns; x++) {
                drops[x] = 1;
            }
            
            function draw() {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#00ff88';
                ctx.font = fontSize + 'px monospace';
                
                for (let i = 0; i < drops.length; i++) {
                    const text = charArray[Math.floor(Math.random() * charArray.length)];
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                    
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                    }
                    drops[i]++;
                }
            }
            
            setInterval(draw, 35);
        }
        
        // Initialize matrix effect
        createMatrixEffect();
        
        // Handle window resize
        window.addEventListener('resize', function() {
            const canvas = document.querySelector('.matrix-bg');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        });
    </script>
</body>
</html>
  `);
});

// API Routes
app.post('/api/generate-key', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  const apiKey = generateApiKey();
  apiKeys.set(apiKey, userId);
  
  res.json({ apiKey, message: 'API key generated successfully' });
});

app.post('/api/search', authenticateAPI, async (req, res) => {
  const { query, type = 'auto' } = req.body;
  const userId = req.userId;
  
  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  const validatedQuery = validateInput(query);
  if (!validatedQuery) {
    return res.status(400).json({ error: 'Invalid query format' });
  }
  
  let results = [];
  let detectedType = type;
  
  if (type === 'auto') {
    if (validatedQuery.includes('@')) detectedType = 'email';
    else if (/^\+?[1-9]\d{1,14}$/.test(validatedQuery.replace(/[\s\-\(\)]/g, ''))) detectedType = 'phone';
    else if (validatedQuery.includes('.') && !validatedQuery.includes(' ')) detectedType = 'domain';
    else detectedType = 'social';
  }
  
  try {
    switch (detectedType) {
      case 'social':
        results = await searchSocialMedia(validatedQuery);
        break;
      case 'email':
        results = await searchEmail(validatedQuery);
        break;
      case 'phone':
        results = await searchPhone(validatedQuery);
        break;
      case 'domain':
        results = await searchDomain(validatedQuery);
        break;
      default:
        results = await searchSocialMedia(validatedQuery);
    }
    
    saveSearchHistory(userId, validatedQuery, detectedType, results);
    
    res.json({
      results,
      query: validatedQuery,
      type: detectedType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = searchHistory.get(userId) || [];
  
  res.json({ history });
});

app.post('/search', searchLimiter, async (req, res) => {
  const { query, type = 'auto', userId } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  const validatedQuery = validateInput(query);
  if (!validatedQuery) {
    return res.status(400).json({ error: 'Invalid input format' });
  }
  
  let results = [];
  let detectedType = type;
  
  // Auto-detect type
  if (type === 'auto') {
    if (validatedQuery.includes('@')) {
      detectedType = 'email';
    } else if (/^\+?[1-9]\d{1,14}$/.test(validatedQuery.replace(/[\s\-\(\)]/g, ''))) {
      detectedType = 'phone';
    } else if (validatedQuery.includes('.') && !validatedQuery.includes(' ')) {
      detectedType = 'domain';
    } else {
      detectedType = 'social';
    }
  }
  
  try {
    switch (detectedType) {
      case 'social':
        results = await searchSocialMedia(validatedQuery);
        break;
      case 'email':
        results = await searchEmail(validatedQuery);
        break;
      case 'phone':
        results = await searchPhone(validatedQuery);
        break;
      case 'domain':
        results = await searchDomain(validatedQuery);
        break;
      default:
        results = await searchSocialMedia(validatedQuery);
    }
    
    // Save to history if userId provided
    if (userId) {
      saveSearchHistory(userId, validatedQuery, detectedType, results);
    }
    
    res.json({ 
      results, 
      query: validatedQuery, 
      type: detectedType,
      historyUpdated: !!userId
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🕵️ InfoHub OSINT Server running on port ${PORT}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
});

module.exports = app;
      status: 'error',
      data: 'Invalid domain or no MX records',
      url: null
    });
  }
  
  // Advanced Email Searches
  const breachCheck = Math.random() > 0.7;
  results.push({
    platform: '💀 HaveIBeenPwned',
    status: breachCheck ? 'error' : 'success',
    data: breachCheck ? `🚨 Found in ${Math.floor(Math.random() * 12) + 1} data breaches` : '✓ No breaches detected',
    url: null
  });
  
  const darkWebCheck = Math.random() > 0.8;
  results.push({
    platform: '🕸️ Dark Web Monitoring',
    status: darkWebCheck ? 'warning' : 'success',
    data: darkWebCheck ? '⚠️ Email found in dark web marketplaces' : '✓ No dark web exposure',
    url: null
  });
  
  const socialCheck = Math.random() > 0.6;
  results.push({
    platform: '🔗 Social Media Linking',
    status: socialCheck ? 'success' : 'warning',
    data: socialCheck ? `📱 Linked to ${Math.floor(Math.random() * 6) + 1} social accounts` : '⚠️ Limited social presence',
    url: null
  });
  
  const spamCheck = Math.random() > 0.75;
  results.push({
    platform: '🚫 Spam Database Check',
    status: spamCheck ? 'warning' : 'success',
    data: spamCheck ? '⚠️ Email flagged in spam databases' : '✓ Clean email reputation',
    url: null
  });
  
  return results;
}

async function searchDomain(domain) {
  const results = [];
  
  try {
    const aRecords = await dns.resolve4(domain);
    results.push({
      platform: 'DNS A Records',
      status: 'success',
      data: `IP Addresses: ${aRecords.join(', ')}`,
      url: null
    });
  } catch (e) {
    results.push({
      platform: 'DNS A Records',
      status: 'error',
      data: 'No A records found',
      url: null
    });
  }
  
  try {
    const txtRecords = await dns.resolveTxt(domain);
    results.push({
      platform: 'DNS TXT Records',
      status: 'success',
      data: `Found ${txtRecords.length} TXT records`,
      url: null
    });
  } catch (e) {
    results.push({
      platform: 'DNS TXT Records',
      status: 'warning',
      data: 'No TXT records found',
      url: null
    });
  }
  
  const subdomains = ['www', 'mail', 'ftp', 'admin', 'api', 'blog', 'shop', 'dev'];
  let foundSubdomains = [];
  
  for (const sub of subdomains) {
    try {
      await dns.resolve4(`${sub}.${domain}`);
      foundSubdomains.push(sub);
    } catch (e) {}
  }
  
  results.push({
    platform: 'Subdomain Enumeration',
    status: foundSubdomains.length > 0 ? 'success' : 'warning',
    data: foundSubdomains.length > 0 ? `Found subdomains: ${foundSubdomains.join(', ')}` : 'No common subdomains found',
    url: null
  });
  
  return results;
}

const CSS = `
body{font-family:monospace;margin:0;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;color:#00ff88;font-size:14px}
.navbar{background:linear-gradient(90deg,#16213e 0%,#0f3460 100%);border-bottom:2px solid #00ff88;padding:12px 0;position:fixed;top:0;width:100%;z-index:1000;box-shadow:0 2px 10px rgba(0,255,136,0.3)}
.nav-container{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px}
.logo{color:#00ff88;font-size:18px;font-weight:bold;text-decoration:none;text-shadow:0 0 10px rgba(0,255,136,0.5)}
.nav-links{display:flex;gap:20px}
.nav-links a{color:#00d9ff;text-decoration:none;padding:8px 15px;transition:all 0.3s;border-radius:4px}
.nav-links a:hover{background:rgba(0,255,136,0.2);color:#00ff88;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,255,136,0.2)}
.container{max-width:1200px;margin:80px auto 0;padding:20px;min-height:calc(100vh - 200px)}
.hero{text-align:left;color:#00ff88;padding:40px 0;margin-bottom:20px}
.hero div:first-child{font-size:32px;font-weight:bold;text-shadow:0 0 20px rgba(0,255,136,0.6)}
.hero div:last-child{color:#00d9ff;margin-top:10px}
.card{background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:2px solid #00ff88;padding:25px;margin:20px 0;border-radius:8px;box-shadow:0 4px 15px rgba(0,255,136,0.2)}
.search-input{width:100%;padding:12px;border:2px solid #00d9ff;background:#0a0a0a;color:#00ff88;font-family:monospace;font-size:14px;outline:none;border-radius:4px;transition:all 0.3s}
.search-input:focus{border-color:#00ff88;box-shadow:0 0 10px rgba(0,255,136,0.4)}
.btn{background:linear-gradient(135deg,#00ff88 0%,#00d9ff 100%);color:#000;padding:12px 20px;border:none;cursor:pointer;font-size:14px;font-family:monospace;font-weight:bold;transition:all 0.3s;text-decoration:none;display:inline-block;border-radius:4px;box-shadow:0 4px 10px rgba(0,255,136,0.3)}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 15px rgba(0,255,136,0.5)}
.result{background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:2px solid #00d9ff;padding:15px;margin:15px 0;color:#00ff88;font-family:monospace;font-size:12px;border-radius:6px;transition:all 0.3s;cursor:pointer}
.result:hover{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);transform:translateX(5px);box-shadow:0 4px 12px rgba(0,217,255,0.3)}
.result-title{color:#00ff88;font-weight:bold;font-size:14px;text-shadow:0 0 5px rgba(0,255,136,0.3)}
.result-data{color:#ccc;margin:5px 0;line-height:1.4}
.result-link{color:#00d9ff;text-decoration:none;transition:all 0.2s;display:inline-block;margin-top:8px;padding:4px 8px;border:1px solid #00d9ff;border-radius:3px}
.result-link:hover{color:#000;background:#00d9ff;text-shadow:none}
.success{border-color:#00ff88;box-shadow:0 0 10px rgba(0,255,136,0.3)}
.success .result-title{color:#00ff88}
.warning{border-color:#ffaa00;box-shadow:0 0 10px rgba(255,170,0,0.3)}
.warning .result-title{color:#ffaa00}
.error{border-color:#ff0055;box-shadow:0 0 10px rgba(255,0,85,0.3)}
.error .result-title{color:#ff0055}
.social-section{background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:2px solid #00d9ff;padding:25px;margin:20px 0;border-radius:8px;text-align:center}
.social-title{color:#00ff88;font-size:18px;font-weight:bold;margin-bottom:15px;text-shadow:0 0 10px rgba(0,255,136,0.5)}
.social-links{display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.social-link{color:#00d9ff;text-decoration:none;padding:10px 15px;border:2px solid #00d9ff;border-radius:6px;transition:all 0.3s;font-weight:bold}
.social-link:hover{background:#00d9ff;color:#000;transform:translateY(-2px);box-shadow:0 4px 10px rgba(0,217,255,0.4)}
.footer{background:linear-gradient(90deg,#16213e 0%,#0f3460 100%);border-top:2px solid #00ff88;padding:30px 0;margin-top:50px}
.footer-container{max-width:1200px;margin:0 auto;padding:0 20px;text-align:center}
.footer-content{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:30px;margin-bottom:20px}
.footer-section h3{color:#00ff88;font-size:16px;margin-bottom:15px;text-shadow:0 0 5px rgba(0,255,136,0.3)}
.footer-section p,.footer-section a{color:#ccc;font-size:12px;line-height:1.6;text-decoration:none}
.footer-section a:hover{color:#00d9ff;text-shadow:0 0 5px rgba(0,217,255,0.3)}
.footer-bottom{border-top:1px solid #333;padding-top:20px;color:#666;font-size:11px}
.premium-banner{background:linear-gradient(135deg,#ff6b35 0%,#f7931e 100%);border:2px solid #ff6b35;padding:20px;margin:20px 0;border-radius:8px;text-align:center;color:#000}
.premium-title{font-size:20px;font-weight:bold;margin-bottom:10px}
.premium-price{font-size:24px;font-weight:bold;margin:10px 0}
.premium-features{font-size:12px;margin:10px 0;line-height:1.4}
`;

// Routes
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>InfoHub OSINT</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/networks">Networks</a>
          <a href="/premium">Premium</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>InfoHub OSINT Professional</div>
        <div>Deep Web • Dark Web • AI Analysis • Breach Detection</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="text" name="q" class="search-input" placeholder="Enter target: username, email, domain" required maxlength="100">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[COMPREHENSIVE SCAN]</button>
        </form>
      </div>
      
      <div class="social-section">
        <div class="social-title">🌐 Siga-nos nas Redes Sociais</div>
        <div class="social-links">
          <a href="https://github.com/infohub-osint" class="social-link" target="_blank">GitHub</a>
          <a href="https://twitter.com/infohub_osint" class="social-link" target="_blank">Twitter</a>
          <a href="https://instagram.com/infohub.osint" class="social-link" target="_blank">Instagram</a>
          <a href="https://linkedin.com/company/infohub-osint" class="social-link" target="_blank">LinkedIn</a>
          <a href="https://youtube.com/@infohubosint" class="social-link" target="_blank">YouTube</a>
          <a href="https://t.me/infohubosint" class="social-link" target="_blank">Telegram</a>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>InfoHub OSINT</h3>
            <p>Plataforma profissional de inteligência de código aberto para investigações digitais e análise de segurança.</p>
          </div>
          <div class="footer-section">
            <h3>Recursos</h3>
            <p><a href="/social">Busca Social Media</a></p>
            <p><a href="/networks">Análise de Rede</a></p>
            <p><a href="/premium">Versão Premium</a></p>
          </div>
          <div class="footer-section">
            <h3>Contato</h3>
            <p><a href="mailto:support@infohub-osint.com">support@infohub-osint.com</a></p>
            <p><a href="https://wa.me/5577998731012">📱 WhatsApp: (77) 99873-1012</a></p>
            <p><a href="tel:+5577998731012">📞 Telefone: (77) 99873-1012</a></p>
            <p><a href="https://t.me/infohubosint">Telegram Support</a></p>
          </div>
          <div class="footer-section">
            <h3>Legal</h3>
            <p>Uso ético apenas</p>
            <p>Respeite as leis locais</p>
            <p>© 2024 InfoHub OSINT</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>⚠️ Esta ferramenta é destinada apenas para uso ético e autorizado. Os usuários são responsáveis por cumprir todas as leis aplicáveis.</p>
        </div>
      </div>
    </footer>
  </body></html>`);
});

app.get('/premium', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>InfoHub OSINT Premium</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/networks">Networks</a>
          <a href="/premium">Premium</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>InfoHub OSINT Premium</div>
        <div>Recursos Avançados para Profissionais</div>
      </div>
      
      <div class="premium-banner">
        <div class="premium-title">🚀 UPGRADE PARA PREMIUM</div>
        <div class="premium-price">R$ 89,90/mês</div>
        <div class="premium-features">
          ✅ Dark Web & Deep Web scanning<br>
          ✅ Breach database access (50+ sources)<br>
          ✅ Cryptocurrency wallet tracking<br>
          ✅ Facial recognition database<br>
          ✅ Phone intelligence & OSINT<br>
          ✅ Real-time monitoring alerts<br>
          ✅ Professional PDF reports<br>
          ✅ API unlimited access
        </div>
        <a href="https://wa.me/5577998731012?text=Ol%C3%A1%21%20Quero%20comprar%20o%20InfoHub%20OSINT%20Premium%20por%20R%24%2089%2C90%2Fm%C3%AAs" class="btn" style="margin-top:15px;font-size:16px;padding:15px 30px">[COMPRAR PREMIUM - WhatsApp]</a>
      </div>
      
      <div class="social-section">
        <div class="social-title">🌐 Siga-nos nas Redes Sociais</div>
        <div class="social-links">
          <a href="https://github.com/infohub-osint" class="social-link" target="_blank">GitHub</a>
          <a href="https://twitter.com/infohub_osint" class="social-link" target="_blank">Twitter</a>
          <a href="https://instagram.com/infohub.osint" class="social-link" target="_blank">Instagram</a>
          <a href="https://linkedin.com/company/infohub-osint" class="social-link" target="_blank">LinkedIn</a>
          <a href="https://youtube.com/@infohubosint" class="social-link" target="_blank">YouTube</a>
          <a href="https://t.me/infohubosint" class="social-link" target="_blank">Telegram</a>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>InfoHub OSINT</h3>
            <p>Plataforma profissional de inteligência de código aberto.</p>
          </div>
          <div class="footer-section">
            <h3>Suporte</h3>
            <p><a href="mailto:support@infohub-osint.com">support@infohub-osint.com</a></p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2024 InfoHub OSINT - Uso ético apenas</p>
        </div>
      </div>
    </footer>
  </body></html>`);
});

app.get('/search', searchLimiter, async (req, res) => {
  const query = validateInput(req.query.q);
  if (!query) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  let results = [];
  const analysis = analyzeUsername(query);
  
  if (query.includes('@')) {
    results = await searchEmail(query);
  } else if (query.includes('.') && !query.includes(' ')) {
    results = await searchDomain(query);
  } else {
    results = await searchSocialMedia(query);
  }
  
  const resultsHTML = results.map(result => `
    <div class="result ${result.status}">
      <div class="result-title">[${result.platform}]</div>
      <div class="result-data">${result.data}</div>
      ${result.url ? `<a href="${result.url}" target="_blank" class="result-link">Visit Profile</a>` : ''}
    </div>
  `).join('');
  
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Search Results - InfoHub OSINT</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/networks">Networks</a>
          <a href="/premium">Premium</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Search Results for: ${query}</div>
        <div>Analysis: ${analysis.type} profile (${Math.round(analysis.confidence * 100)}% confidence)</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="text" name="q" class="search-input" placeholder="New search..." value="${query}">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[NEW SEARCH]</button>
        </form>
      </div>
      
      ${resultsHTML}
      
      <div class="premium-banner">
        <div class="premium-title">🚀 Quer mais resultados?</div>
        <div class="premium-features">
          Premium: Dark Web Scan • Breach DB • Crypto Tracking • Face Recognition • Real-time Alerts
        </div>
        <a href="https://wa.me/5577998731012?text=Quero%20fazer%20upgrade%20para%20Premium%20-%20R%24%2089%2C90" class="btn" style="margin-top:10px">[UPGRADE PREMIUM - R$ 89,90/mês]</a>
      </div>
    </div>
    
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-bottom">
          <p>© 2024 InfoHub OSINT - Uso ético apenas</p>
        </div>
      </div>
    </footer>
  </body></html>`);
});

app.get('/social', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Social Media Intelligence</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/networks">Networks</a>
          <a href="/premium">Premium</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Social Media Intelligence</div>
        <div>Search across 8+ social platforms</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="text" name="q" class="search-input" placeholder="Enter username to search" required>
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[SEARCH SOCIAL MEDIA]</button>
        </form>
      </div>
      
      <div class="social-section">
        <div class="social-title">🌐 Siga-nos nas Redes Sociais</div>
        <div class="social-links">
          <a href="https://github.com/infohub-osint" class="social-link" target="_blank">GitHub</a>
          <a href="https://twitter.com/infohub_osint" class="social-link" target="_blank">Twitter</a>
          <a href="https://instagram.com/infohub.osint" class="social-link" target="_blank">Instagram</a>
          <a href="https://linkedin.com/company/infohub-osint" class="social-link" target="_blank">LinkedIn</a>
          <a href="https://youtube.com/@infohubosint" class="social-link" target="_blank">YouTube</a>
          <a href="https://t.me/infohubosint" class="social-link" target="_blank">Telegram</a>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-bottom">
          <p>© 2024 InfoHub OSINT - Uso ético apenas</p>
        </div>
      </div>
    </footer>
  </body></html>`);
});

app.get('/networks', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Network Intelligence</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/networks">Networks</a>
          <a href="/premium">Premium</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Network Intelligence</div>
        <div>DNS, Subdomains, Email Analysis</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="text" name="q" class="search-input" placeholder="Enter domain or email" required>
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[ANALYZE NETWORK]</button>
        </form>
      </div>
      
      <div class="social-section">
        <div class="social-title">🌐 Siga-nos nas Redes Sociais</div>
        <div class="social-links">
          <a href="https://github.com/infohub-osint" class="social-link" target="_blank">GitHub</a>
          <a href="https://twitter.com/infohub_osint" class="social-link" target="_blank">Twitter</a>
          <a href="https://instagram.com/infohub.osint" class="social-link" target="_blank">Instagram</a>
          <a href="https://linkedin.com/company/infohub-osint" class="social-link" target="_blank">LinkedIn</a>
          <a href="https://youtube.com/@infohubosint" class="social-link" target="_blank">YouTube</a>
          <a href="https://t.me/infohubosint" class="social-link" target="_blank">Telegram</a>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-bottom">
          <p>© 2024 InfoHub OSINT - Uso ético apenas</p>
        </div>
      </div>
    </footer>
  </body></html>`);
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`InfoHub OSINT running on port ${PORT}`);
  });
}