# InfoHub OSINT API Documentation v3.0

## Overview
The InfoHub OSINT API provides programmatic access to our comprehensive intelligence gathering platform. Perform OSINT searches across 25+ sources including social media, dark web, breach databases, and cryptocurrency analysis.

## Base URL
```
https://infohub-osint.vercel.app/api
```

## Authentication
All API requests require an API key in the header:
```http
X-API-Key: ib_your_api_key_here
```

### Generate API Key
```http
POST /api/generate-key
Content-Type: application/json

{
  "userId": "your_user_id"
}
```

## Rate Limits
- **Free Tier**: 10 requests/hour
- **Premium**: 1000 requests/month  
- **Enterprise**: Unlimited

## Endpoints

### 1. Search Intelligence
Perform comprehensive OSINT searches across multiple sources.

```http
POST /api/search
Content-Type: application/json
X-API-Key: ib_your_api_key

{
  "query": "target_username",
  "type": "auto"
}
```

**Parameters:**
- `query` (string, required): Search target (username, email, phone, domain, crypto address)
- `type` (string, optional): Search type - `auto`, `social`, `email`, `phone`, `domain`, `crypto`

**Response:**
```json
{
  "results": [
    {
      "platform": "GitHub",
      "status": "success",
      "data": "Name: John Doe | Repos: 25 | Followers: 150 | Created: 2020",
      "url": "https://github.com/johndoe",
      "metadata": {
        "type": "github",
        "verified": true,
        "activity": "high"
      }
    }
  ],
  "query": "johndoe",
  "type": "social",
  "timestamp": "2024-01-01T00:00:00Z",
  "sources": 15
}
```

### 2. Platform Statistics
Get real-time platform statistics.

```http
GET /api/stats
```

**Response:**
```json
{
  "users": 500,
  "searches": 10000,
  "apiKeys": 150,
  "uptime": 2592000
}
```

### 3. Set Up Monitoring
Create automated monitoring for targets.

```http
POST /api/monitor
Content-Type: application/json
X-API-Key: ib_your_api_key

{
  "query": "target_username",
  "interval": 3600000
}
```

**Parameters:**
- `query` (string, required): Target to monitor
- `interval` (number, optional): Check interval in milliseconds (default: 1 hour)

**Response:**
```json
{
  "monitorId": "abc123def456",
  "query": "target_username",
  "interval": 3600000,
  "status": "active",
  "nextCheck": "2024-01-01T01:00:00Z"
}
```

### 4. Export Search History
Export your search history in various formats.

```http
GET /api/export/{format}
X-API-Key: ib_your_api_key
```

**Formats:**
- `json`: JSON format
- `csv`: CSV format

**Response (JSON):**
```json
{
  "searches": [
    {
      "id": "search123",
      "query": "johndoe",
      "type": "social",
      "results": 15,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "exported": "2024-01-01T12:00:00Z"
}
```

## Search Types

### Social Media Search (`type: "social"`)
Searches across 15+ social media platforms:
- GitHub, Twitter, Instagram, LinkedIn
- Reddit, YouTube, TikTok, Twitch
- Pinterest, Snapchat, Discord, Telegram
- Facebook, VKontakte, Tumblr

**Example:**
```json
{
  "query": "johndoe",
  "type": "social"
}
```

### Email Intelligence (`type: "email"`)
Comprehensive email analysis:
- Domain validation and MX records
- Breach database checks
- Email type classification
- Variation generation

**Example:**
```json
{
  "query": "john@example.com",
  "type": "email"
}
```

### Phone Analysis (`type: "phone"`)
Phone number intelligence:
- Country detection
- Carrier identification
- Type classification (mobile/landline)
- Spam database checks

**Example:**
```json
{
  "query": "+5577998731012",
  "type": "phone"
}
```

### Domain Analysis (`type: "domain"`)
Domain intelligence gathering:
- DNS record analysis
- Subdomain enumeration
- SSL certificate information
- WHOIS data

**Example:**
```json
{
  "query": "example.com",
  "type": "domain"
}
```

### Cryptocurrency Tracking (`type: "crypto"`)
Blockchain analysis:
- Address validation
- Balance checking
- Transaction history
- Risk assessment

**Example:**
```json
{
  "query": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "type": "crypto"
}
```

## Response Status Codes

