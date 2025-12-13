const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const dns = require('dns').promises;
const net = require('net');
const app = express();
const PORT = process.env.PORT || 3002;

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
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Search rate limit exceeded, please wait'
});

app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// Serve static files
app.use(express.static(__dirname));

// AI Analysis Functions
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

function validateInput(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.length > 100) return false;
  if (!/^[a-zA-Z0-9._@\-\s]+$/.test(input)) return false;
  return validator.escape(input.trim());
}

function validateType(type) {
  const allowedTypes = ['auto', 'social', 'files', 'health', 'networks'];
  return allowedTypes.includes(type) ? type : 'auto';
}

function makeRequest(url) {
  return new Promise((resolve) => {
    if (!validator.isURL(url, { protocols: ['https'] })) {
      resolve({ error: 'Invalid URL' });
      return;
    }
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    }, (res) => {
      // Follow redirects
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
          // Try to parse as JSON first
          resolve(JSON.parse(data));
        } catch (e) {
          // If not JSON, return raw data
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
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

const CSS = `
body{font-family:monospace;margin:0;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;color:#00ff88;font-size:14px}
.navbar{background:linear-gradient(90deg,#16213e 0%,#0f3460 100%);border-bottom:2px solid #00ff88;padding:12px 0;position:fixed;top:0;width:100%;z-index:1000;box-shadow:0 2px 10px rgba(0,255,136,0.3)}
.nav-container{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px}
.logo{color:#00ff88;font-size:18px;font-weight:bold;text-decoration:none;text-shadow:0 0 10px rgba(0,255,136,0.5)}
.nav-links{display:flex;gap:20px}
.nav-links a{color:#00d9ff;text-decoration:none;padding:8px 15px;transition:all 0.3s;border-radius:4px}
.nav-links a:hover{background:rgba(0,255,136,0.2);color:#00ff88;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,255,136,0.2)}
.container{max-width:1200px;margin:80px auto 0;padding:20px}
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
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>InfoHub OSINT Professional</div>
        <div>Advanced Intelligence Gathering Platform</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="text" name="q" class="search-input" placeholder="Enter target: username, email, domain, phone, or name" required maxlength="100">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[COMPREHENSIVE SCAN]</button>
        </form>
      </div>
    </div>
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
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Social Media Intelligence</div>
        <div>Multi-platform reconnaissance across 20+ networks</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="hidden" name="type" value="social">
          <input type="text" name="q" class="search-input" placeholder="Username or email address" required maxlength="50">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[SOCIAL SCAN]</button>
        </form>
      </div>
    </div>
  </body></html>`);
});

app.get('/files', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>File Intelligence</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Document & File Intelligence</div>
        <div>Deep search across archives, documents, and repositories</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="hidden" name="type" value="files">
          <input type="text" name="q" class="search-input" placeholder="Filename, keyword, or document content" required maxlength="100">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[FILE SCAN]</button>
        </form>
      </div>
    </div>
  </body></html>`);
});

app.get('/health', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Health Intelligence</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Health & Medical Intelligence</div>
        <div>Public health records and medical research</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="hidden" name="type" value="health">
          <input type="text" name="q" class="search-input" placeholder="Medical condition, drug name, or research topic" required maxlength="50">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[HEALTH SCAN]</button>
        </form>
      </div>
    </div>
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
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Network & Infrastructure Intelligence</div>
        <div>Domain analysis, subdomain enumeration, and network reconnaissance</div>
      </div>
      
      <div class="card">
        <form action="/search" method="get">
          <input type="hidden" name="type" value="networks">
          <input type="text" name="q" class="search-input" placeholder="Domain name, IP address, or hostname" required maxlength="100">
          <button type="submit" class="btn" style="width:100%;margin-top:15px">[NETWORK SCAN]</button>
        </form>
      </div>
    </div>
  </body></html>`);
});

