const https = require('https');
const dns = require('dns');
const net = require('net');

class OSINTEngine {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
  }

  async subdomainEnum(domain) {
    const subdomains = [
      'www', 'mail', 'ftp', 'admin', 'api', 'dev', 'test', 'staging',
      'blog', 'shop', 'app', 'mobile', 'secure', 'vpn', 'remote'
    ];
    
    const results = [];
    
    for (const sub of subdomains) {
      const hostname = `${sub}.${domain}`;
      try {
        await this.dnsLookup(hostname);
        results.push({
          subdomain: hostname,
          status: 'active',
          type: 'A'
        });
      } catch (e) {
        // Subdomain not found
      }
    }
    
    return results;
  }

  async portScan(target, ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389]) {
    const results = [];
    
    for (const port of ports) {
      const isOpen = await this.checkPort(target, port);
      if (isOpen) {
        results.push({
          port,
          status: 'open',
          service: this.getServiceName(port)
        });
      }
    }
    
    return results;
  }

  async checkPort(host, port, timeout = 3000) {
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

  getServiceName(port) {
    const services = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
      53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP',
      443: 'HTTPS', 993: 'IMAPS', 995: 'POP3S', 3389: 'RDP'
    };
    return services[port] || 'Unknown';
  }

  async dnsLookup(hostname) {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address) => {
        if (err) reject(err);
        else resolve(address);
      });
    });
  }

  async getDNSRecords(domain) {
    const records = {};
    
    try {
      records.A = await this.getDNSRecord(domain, 'A');
      records.MX = await this.getDNSRecord(domain, 'MX');
      records.TXT = await this.getDNSRecord(domain, 'TXT');
      records.NS = await this.getDNSRecord(domain, 'NS');
    } catch (e) {
      // Handle DNS errors
    }
    
    return records;
  }

  async getDNSRecord(domain, type) {
    return new Promise((resolve, reject) => {
      const method = `resolve${type}`;
      if (dns[method]) {
        dns[method](domain, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      } else {
        reject(new Error(`Unsupported DNS record type: ${type}`));
      }
    });
  }

  async socialMediaScan(username) {
    const platforms = [
      { name: 'GitHub', url: `https://github.com/${username}`, api: `https://api.github.com/users/${username}` },
      { name: 'Twitter', url: `https://twitter.com/${username}` },
      { name: 'Instagram', url: `https://instagram.com/${username}` },
      { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
      { name: 'Facebook', url: `https://facebook.com/${username}` },
      { name: 'YouTube', url: `https://youtube.com/@${username}` },
      { name: 'TikTok', url: `https://tiktok.com/@${username}` },
      { name: 'Reddit', url: `https://reddit.com/user/${username}` }
    ];

    const results = [];

    for (const platform of platforms) {
      try {
        if (platform.api) {
          const data = await this.makeHTTPRequest(platform.api);
          if (data && !data.message) {
            results.push({
              platform: platform.name,
              status: 'found',
              url: platform.url,
              data: this.extractProfileData(platform.name, data)
            });
          }
        } else {
          // For platforms without API, check if profile exists
          const exists = await this.checkProfileExists(platform.url);
          if (exists) {
            results.push({
              platform: platform.name,
              status: 'found',
              url: platform.url,
              data: 'Profile exists - manual verification required'
            });
          }
        }
      } catch (e) {
        results.push({
          platform: platform.name,
          status: 'error',
          error: e.message
        });
      }
    }

    return results;
  }

  extractProfileData(platform, data) {
    switch (platform) {
      case 'GitHub':
        return {
          name: data.name,
          bio: data.bio,
          location: data.location,
          company: data.company,
          repos: data.public_repos,
          followers: data.followers,
          following: data.following,
          created: data.created_at
        };
      default:
        return data;
    }
  }

  async makeHTTPRequest(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'application/json'
        },
        timeout: 10000
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async checkProfileExists(url) {
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
        },
        timeout: 5000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async emailAnalysis(email) {
    const domain = email.split('@')[1];
    const results = {
      email,
      domain,
      validation: this.validateEmail(email),
      domainInfo: await this.getDomainInfo(domain),
      breachCheck: await this.checkDataBreaches(email)
    };

    return results;
  }

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: regex.test(email),
      format: 'standard'
    };
  }

  async getDomainInfo(domain) {
    try {
      const dnsRecords = await this.getDNSRecords(domain);
      return {
        dns: dnsRecords,
        whois: 'WHOIS lookup required'
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async checkDataBreaches(email) {
    // Simulated breach check - in production, integrate with HaveIBeenPwned API
    const commonBreaches = [
      'LinkedIn (2012)', 'Adobe (2013)', 'Yahoo (2013-2014)',
      'Equifax (2017)', 'Facebook (2019)', 'Twitter (2022)'
    ];

    return {
      found: Math.random() > 0.7,
      breaches: Math.random() > 0.7 ? [commonBreaches[Math.floor(Math.random() * commonBreaches.length)]] : []
    };
  }

  async phoneAnalysis(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    return {
      number: cleaned,
      formatted: this.formatPhone(cleaned),
      country: this.getCountryFromPhone(cleaned),
      carrier: 'Carrier lookup required',
      type: this.getPhoneType(cleaned)
    };
  }

  formatPhone(phone) {
    if (phone.length === 11 && phone.startsWith('55')) {
      return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  }

  getCountryFromPhone(phone) {
    if (phone.startsWith('55')) return 'Brazil';
    if (phone.startsWith('1')) return 'USA/Canada';
    return 'Unknown';
  }

  getPhoneType(phone) {
    if (phone.length === 11 && phone.startsWith('55')) {
      const area = phone.slice(2, 4);
      const first = phone.charAt(4);
      return first === '9' ? 'Mobile' : 'Landline';
    }
    return 'Unknown';
  }

  async generateReport(target, results) {
    const report = {
      target,
      timestamp: new Date().toISOString(),
      summary: {
        totalFindings: 0,
        socialProfiles: 0,
        networkServices: 0,
        vulnerabilities: 0
      },
      findings: results,
      recommendations: this.generateRecommendations(results)
    };

    // Count findings
    if (results.social) report.summary.socialProfiles = results.social.filter(r => r.status === 'found').length;
    if (results.network) report.summary.networkServices = results.network.openPorts?.length || 0;

    report.summary.totalFindings = report.summary.socialProfiles + report.summary.networkServices;

    return report;
  }

  generateRecommendations(results) {
    const recommendations = [];

    if (results.social?.some(r => r.status === 'found')) {
      recommendations.push('Review social media privacy settings');
      recommendations.push('Consider limiting public information exposure');
    }

    if (results.network?.openPorts?.length > 0) {
      recommendations.push('Audit open network services');
      recommendations.push('Implement proper firewall rules');
    }

    if (results.email?.breachCheck?.found) {
      recommendations.push('Change passwords for compromised accounts');
      recommendations.push('Enable two-factor authentication');
    }

    return recommendations;
  }
}

module.exports = OSINTEngine;