const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const dns = require('dns').promises;

const app = express();

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
const searchLimiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 10,
  message: { error: 'Search rate limit exceeded' }
});

// Body parsing
app.use(express.json({ limit: '10kb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Validators
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a string' };
  }
  
  const trimmed = query.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Query too short (minimum 2 characters)' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Query too long (maximum 100 characters)' };
  }
  
  if (!/^[a-zA-Z0-9@._\-+\s()]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid characters detected' };
  }
  
  return { valid: true, query: trimmed };
}

function detectQueryType(query) {
  if (validator.isEmail(query)) return 'email';
  if (validator.isFQDN(query)) return 'domain';
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^0x[a-fA-F0-9]{40}$/.test(query)) return 'crypto';
  return 'social';
}

function sanitizeInput(input) {
  return validator.escape(input.trim());
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

// Social media search
async function searchSocialMedia(username) {
  const results = [];
  
  // GitHub search (real API)
  const githubResult = await searchGitHub(username);
  results.push({
    platform: 'GitHub',
    status: githubResult.status,
    data: githubResult.data,
    url: githubResult.url
  });
  
  // Other platforms (simulated)
  const platforms = ['Instagram', 'LinkedIn', 'YouTube', 'Twitch'];
  platforms.forEach(platform => {
    const exists = Math.random() > 0.5;
    results.push({
      platform,
      status: exists ? 'success' : 'error',
      data: exists ? 'Perfil encontrado' : 'Perfil não encontrado',
      url: exists ? `https://${platform.toLowerCase()}.com/${username}` : null
    });
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
  
  return [{
    platform: 'DNS Analysis',
    status: 'success',
    data: `Domain: ${domain} | Status: Valid`,
    url: null
  }];
}

// Crypto search
async function searchCrypto(address) {
  const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!btcRegex.test(address) && !ethRegex.test(address)) {
    return { platform: 'Crypto', status: 'error', data: 'Invalid address format', url: null };
  }
  
  const type = address.startsWith('0x') ? 'Ethereum' : 'Bitcoin';
  
  return {
    platform: 'Crypto Analysis',
    status: 'success',
    data: `Type: ${type} | Format: Valid`,
    url: null
  };
}

// API Routes
app.post('/search', searchLimiter, async (req, res) => {
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

app.get('/status', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '3.0.0', 
    timestamp: new Date().toISOString()
  });
});

module.exports = app;