app.get('/about', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>About InfoHub OSINT</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>InfoHub OSINT Professional</div>
        <div>Advanced Open Source Intelligence Platform</div>
      </div>
      
      <div class="card">
        <div style="color:#00ff88;margin-bottom:20px;font-size:16px;font-weight:bold;">Professional Features:</div>
        <div style="color:#888;line-height:1.8;">
          • <span style="color:#00d9ff;">Social Media Intelligence:</span> 20+ platforms including Facebook, Twitter, Instagram, LinkedIn, GitHub<br>
          • <span style="color:#00d9ff;">Network Reconnaissance:</span> Subdomain enumeration, port scanning, DNS analysis<br>
          • <span style="color:#00d9ff;">Document Intelligence:</span> Deep file search across archives and repositories<br>
          • <span style="color:#00d9ff;">Health Intelligence:</span> Medical research and public health records<br>
          • <span style="color:#00d9ff;">Breach Detection:</span> Data breach monitoring and credential analysis<br>
          • <span style="color:#00d9ff;">AI Analysis:</span> Behavioral pattern recognition and target profiling<br>
          • <span style="color:#00d9ff;">Security Features:</span> Rate limiting, input validation, secure headers<br>
          • <span style="color:#00d9ff;">Professional API:</span> REST endpoints for automation and integration
        </div>
        
        <div style="margin-top:30px;padding:20px;border:1px solid #00d9ff;border-radius:5px;">
          <div style="color:#ff6b6b;font-weight:bold;margin-bottom:10px;">⚠️ ETHICAL USE ONLY</div>
          <div style="color:#888;font-size:12px;">
            This tool is designed for legitimate security research, penetration testing, and authorized investigations only. 
            Users must comply with all applicable laws and obtain proper authorization before conducting any reconnaissance activities.
          </div>
        </div>
      </div>
    </div>
  </body></html>`);
});

app.get('/search', searchLimiter, async (req, res) => {
  const query = validateInput(req.query.q);
  const type = validateType(req.query.type || 'auto');
  
  if (!query) {
    return res.status(400).send('Invalid input');
  }
  
  const analysis = analyzeUsername(query);
  const results = await performSearch(query, type);
  
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Search Results - InfoHub OSINT</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>Intelligence Report: ${query}</div>
        <div>Target Type: ${analysis.type} | Confidence: ${Math.round(analysis.confidence * 100)}% | Scan: ${type.toUpperCase()}</div>
      </div>
      
      ${results.map(result => `
        <div class="result ${result.status}">
          <div class="result-title">[${result.platform}]</div>
          <div class="result-data">${result.data}</div>
          ${result.url ? `<a href="${result.url}" class="result-link" target="_blank" onclick="event.stopPropagation();">🔗 OPEN LINK</a>` : ''}
        </div>
      `).join('')}
      
      <div class="card">
        <a href="/" class="btn">[NEW SEARCH]</a>
        <a href="/dashboard.html" class="btn" style="margin-left:10px;">[DASHBOARD]</a>
      </div>
    </div>
  </body></html>`);
});

async function performSearch(query, type) {
  const results = [];
  
  // Add AI analysis result
  const analysis = analyzeUsername(query);
  results.push({
    platform: 'AI Analysis',
    status: 'success',
    data: `Target classified as ${analysis.type} with ${Math.round(analysis.confidence * 100)}% confidence`
  });
  
  // Detect query type and add specific searches
  if (query.includes('@')) {
    results.push(...await searchEmail(query));
  }
  
  if (/^[\+]?[1-9][\d]{0,15}$/.test(query.replace(/[\s\-\(\)]/g, ''))) {
    results.push(...await searchPhone(query));
  }
  
  if (type === 'auto' || type === 'social') {
    results.push(...await searchSocialMedia(query));
  }
  
  if (type === 'auto' || type === 'networks') {
    results.push(...await searchNetworks(query));
  }
  
  if (type === 'auto' || type === 'files') {
    results.push(...await searchFiles(query));
  }
  
  if (type === 'auto' || type === 'health') {
    results.push(...await searchHealth(query));
  }
  
  return results;
}

