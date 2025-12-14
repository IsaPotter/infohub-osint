const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const dns = require('dns').promises;
const path = require('path');

// Import utilities
const { validateSearchQuery, detectQueryType, sanitizeInput } = require('./utils/validators');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting
app.use(rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { error: 'Too many requests' }
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static files
app.use(express.static(__dirname));

// CORS
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (allowedOrigins.includes(req.headers.origin)) { res.header('Access-Control-Allow-Origin', req.headers.origin); }
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Search rate limiting
const searchLimiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 10,
  message: { error: 'Search rate limit exceeded' }
});



// Username analysis
function analyzeUsername(username) {
  const patterns = {
    business: /(official|corp|company|inc|ltd|enterprise)/i,
    gaming: /(gamer|player|pro|esports|gaming|clan)/i,
    tech: /(dev|code|tech|hack|cyber|digital|admin)/i,
    creative: /(art|design|photo|music|creative|studio)/i
  };
  
  let type = 'personal';
  let confidence = 0.7;
  
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(username)) {
      type = category;
      confidence = category === 'business' ? 0.85 : 0.80;
      break;
    }
  }
  
  return { type, confidence };
}

// Risk scoring
function calculateRiskScore(username) {
  let score = 0;
  if (username.length < 4) score += 20;
  if (/\d{4,}/.test(username)) score += 15;
  if (/(hack|crack|leak|admin|root|anon)/i.test(username)) score += 30;
  if (/[^a-zA-Z0-9_.-]/.test(username)) score += 10;
  
  return score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
}

