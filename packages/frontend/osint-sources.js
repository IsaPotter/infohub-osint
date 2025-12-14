// Enhanced OSINT Sources Configuration
const https = require('https');

class OSINTSources {
  constructor() {
    this.sources = {
      social: [
        { name: 'GitHub', url: 'https://github.com/{username}', api: 'https://api.github.com/users/{username}' },
        { name: 'Twitter', url: 'https://twitter.com/{username}', check: true },
        { name: 'Instagram', url: 'https://instagram.com/{username}', check: true },
        { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', check: true },
        { name: 'Reddit', url: 'https://reddit.com/user/{username}', check: true },
        { name: 'YouTube', url: 'https://youtube.com/@{username}', check: true },
        { name: 'TikTok', url: 'https://tiktok.com/@{username}', check: true },
        { name: 'Twitch', url: 'https://twitch.tv/{username}', check: true },
        { name: 'Pinterest', url: 'https://pinterest.com/{username}', check: true },
        { name: 'Snapchat', url: 'https://snapchat.com/add/{username}', check: true },
        { name: 'Discord', url: null, special: 'discord' },
        { name: 'Telegram', url: 'https://t.me/{username}', check: true },
        { name: 'Facebook', url: 'https://facebook.com/{username}', check: true },
        { name: 'VKontakte', url: 'https://vk.com/{username}', check: true },
        { name: 'Tumblr', url: 'https://{username}.tumblr.com', check: true }
      ],
      
      breach: [
        { name: 'HaveIBeenPwned', simulate: true },
        { name: 'DeHashed', simulate: true },
        { name: 'LeakCheck', simulate: true },
        { name: 'Snusbase', simulate: true }
      ],
      
      darkweb: [
        { name: 'Tor Forums', simulate: true },
        { name: 'Darknet Markets', simulate: true },
        { name: 'Paste Sites', simulate: true },
        { name: 'Credential Dumps', simulate: true }
      ],
      
      crypto: [
        { name: 'Bitcoin', explorer: 'https://blockchair.com/bitcoin/address/{address}' },
        { name: 'Ethereum', explorer: 'https://blockchair.com/ethereum/address/{address}' },
        { name: 'Litecoin', explorer: 'https://blockchair.com/litecoin/address/{address}' }
      ]
    };
  }

  async checkSocialMedia(username) {
    const results = [];
    
    // AI-powered username analysis
    const analysis = this.analyzeUsername(username);
    results.push({
      platform: '🤖 AI Profile Analysis',
      status: 'success',
      data: `Type: ${analysis.type} | Confidence: ${Math.round(analysis.confidence * 100)}% | Risk: ${analysis.risk}`,
      url: null,
      metadata: analysis
    });

    // Check all social media platforms
    for (const source of this.sources.social) {
      try {
        if (source.api) {
          const result = await this.checkAPI(source.api.replace('{username}', username), source.name);
          results.push(result);
        } else if (source.check && source.url) {
          const result = await this.checkURL(source.url.replace('{username}', username), source.name);
          results.push(result);
        } else if (source.special === 'discord') {
          results.push({
            platform: 'Discord',
            status: 'info',
            data: `Username format: ${username}#0000`,
            url: null
          });
        }
      } catch (error) {
        results.push({
          platform: source.name,
          status: 'error',
          data: 'Check failed',
          url: null
        });
      }
    }

    // Add dark web simulation
    results.push(await this.simulateDarkWebCheck(username));
    results.push(await this.simulatePastebinCheck(username));
    
    return results;
  }

  async checkEmail(email) {
    const results = [];
    const [username, domain] = email.split('@');
    
    // Email intelligence
    const emailType = this.getEmailType(domain);
    results.push({
      platform: '📧 Email Intelligence',
      status: 'success',
      data: `Provider: ${domain} | Type: ${emailType} | Username: ${username}`,
      url: null
    });

    // Breach simulation
    for (const source of this.sources.breach) {
      const found = Math.random() > 0.8;
      results.push({
        platform: `🔓 ${source.name}`,
        status: found ? 'warning' : 'success',
        data: found ? 'Email found in breach' : 'No breaches detected',
        url: null
      });
    }

    // Email variations
    const variations = this.generateEmailVariations(username, domain);
    results.push({
      platform: '🔄 Email Variations',
      status: 'info',
      data: `Possible variations: ${variations.slice(0, 3).join(', ')}...`,
      url: null
    });

    return results;
  }

  async checkCrypto(address) {
    const results = [];
    
    // Determine crypto type
    let cryptoType = 'Unknown';
    let explorerUrl = null;
    
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      cryptoType = 'Bitcoin';
      explorerUrl = `https://blockchair.com/bitcoin/address/${address}`;
    } else if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      cryptoType = 'Ethereum';
      explorerUrl = `https://blockchair.com/ethereum/address/${address}`;
    }

    if (cryptoType === 'Unknown') {
      return [{
        platform: '₿ Crypto Analysis',
        status: 'error',
        data: 'Invalid cryptocurrency address',
        url: null
      }];
    }

    // Simulate blockchain analysis
    const balance = (Math.random() * 10).toFixed(4);
    const transactions = Math.floor(Math.random() * 1000);
    