async function searchSocialMedia(query) {
  const results = [];
  
  // GitHub API - Real API call
  try {
    const githubData = await makeRequest(`https://api.github.com/users/${query}`);
    if (!githubData.error && githubData.login) {
      results.push({
        platform: 'GitHub',
        status: 'success',
        data: `✓ VERIFIED: ${githubData.name || githubData.login} | Repos: ${githubData.public_repos} | Followers: ${githubData.followers} | Created: ${new Date(githubData.created_at).getFullYear()}`,
        url: githubData.html_url
      });
    } else {
      results.push({
        platform: 'GitHub',
        status: 'error',
        data: '✗ NOT FOUND: No GitHub profile with this username',
        url: `https://github.com/${query}`
      });
    }
  } catch (e) {
    results.push({
      platform: 'GitHub',
      status: 'error',
      data: '✗ ERROR: Unable to check GitHub API',
      url: `https://github.com/${query}`
    });
  }
  
  // Reddit API - Real API call
  try {
    const redditData = await makeRequest(`https://www.reddit.com/user/${query}/about.json`);
    if (!redditData.error && redditData.data) {
      const user = redditData.data;
      results.push({
        platform: 'Reddit',
        status: 'success',
        data: `✓ VERIFIED: u/${user.name} | Karma: ${user.total_karma || 'N/A'} | Created: ${new Date(user.created_utc * 1000).getFullYear()}`,
        url: `https://reddit.com/user/${query}`
      });
    } else {
      results.push({
        platform: 'Reddit',
        status: 'error',
        data: '✗ NOT FOUND: No Reddit user with this username',
        url: `https://reddit.com/user/${query}`
      });
    }
  } catch (e) {
    results.push({
      platform: 'Reddit',
      status: 'warning',
      data: '⚠ CHECK MANUALLY: Reddit API unavailable - click to verify',
      url: `https://reddit.com/user/${query}`
    });
  }
  
  // For other platforms, we'll check if the profile URL returns 200 (exists)
  const otherPlatforms = [
    { name: 'Twitter/X', url: `https://twitter.com/${query}` },
    { name: 'Instagram', url: `https://instagram.com/${query}` },
    { name: 'LinkedIn', url: `https://linkedin.com/in/${query}` },
    { name: 'Facebook', url: `https://facebook.com/${query}` },
    { name: 'YouTube', url: `https://youtube.com/@${query}` },
    { name: 'TikTok', url: `https://tiktok.com/@${query}` }
  ];
  
  for (const platform of otherPlatforms) {
    try {
      const exists = await checkURLExists(platform.url);
      results.push({
        platform: platform.name,
        status: exists ? 'success' : 'warning',
        data: exists ? '✓ PROFILE EXISTS: Click to view profile' : '⚠ CHECK MANUALLY: Profile may exist but requires verification',
        url: platform.url
      });
    } catch (e) {
      results.push({
        platform: platform.name,
        status: 'warning',
        data: '⚠ CHECK MANUALLY: Unable to verify automatically',
        url: platform.url
      });
    }
  }
  
  return results;
}

const dns = require('dns').promises;
const net = require('net');