// HTTP request helper
function makeRequest(url, timeout = 8000) {
  return new Promise((resolve) => {
    if (!validator.isURL(url, { protocols: ['https'] })) {
      return resolve({ error: 'Invalid URL' });
    }
    
    const req = https.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html'
      },
      timeout
    }, (res) => {
      // Não seguir redirecionamentos para evitar SSRF.
      // if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      //   return makeRequest(res.headers.location, timeout).then(resolve);
      // }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
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

// URL existence checker
function checkURLExists(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 8000
    }, (res) => {
      resolve([200, 302, 301, 403].includes(res.statusCode));
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// GitHub search
async function searchGitHub(username) {
  try {
    const response = await makeRequest(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (response.error || !response.login) {
      return { status: 'error', data: 'Perfil não encontrado' };
    }
    
    return {
      status: 'success',
      data: `Nome: ${response.name || 'N/A'} | Repos: ${response.public_repos || 0} | Seguidores: ${response.followers || 0} | Criado: ${new Date(response.created_at).getFullYear()}`,
      url: response.html_url
    };
  } catch (error) {
    return { status: 'error', data: 'Erro na API' };
  }
}

// Breach data simulation
async function searchBreachData(email) {
  const breaches = ['Collection1', 'LinkedIn', 'Adobe'];
  const found = email.includes('test'); // Lógica de simulação previsível
  return {
    platform: 'Breach Database',
    status: found ? 'warning' : 'success',
    data: found ? `Found in ${breaches[Math.floor(Math.random() * breaches.length)]}` : 'No breaches detected',
    url: null
  };
}

// Crypto address validation
async function searchCrypto(address) {
  const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!btcRegex.test(address) && !ethRegex.test(address)) {
    return { platform: 'Crypto', status: 'error', data: 'Invalid address format', url: null };
  }
  
  const type = address.startsWith('0x') ? 'Ethereum' : 'Bitcoin';
  const explorer = address.startsWith('0x') ? 'ethereum' : 'bitcoin';
  
  return {
    platform: 'Crypto Analysis',
    status: 'success',
    data: `Type: ${type} | Format: Valid`,
    url: `https://blockchair.com/${explorer}/address/${address}`
  };
}

// Social media search
async function searchSocialMedia(username) {
  const platforms = [
    { name: 'GitHub', url: `https://github.com/${username}`, api: true },
    { name: 'Instagram', url: `https://instagram.com/${username}` },
    { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
    { name: 'YouTube', url: `https://youtube.com/@${username}` },
    { name: 'Twitch', url: `https://twitch.tv/${username}` }
  ];

  const results = [];
  
  // AI Analysis
  const analysis = analyzeUsername(username);
  const riskScore = calculateRiskScore(username);
  results.push({
    platform: 'AI Profile Analysis',
    status: 'success',
    data: `Type: ${analysis.type} | Confidence: ${Math.round(analysis.confidence * 100)}% | Risk: ${riskScore}`,
    url: null
  });
  
  // Platform checks
  for (const platform of platforms) {
    try {
      if (platform.name === 'GitHub') {
        const result = await searchGitHub(username);
        results.push({ platform: platform.name, ...result });
      } else {
        const exists = await checkURLExists(platform.url);
        results.push({
          platform: platform.name,
          status: exists ? 'success' : 'error',
          data: exists ? 'Perfil encontrado' : 'Perfil não encontrado',
          url: exists ? platform.url : null
        });
      }
    } catch {
      results.push({
        platform: platform.name,
        status: 'error',
        data: 'Verificação falhou',
        url: null
      });
    }
  }
  
  // Dark web simulation
  const darkWebCheck = username.includes('anon'); // Lógica de simulação previsível
  results.push({
    platform: 'Dark Web Forums',
    status: darkWebCheck ? 'warning' : 'success',
    data: darkWebCheck ? `Found in ${Math.floor(Math.random() * 5) + 1} forums` : 'No activity detected',
    url: null
  });
  
  return results;
}

// Email search
async function searchEmail(email) {
  const results = [];
  
  if (!validator.isEmail(email)) {
    return [{
      platform: 'Email Validation',
      status: 'error',
      data: 'Invalid email format',
      url: null
    }];
  }
  
  const domain = email.split('@')[1];
  const providers = {
    'gmail.com': 'Google',
    'yahoo.com': 'Yahoo',
    'outlook.com': 'Microsoft',
    'hotmail.com': 'Microsoft'
  };
  
  results.push({
    platform: 'Email Intelligence',
    status: 'success',
    data: `Provider: ${providers[domain] || domain} | Type: ${providers[domain] ? 'Personal' : 'Business'}`,
    url: null
  });
  
  // DNS validation
  try {
    const mxRecords = await dns.resolveMx(domain);
    results.push({
      platform: 'Domain Analysis',
      status: 'success',
      data: `Valid domain with ${mxRecords.length} MX records`,
      url: null
    });
  } catch {
    results.push({
      platform: 'Domain Validation',
      status: 'error',
      data: 'Invalid or unreachable domain',
      url: null
    });
  }
  
  results.push(await searchBreachData(email));
  return results;
}



// Domain search
async function searchDomain(domain) {
  if (!validator.isFQDN(domain)) {
    return [{
      platform: 'Domain Validation',
      status: 'error',
      data: 'Invalid domain format',
      url: null
    }];
  }
  
  const results = [];
  
  try {
    const aRecords = await dns.resolve4(domain);
    results.push({
      platform: 'DNS Analysis',
      status: 'success',
      data: `IP: ${aRecords[0]} | Records: ${aRecords.length}`,
      url: null
    });
  } catch {
    results.push({
      platform: 'DNS Resolution',
      status: 'error',
      data: 'Domain not found or unreachable',
      url: null
    });
  }
  
  return results;
}

// API Routes
app.post('/api/search', searchLimiter, async (req, res) => {
  try {
    const { query, type } = req.body;
    
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const sanitizedQuery = sanitizeInput(validation.query);
    const detectedType = type || detectQueryType(sanitizedQuery);
    let results = [];
    
    switch (detectedType) {
      case 'social':
        results = await searchSocialMedia(sanitizedQuery);
        break;
      case 'email':
        results = await searchEmail(sanitizedQuery);
        break;

      case 'domain':
        results = await searchDomain(sanitizedQuery);
        break;
      case 'crypto':
        results = [await searchCrypto(sanitizedQuery)];
        break;
      default:
        results = await searchSocialMedia(sanitizedQuery);
    }
    
    res.json({
      results,
      query: sanitizedQuery,
      type: detectedType,
      timestamp: new Date().toISOString(),
      success: true
    });
    
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '3.0.0', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`InfoHub OSINT Server rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;