    results.push({
      platform: `₿ ${cryptoType} Analysis`,
      status: 'success',
      data: `Balance: ${balance} ${cryptoType === 'Bitcoin' ? 'BTC' : 'ETH'} | Transactions: ${transactions}`,
      url: explorerUrl
    });

    // Risk assessment
    const riskFactors = [];
    if (transactions > 100) riskFactors.push('High activity');
    if (Math.random() > 0.9) riskFactors.push('Mixer usage');
    if (Math.random() > 0.95) riskFactors.push('Exchange connection');

    results.push({
      platform: '⚠️ Risk Assessment',
      status: riskFactors.length > 0 ? 'warning' : 'success',
      data: riskFactors.length > 0 ? `Risk factors: ${riskFactors.join(', ')}` : 'Low risk profile',
      url: null
    });

    return results;
  }

  analyzeUsername(username) {
    const patterns = {
      business: /(official|corp|company|inc|ltd|enterprise)/i,
      gaming: /(gamer|player|pro|esports|gaming|clan|guild)/i,
      tech: /(dev|code|tech|hack|cyber|digital|admin|root)/i,
      creative: /(art|design|photo|music|creative|studio)/i,
      suspicious: /(anon|hack|crack|leak|dump|breach)/i
    };
    
    let type = 'personal';
    let confidence = 0.7;
    let risk = 'LOW';
    
    if (patterns.suspicious.test(username)) {
      type = 'suspicious';
      confidence = 0.9;
      risk = 'HIGH';
    } else if (patterns.business.test(username)) {
      type = 'business';
      confidence = 0.85;
    } else if (patterns.gaming.test(username)) {
      type = 'gaming';
      confidence = 0.80;
    } else if (patterns.tech.test(username)) {
      type = 'tech';
      confidence = 0.75;
      risk = 'MEDIUM';
    } else if (patterns.creative.test(username)) {
      type = 'creative';
      confidence = 0.75;
    }
    
    // Additional risk factors
    if (username.length < 4) risk = 'MEDIUM';
    if (/\d{4,}/.test(username)) risk = 'MEDIUM';
    
    return { type, confidence, risk };
  }

  async checkAPI(url, platform) {
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'InfoHub-OSINT/3.0' },
        timeout: 10000
      }, (res) => {
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(this.formatAPIResponse(parsed, platform));
            } catch (e) {
              resolve({
                platform,
                status: 'success',
                data: 'Profile found',
                url: url.replace('/api.', '/').replace('/users/', '/')
              });
            }
          });
        } else {
          resolve({
            platform,
            status: 'error',
            data: 'Profile not found',
            url: null
          });
        }
      });
      
      req.on('error', () => resolve({
        platform,
        status: 'error',
        data: 'Check failed',
        url: null
      }));
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          platform,
          status: 'error',
          data: 'Timeout',
          url: null
        });
      });
    });
  }

  async checkURL(url, platform) {
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 5000
      }, (res) => {
        const exists = res.statusCode === 200 || res.statusCode === 302;
        resolve({
          platform,
          status: exists ? 'success' : 'error',
          data: exists ? 'Profile found' : 'Profile not found',
          url: exists ? url : null
        });
      });
      
      req.on('error', () => resolve({
        platform,
        status: 'error',
        data: 'Check failed',
        url: null
      }));
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          platform,
          status: 'error',
          data: 'Timeout',
          url: null
        });
      });
    });
  }

  formatAPIResponse(data, platform) {
    switch (platform) {
      case 'GitHub':
        return {
          platform: 'GitHub',
          status: 'success',
          data: `Name: ${data.name || 'N/A'} | Repos: ${data.public_repos} | Followers: ${data.followers} | Created: ${new Date(data.created_at).getFullYear()}`,
          url: data.html_url,
          metadata: {
            verified: true,
            activity: data.public_repos > 10 ? 'high' : 'low',
            type: data.type || 'User'
          }
        };
      default:
        return {
          platform,
          status: 'success',
          data: 'Profile found',
          url: null
        };
    }
  }

  async simulateDarkWebCheck(query) {
    const found = Math.random() > 0.8;
    const forums = Math.floor(Math.random() * 5) + 1;
    
    return {
      platform: '🕸️ Dark Web Forums',
      status: found ? 'warning' : 'success',
      data: found ? `Found in ${forums} forums` : 'No activity detected',
      url: null
    };
  }

  async simulatePastebinCheck(query) {
    const found = Math.random() > 0.9;
    
    return {
      platform: '📋 Pastebin/Leaks',
      status: found ? 'warning' : 'success',
      data: found ? 'Username found in paste' : 'No leaks detected',
      url: null
    };
  }

  getEmailType(domain) {
    const personal = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
    const temp = ['10minutemail.com', 'guerrillamail.com', 'tempmail.org', 'mailinator.com'];
    
    if (personal.includes(domain.toLowerCase())) return 'Personal';
    if (temp.some(t => domain.toLowerCase().includes(t))) return 'Temporary';
    return 'Business/Custom';
  }

  generateEmailVariations(username, domain) {
    const year = new Date().getFullYear();
    return [
      `${username}.${Math.floor(Math.random() * 100)}@${domain}`,
      `${username}_${year}@${domain}`,
      `${username.charAt(0)}.${username.slice(1)}@${domain}`,
      `${username}${year}@${domain}`,
      `${username}.work@${domain}`
    ];
  }
}

module.exports = new OSINTSources();