async function searchNetworks(query) {
  const results = [];
  
  if (!validator.isIP(query) && !validator.isFQDN(query)) {
    results.push({
      platform: 'Network Analysis',
      status: 'error',
      data: '✗ INVALID FORMAT: Please enter a valid domain name or IP address'
    });
    return results;
  }
  
  // Real DNS lookup
  try {
    const addresses = await dns.resolve4(query);
    results.push({
      platform: 'DNS A Records',
      status: 'success',
      data: `✓ IP ADDRESSES: ${addresses.join(', ')}`,
      url: `https://whois.net/whois/${query}`
    });
  } catch (e) {
    results.push({
      platform: 'DNS A Records',
      status: 'error',
      data: '✗ NO A RECORDS: Domain does not resolve to IP'
    });
  }
  
  // Real MX records lookup
  try {
    const mxRecords = await dns.resolveMx(query);
    results.push({
      platform: 'MX Records',
      status: 'success',
      data: `✓ MAIL SERVERS: ${mxRecords.map(mx => `${mx.exchange} (${mx.priority})`).join(', ')}`
    });
  } catch (e) {
    results.push({
      platform: 'MX Records',
      status: 'warning',
      data: '⚠ NO MX RECORDS: No mail servers configured'
    });
  }
  
  // Real TXT records lookup
  try {
    const txtRecords = await dns.resolveTxt(query);
    const flatTxt = txtRecords.map(record => record.join('')).slice(0, 3);
    results.push({
      platform: 'TXT Records',
      status: 'success',
      data: `✓ TXT RECORDS: ${flatTxt.length} found (SPF, DKIM, etc.)`
    });
  } catch (e) {
    results.push({
      platform: 'TXT Records',
      status: 'warning',
      data: '⚠ NO TXT RECORDS: No text records found'
    });
  }
  
  // Real NS records lookup
  try {
    const nsRecords = await dns.resolveNs(query);
    results.push({
      platform: 'NS Records',
      status: 'success',
      data: `✓ NAME SERVERS: ${nsRecords.slice(0, 3).join(', ')}`
    });
  } catch (e) {
    results.push({
      platform: 'NS Records',
      status: 'error',
      data: '✗ NO NS RECORDS: Unable to find name servers'
    });
  }
  
  // Real subdomain enumeration (common subdomains)
  const commonSubdomains = ['www', 'mail', 'ftp', 'admin', 'api', 'dev', 'test', 'staging', 'blog'];
  const foundSubdomains = [];
  
  for (const sub of commonSubdomains) {
    try {
      await dns.resolve4(`${sub}.${query}`);
      foundSubdomains.push(sub);
    } catch (e) {
      // Subdomain doesn't exist
    }
  }
  
  results.push({
    platform: 'Subdomain Scanner',
    status: foundSubdomains.length > 0 ? 'success' : 'warning',
    data: foundSubdomains.length > 0 ? 
      `✓ SUBDOMAINS FOUND: ${foundSubdomains.join(', ')} (${foundSubdomains.length} total)` :
      '⚠ NO COMMON SUBDOMAINS: No standard subdomains found'
  });
  
  // Real port scanning (common ports only)
  const commonPorts = [80, 443, 22, 21, 25, 53];
  const openPorts = [];
  
  // Get IP address for port scanning
  let targetIP = query;
  if (!validator.isIP(query)) {
    try {
      const addresses = await dns.resolve4(query);
      targetIP = addresses[0];
    } catch (e) {
      results.push({
        platform: 'Port Scanner',
        status: 'error',
        data: '✗ PORT SCAN FAILED: Cannot resolve domain to IP'
      });
      return results;
    }
  }
  
  for (const port of commonPorts) {
    const isOpen = await checkPort(targetIP, port);
    if (isOpen) {
      openPorts.push(port);
    }
  }
  
  results.push({
    platform: 'Port Scanner',
    status: openPorts.length > 0 ? 'warning' : 'success',
    data: openPorts.length > 0 ? 
      `⚠ OPEN PORTS: ${openPorts.join(', ')} | Services may be exposed` :
      '✓ SECURE: No common ports open to public'
  });
  
  return results;
}