| Status | Description |
|--------|-------------|
| `success` | Information found |
| `warning` | Potentially concerning data found |
| `error` | No information found or error occurred |
| `info` | Additional context information |

## Error Handling

### Common Errors
```json
{
  "error": "Invalid API key",
  "code": 401
}
```

```json
{
  "error": "Rate limit exceeded",
  "code": 429
}
```

```json
{
  "error": "Invalid query format",
  "code": 400
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const InfoHubAPI = require('infohub-osint-sdk');

const client = new InfoHubAPI('ib_your_api_key');

async function searchTarget(query) {
  try {
    const results = await client.search({
      query: query,
      type: 'auto'
    });
    
    console.log(`Found ${results.sources} sources for ${query}`);
    results.results.forEach(result => {
      console.log(`${result.platform}: ${result.data}`);
    });
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

searchTarget('johndoe');
```

### Python
```python
import requests

class InfoHubAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://infohub-osint.vercel.app/api'
    
    def search(self, query, search_type='auto'):
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {
            'query': query,
            'type': search_type
        }
        
        response = requests.post(
            f'{self.base_url}/search',
            json=data,
            headers=headers
        )
        
        return response.json()

# Usage
client = InfoHubAPI('ib_your_api_key')
results = client.search('johndoe', 'social')

for result in results['results']:
    print(f"{result['platform']}: {result['data']}")
```

### cURL
```bash
# Basic search
curl -X POST https://infohub-osint.vercel.app/api/search \
  -H "X-API-Key: ib_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"query": "johndoe", "type": "social"}'

# Get statistics
curl -X GET https://infohub-osint.vercel.app/api/stats

# Export history
curl -X GET https://infohub-osint.vercel.app/api/export/json \
  -H "X-API-Key: ib_your_api_key"
```

## Webhooks (Premium)
Set up webhooks to receive real-time notifications when monitored targets show activity.

```http
POST /api/webhooks
Content-Type: application/json
X-API-Key: ib_your_api_key

{
  "url": "https://your-server.com/webhook",
  "events": ["new_profile", "data_breach", "crypto_activity"],
  "secret": "your_webhook_secret"
}
```

## Best Practices

### 1. Rate Limiting
Respect rate limits to avoid being blocked:
```javascript
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function batchSearch(queries) {
  const results = [];
  
  for (const query of queries) {
    const result = await client.search(query);
    results.push(result);
    
    // Wait 6 seconds between requests (free tier)
    await delay(6000);
  }
  
  return results;
}
```

### 2. Error Handling
Always implement proper error handling:
```javascript
async function safeSearch(query) {
  try {
    return await client.search(query);
  } catch (error) {
    if (error.code === 429) {
      // Rate limited - wait and retry
      await delay(60000);
      return safeSearch(query);
    }
    throw error;
  }
}
```

### 3. Data Privacy
- Never store sensitive search results
- Implement proper access controls
- Follow local privacy regulations
- Use HTTPS for all requests

## Support

### Technical Support
- **Email**: api-support@infohub-osint.com
- **Discord**: [InfoHub Community](https://discord.gg/infohub)
- **Documentation**: [docs.infohub-osint.com](https://docs.infohub-osint.com)

### Premium Support
- **WhatsApp**: +55 (77) 99873-1012
- **Response Time**: < 4 hours
- **Available**: 9AM - 6PM GMT-3

## Changelog

### v3.0.0 (Current)
- Added cryptocurrency tracking
- Enhanced dark web monitoring
- Improved AI analysis
- New export formats
- Webhook support

### v2.1.0
- Added phone intelligence
- Enhanced email analysis
- Improved rate limiting

### v2.0.0
- Initial API release
- Basic OSINT searches
- User management

## Legal & Compliance

### Terms of Use
- API is for authorized testing and research only
- Users must comply with applicable laws
- No warranty provided - use at your own risk
- Subject to rate limits and fair use policy

### Privacy Policy
- We don't store search results permanently
- API keys are encrypted and secured
- Usage logs kept for 30 days maximum
- No personal data sold to third parties

---

**Made with ❤️ for the Global OSINT Community**

[🚀 Get Started](https://infohub-osint.vercel.app) • [💬 Support](https://wa.me/5577998731012) • [📚 Docs](https://docs.infohub-osint.com)