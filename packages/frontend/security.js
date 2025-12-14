// Enhanced Security Module for InfoHub OSINT
const crypto = require('crypto');

class SecurityManager {
  constructor() {
    this.suspiciousPatterns = [
      /(\bselect\b|\bunion\b|\binsert\b|\bdelete\b|\bdrop\b)/i, // SQL injection
      /(<script|javascript:|vbscript:|onload=|onerror=)/i, // XSS
      /(\.\.\/|\.\.\\|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
      /(\bexec\b|\beval\b|\bsystem\b|\bshell_exec\b)/i // Code injection
    ];
    
    this.blockedUserAgents = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python-requests/i,
      /nikto|sqlmap|nmap|masscan/i
    ];
    
    this.rateLimitStore = new Map();
    this.ipBlacklist = new Set();
  }

  validateInput(input, type = 'general') {
    if (!input || typeof input !== 'string') return false;
    
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) return false;
    }
    
    // Type-specific validation
    switch (type) {
      case 'username':
        return /^[a-zA-Z0-9._-]{1,50}$/.test(input);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) && input.length <= 100;
      case 'phone':
        return /^\+?[1-9]\d{1,14}$/.test(input.replace(/[\s\-\(\)]/g, ''));
      case 'domain':
        return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input) && input.length <= 100;
      case 'crypto':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^0x[a-fA-F0-9]{40}$/.test(input);
      default:
        return input.length <= 200;
    }
  }

  checkRateLimit(ip, endpoint = 'general') {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const limits = {
      general: 30,
      search: 10,
      api: 100
    };
    
    const key = `${ip}:${endpoint}`;
    const maxRequests = limits[endpoint] || limits.general;
    
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, []);
    }
    
    const requests = this.rateLimitStore.get(key);
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      this.ipBlacklist.add(ip);
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimitStore.set(key, recentRequests);
    return true;
  }

  isBlocked(ip, userAgent) {
    if (this.ipBlacklist.has(ip)) return true;
    
    for (const pattern of this.blockedUserAgents) {
      if (pattern.test(userAgent || '')) return true;
    }
    
    return false;
  }

  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  hashData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  encryptData(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
  }

  sanitizeOutput(data) {
    if (typeof data === 'string') {
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return data;
  }

  logSecurityEvent(type, details, ip) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      ip,
      id: this.generateSecureToken(8)
    };
    
    console.warn(`[SECURITY] ${type}: ${JSON.stringify(event)}`);
    return event;
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      
      // Check if IP is blocked
      if (this.isBlocked(ip, userAgent)) {
        this.logSecurityEvent('BLOCKED_REQUEST', { userAgent }, ip);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Rate limiting
      const endpoint = req.path.startsWith('/api/') ? 'api' : 
                     req.path.startsWith('/search') ? 'search' : 'general';
      
      if (!this.checkRateLimit(ip, endpoint)) {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { endpoint }, ip);
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    };
  }
}

module.exports = new SecurityManager();