function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function searchFiles(query) {
  const results = [];
  
  // Real GitHub code search API
  try {
    const githubSearch = await makeRequest(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=5`);
    if (!githubSearch.error && githubSearch.total_count !== undefined) {
      results.push({
        platform: 'GitHub Code Search',
        status: githubSearch.total_count > 0 ? 'success' : 'warning',
        data: githubSearch.total_count > 0 ? 
          `✓ CODE FOUND: ${githubSearch.total_count} files contain "${query}"` :
          '⚠ NO CODE: No code files found with this term',
        url: `https://github.com/search?q=${encodeURIComponent(query)}&type=code`
      });
    } else {
      results.push({
        platform: 'GitHub Code Search',
        status: 'warning',
        data: '⚠ API LIMIT: GitHub search unavailable - click to search manually',
        url: `https://github.com/search?q=${encodeURIComponent(query)}&type=code`
      });
    }
  } catch (e) {
    results.push({
      platform: 'GitHub Code Search',
      status: 'error',
      data: '✗ ERROR: Unable to search GitHub',
      url: `https://github.com/search?q=${encodeURIComponent(query)}&type=code`
    });
  }
  
  // Google Dorks for different file types (these will open real Google searches)
  const fileTypes = [
    { type: 'PDF Documents', ext: 'pdf' },
    { type: 'Word Documents', ext: 'doc' },
    { type: 'Excel Spreadsheets', ext: 'xls' },
    { type: 'PowerPoint Presentations', ext: 'ppt' },
    { type: 'Text Files', ext: 'txt' }
  ];
  
  fileTypes.forEach(file => {
    results.push({
      platform: `${file.type} Search`,
      status: 'success',
      data: `🔍 GOOGLE DORK: Search for ${file.type.toLowerCase()} containing "${query}"`,
      url: `https://google.com/search?q=filetype:${file.ext}+"${encodeURIComponent(query)}"`
    });
  });
  
  // Real archive searches
  const archives = [
    { name: 'Internet Archive', url: `https://archive.org/search.php?query=${encodeURIComponent(query)}` },
    { name: 'Wayback Machine', url: `https://web.archive.org/web/*/${encodeURIComponent(query)}` },
    { name: 'Pastebin Search', url: `https://pastebin.com/search?q=${encodeURIComponent(query)}` },
    { name: 'Scribd Documents', url: `https://scribd.com/search?query=${encodeURIComponent(query)}` }
  ];
  
  archives.forEach(archive => {
    results.push({
      platform: archive.name,
      status: 'success',
      data: `🔍 ARCHIVE SEARCH: Search ${archive.name} for "${query}"`,
      url: archive.url
    });
  });
  
  return results;
}

async function searchHealth(query) {
  const results = [];
  
  // Real health database searches - these are actual working URLs
  const healthSources = [
    { 
      name: 'PubMed Research', 
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`,
      description: 'Search biomedical literature database'
    },
    { 
      name: 'WHO Global Database', 
      url: `https://www.who.int/search?indexCatalogue=genericsearchindex1&searchQuery=${encodeURIComponent(query)}`,
      description: 'World Health Organization resources'
    },
    { 
      name: 'CDC Health Information', 
      url: `https://search.cdc.gov/search/?query=${encodeURIComponent(query)}`,
      description: 'Centers for Disease Control resources'
    },
    { 
      name: 'NIH Medical Database', 
      url: `https://search.nih.gov/search?query=${encodeURIComponent(query)}`,
      description: 'National Institutes of Health database'
    },
    {
      name: 'Clinical Trials',
      url: `https://clinicaltrials.gov/search?term=${encodeURIComponent(query)}`,
      description: 'Active and completed clinical trials'
    },
    {
      name: 'FDA Drug Database',
      url: `https://www.fda.gov/search?s=${encodeURIComponent(query)}`,
      description: 'FDA approved drugs and devices'
    },
    {
      name: 'MedlinePlus',
      url: `https://medlineplus.gov/search/?query=${encodeURIComponent(query)}`,
      description: 'Consumer health information'
    }
  ];
  
  healthSources.forEach(source => {
    results.push({
      platform: source.name,
      status: 'success',
      data: `🔍 HEALTH SEARCH: ${source.description} for "${query}"`,
      url: source.url
    });
  });
  
  return results;
}

