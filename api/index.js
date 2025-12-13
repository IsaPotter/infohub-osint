const https = require('https');
const { parse } = require('url');

function validateInput(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.length > 100) return false;
  if (!/^[a-zA-Z0-9._@\-\s]+$/.test(input)) return false;
  return input.trim();
}

function makeRequest(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InfoHub/1.0)',
        'Accept': 'application/json'
      },
      timeout: 5000
    }, (res) => {
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
          resolve({ error: 'Invalid JSON' });
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

const CSS = `body{font-family:monospace;margin:0;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;color:#00ff88;font-size:14px}.navbar{background:linear-gradient(90deg,#16213e 0%,#0f3460 100%);border-bottom:2px solid #00ff88;padding:12px 0;position:fixed;top:0;width:100%;z-index:1000;box-shadow:0 2px 10px rgba(0,255,136,0.3)}.nav-container{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px}.logo{color:#00ff88;font-size:18px;font-weight:bold;text-decoration:none;text-shadow:0 0 10px rgba(0,255,136,0.5)}.nav-links{display:flex;gap:20px}.nav-links a{color:#00d9ff;text-decoration:none;padding:8px 15px;transition:all 0.3s;border-radius:4px}.nav-links a:hover{background:rgba(0,255,136,0.2);color:#00ff88;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,255,136,0.2)}.container{max-width:1200px;margin:80px auto 0;padding:20px}.hero{text-align:left;color:#00ff88;padding:40px 0;margin-bottom:20px}.hero div:first-child{font-size:32px;font-weight:bold;text-shadow:0 0 20px rgba(0,255,136,0.6)}.hero div:last-child{color:#00d9ff;margin-top:10px}.card{background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:2px solid #00ff88;padding:25px;margin:20px 0;border-radius:8px;box-shadow:0 4px 15px rgba(0,255,136,0.2)}.search-input{width:100%;padding:12px;border:2px solid #00d9ff;background:#0a0a0a;color:#00ff88;font-family:monospace;font-size:14px;outline:none;border-radius:4px;transition:all 0.3s}.search-input:focus{border-color:#00ff88;box-shadow:0 0 10px rgba(0,255,136,0.4)}.btn{background:linear-gradient(135deg,#00ff88 0%,#00d9ff 100%);color:#000;padding:12px 20px;border:none;cursor:pointer;font-size:14px;font-family:monospace;font-weight:bold;transition:all 0.3s;text-decoration:none;display:inline-block;border-radius:4px;box-shadow:0 4px 10px rgba(0,255,136,0.3)}.btn:hover{transform:translateY(-2px);box-shadow:0 6px 15px rgba(0,255,136,0.5)}.result{background:linear-gradient(135deg,#16213e 0%,#1a1a2e 100%);border:2px solid #00d9ff;padding:15px;margin:15px 0;color:#00ff88;font-family:monospace;font-size:12px;border-radius:6px;transition:all 0.3s}.result-title{color:#00ff88;font-weight:bold;font-size:14px;text-shadow:0 0 5px rgba(0,255,136,0.3)}.result-data{color:#ccc;margin:5px 0;line-height:1.4}.result-link{color:#00d9ff;text-decoration:none;transition:all 0.2s;display:inline-block;margin-top:8px;padding:4px 8px;border:1px solid #00d9ff;border-radius:3px}.result-link:hover{color:#000;background:#00d9ff;text-shadow:none}`;

module.exports = async (req, res) => {
  const { pathname, query } = parse(req.url, true);
  
  res.setHeader('Content-Type', 'text/html');
  
  if (pathname === '/') {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>InfoHub OSINT</title><style>${CSS}</style></head><body>
      <nav class="navbar">
        <div class="nav-container">
          <a href="/" class="logo">InfoHub OSINT Professional</a>
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/search">Search</a>
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
            <input type="text" name="q" class="search-input" placeholder="Enter username or email" required maxlength="100">
            <button type="submit" class="btn" style="width:100%;margin-top:15px">[COMPREHENSIVE SCAN]</button>
          </form>
        </div>
      </div>
    </body></html>`);
    return;
  }
  
  if (pathname === '/search') {
    const searchQuery = validateInput(query.q);
    if (!searchQuery) {
      res.status(400).send('Invalid input');
      return;
    }
    
    const results = [];
    
    try {
      const githubData = await makeRequest(`https://api.github.com/users/${searchQuery}`);
      if (!githubData.error) {
        results.push({
          platform: 'GitHub',
          data: `✓ Found: ${githubData.name || searchQuery} | Repos: ${githubData.public_repos} | Followers: ${githubData.followers}`,
          url: githubData.html_url
        });
      } else {
        results.push({
          platform: 'GitHub',
          data: '✗ Profile not found'
        });
      }
    } catch (e) {
      results.push({
        platform: 'GitHub',
        data: '✗ API Error'
      });
    }
    
    const platforms = [
      { name: 'Twitter/X', url: `https://twitter.com/${searchQuery}` },
      { name: 'Instagram', url: `https://instagram.com/${searchQuery}` },
      { name: 'LinkedIn', url: `https://linkedin.com/in/${searchQuery}` }
    ];
    
    platforms.forEach(platform => {
      results.push({
        platform: platform.name,
        data: '🔗 Click to verify profile manually',
        url: platform.url
      });
    });
    
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Search Results</title><style>${CSS}</style></head><body>
      <nav class="navbar">
        <div class="nav-container">
          <a href="/" class="logo">InfoHub OSINT</a>
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/search">Search</a>
          </div>
        </div>
      </nav>
      
      <div class="container">
        <div class="hero">
          <div>Search Results: ${searchQuery}</div>
          <div>OSINT Intelligence Report</div>
        </div>
        
        ${results.map(result => `
          <div class="result">
            <div class="result-title">[${result.platform}]</div>
            <div class="result-data">${result.data}</div>
            ${result.url ? `<a href="${result.url}" class="result-link" target="_blank">🔗 OPEN LINK</a>` : ''}
          </div>
        `).join('')}
        
        <div class="card">
          <a href="/" class="btn">[NEW SEARCH]</a>
        </div>
      </div>
    </body></html>`);
    return;
  }
  
  res.status(404).send('Not Found');
};