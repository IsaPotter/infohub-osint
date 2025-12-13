const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const OSINTEngine = require('../shared/osint-modules');

const app = express();
const osint = new OSINTEngine();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 scans per minute
  message: { error: 'Scan rate limit exceeded' }
});

app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Comprehensive OSINT scan
app.post('/api/scan/comprehensive', scanLimiter, async (req, res) => {
  try {
    const { target, type = 'auto' } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }

    const results = {};
    const startTime = Date.now();

    // Determine target type and run appropriate scans
    if (type === 'auto' || type === 'social') {
      if (target.includes('@')) {
        results.email = await osint.emailAnalysis(target);
        results.social = await osint.socialMediaScan(target.split('@')[0]);
      } else {
        results.social = await osint.socialMediaScan(target);
      }
    }

    if (type === 'auto' || type === 'network') {
      if (isValidDomain(target) || isValidIP(target)) {
        results.network = {
          dns: await osint.getDNSRecords(target),
          subdomains: await osint.subdomainEnum(target),
          openPorts: await osint.portScan(target)
        };
      }
    }

    if (type === 'auto' || type === 'phone') {
      if (isValidPhone(target)) {
        results.phone = await osint.phoneAnalysis(target);
      }
    }

    const report = await osint.generateReport(target, results);
    report.executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Social media reconnaissance
app.post('/api/scan/social', scanLimiter, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const results = await osint.socialMediaScan(username);
    
    res.json({
      success: true,
      data: {
        username,
        platforms: results,
        summary: {
          total: results.length,
          found: results.filter(r => r.status === 'found').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Network reconnaissance
app.post('/api/scan/network', scanLimiter, async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }

    if (!isValidDomain(target) && !isValidIP(target)) {
      return res.status(400).json({ error: 'Invalid domain or IP address' });
    }

    const results = {
      target,
      dns: await osint.getDNSRecords(target),
      subdomains: await osint.subdomainEnum(target),
      openPorts: await osint.portScan(target)
    };

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Email analysis
app.post('/api/scan/email', scanLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const results = await osint.emailAnalysis(email);
    
    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Phone analysis
app.post('/api/scan/phone', scanLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const results = await osint.phoneAnalysis(phone);
    
    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Subdomain enumeration
app.post('/api/scan/subdomains', scanLimiter, async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({ error: 'Valid domain is required' });
    }

    const subdomains = await osint.subdomainEnum(domain);
    
    res.json({
      success: true,
      data: {
        domain,
        subdomains,
        count: subdomains.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Port scanning
app.post('/api/scan/ports', scanLimiter, async (req, res) => {
  try {
    const { target, ports } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }

    const openPorts = await osint.portScan(target, ports);
    
    res.json({
      success: true,
      data: {
        target,
        openPorts,
        scannedPorts: ports || [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389]
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch processing
app.post('/api/scan/batch', scanLimiter, async (req, res) => {
  try {
    const { targets, type = 'social' } = req.body;
    
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: 'Targets array is required' });
    }

    if (targets.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 targets per batch' });
    }

    const results = [];
    
    for (const target of targets) {
      try {
        let result;
        
        switch (type) {
          case 'social':
            result = await osint.socialMediaScan(target);
            break;
          case 'email':
            result = await osint.emailAnalysis(target);
            break;
          case 'phone':
            result = await osint.phoneAnalysis(target);
            break;
          default:
            result = { error: 'Unsupported scan type' };
        }
        
        results.push({
          target,
          success: true,
          data: result
        });
        
      } catch (error) {
        results.push({
          target,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: targets.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validation functions
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function isValidDomain(domain) {
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

function isValidIP(ip) {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip);
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`OSINT API Server running on port ${PORT}`);
});

module.exports = app;