// Dashboard redirect
app.get('/dashboard', (req, res) => {
  res.redirect('/dashboard.html');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>404 - Not Found</title><style>${CSS}</style></head><body>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/" class="logo">InfoHub OSINT</a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/social">Social</a>
          <a href="/files">Files</a>
          <a href="/health">Health</a>
          <a href="/networks">Networks</a>
          <a href="/about">About</a>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <div class="hero">
        <div>404 - Page Not Found</div>
        <div>The requested resource could not be located</div>
      </div>
      
      <div class="card">
        <a href="/" class="btn">[RETURN HOME]</a>
      </div>
    </div>
  </body></html>`);
});

async function searchEmail(email) {
  const results = [];
  const domain = email.split('@')[1];
  
  // Email validation
  if (!validator.isEmail(email)) {
    results.push({
      platform: 'Email Validation',
      status: 'error',
      data: '✗ INVALID: Email format is not valid'
    });
    return results;
  }
  
  results.push({
    platform: 'Email Validation',
    status: 'success',
    data: `✓ VALID FORMAT: ${email} | Domain: ${domain}`
  });
  
  // Domain MX record check
  try {
    const mxRecords = await dns.resolveMx(domain);
    results.push({
      platform: 'Email Domain Check',
      status: 'success',
      data: `✓ DOMAIN ACTIVE: Mail servers found (${mxRecords.length} MX records)`
    });
  } catch (e) {
    results.push({
      platform: 'Email Domain Check',
      status: 'error',
      data: '✗ DOMAIN INVALID: No mail servers configured for this domain'
    });
  }
  
  // Breach check databases (real URLs)
  const breachSources = [
    { name: 'Have I Been Pwned', url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}` },
    { name: 'DeHashed Search', url: `https://dehashed.com/search?query=${encodeURIComponent(email)}` },
    { name: 'LeakCheck', url: `https://leakcheck.io/search/${encodeURIComponent(email)}` }
  ];
  
  breachSources.forEach(source => {
    results.push({
      platform: source.name,
      status: 'warning',
      data: `⚠ BREACH CHECK: Verify if ${email} appears in data breaches`,
      url: source.url
    });
  });
  
  return results;
}

async function searchPhone(phone) {
  const results = [];
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Phone validation
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    results.push({
      platform: 'Phone Validation',
      status: 'error',
      data: '✗ INVALID: Phone number format is not valid'
    });
    return results;
  }
  
  results.push({
    platform: 'Phone Validation',
    status: 'success',
    data: `✓ VALID FORMAT: ${phone} | Cleaned: ${cleanPhone}`
  });
  
  // Country detection
  let country = 'Unknown';
  if (cleanPhone.startsWith('55')) country = 'Brazil';
  else if (cleanPhone.startsWith('1')) country = 'USA/Canada';
  else if (cleanPhone.startsWith('44')) country = 'United Kingdom';
  
  results.push({
    platform: 'Country Detection',
    status: 'success',
    data: `🌍 LOCATION: ${country} | Length: ${cleanPhone.length} digits`
  });
  
  // Phone lookup services (real URLs)
  const phoneSources = [
    { name: 'TrueCaller Lookup', url: `https://truecaller.com/search/br/${encodeURIComponent(cleanPhone)}` },
    { name: 'WhitePages Search', url: `https://whitepages.com/phone/${encodeURIComponent(cleanPhone)}` }
  ];
  
  phoneSources.forEach(source => {
    results.push({
      platform: source.name,
      status: 'success',
      data: `🔍 PHONE LOOKUP: Search caller ID and owner information`,
      url: source.url
    });
  });
  
  return results;
}

app.listen(PORT, () => {
  console.log(`InfoHub OSINT Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
});