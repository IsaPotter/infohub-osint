# 🕵️ InfoHub OSINT Professional

<div align="center">

![InfoHub OSINT](https://img.shields.io/badge/InfoHub-OSINT-00ff88?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/node.js-16+-brightgreen?style=for-the-badge)

**Advanced Open Source Intelligence Gathering Platform**

[🚀 Live Demo](https://infohub-osint.vercel.app) • [📖 Documentation](./DEPLOY-GUIDE.md) • [🐛 Report Bug](../../issues)

</div>

---

## 🌟 Features

### 🔍 **Intelligence Gathering**
- **Social Media Reconnaissance** - 20+ platforms including GitHub, Twitter, Instagram, LinkedIn
- **Network Analysis** - DNS lookup, subdomain enumeration, port scanning
- **Email Intelligence** - Domain validation, breach detection, reputation check
- **Phone Analysis** - Country detection, carrier lookup, caller ID search
- **File Intelligence** - Document search across archives and repositories
- **Health Intelligence** - Medical research and public health records

### 🛡️ **Security & Performance**
- **Rate Limiting** - Advanced protection against abuse
- **Input Validation** - Comprehensive sanitization and validation
- **Security Headers** - CSP, XSS protection, HSTS
- **Real-time Results** - Live API calls and data verification
- **Professional UI** - Modern, responsive interface

### 🔧 **Technical Features**
- **REST API** - Complete API for automation
- **Real DNS Lookups** - Actual network reconnaissance
- **GitHub Integration** - Real-time profile verification
- **Breach Databases** - Integration with major breach check services
- **Docker Support** - Containerized deployment
- **Multi-platform Deploy** - Vercel, Railway, Render, Docker

---

## 🚀 Quick Start

### 1. **Clone Repository**
```bash
git clone https://github.com/yourusername/infohub-osint.git
cd infohub-osint
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Start Application**
```bash
npm start
```

### 4. **Access Platform**
```
http://localhost:3002
```

---

## 🌐 Deploy to Web

### **Option 1: Vercel (Recommended)**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/infohub-osint)

### **Option 2: Railway**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/infohub-osint)

### **Option 3: Render**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### **Option 4: Automated Script**
```powershell
# Windows
.\deploy.ps1

# Linux/Mac
chmod +x deploy.sh && ./deploy.sh
```

---

## 📊 Usage Examples

### **Social Media Search**
```
Target: john_doe
Results: GitHub ✓, Twitter ✓, LinkedIn ✓, Instagram ⚠️
```

### **Network Analysis**
```
Target: example.com
Results: DNS Records, Subdomains, Open Ports, SSL Info
```

### **Email Intelligence**
```
Target: user@example.com
Results: Domain Valid ✓, MX Records ✓, Breach Check ⚠️
```

### **Phone Lookup**
```
Target: +1234567890
Results: Country: USA, Carrier: Verizon, Type: Mobile
```

---

## 🛠️ API Documentation

### **Comprehensive Search**
```javascript
POST /search
{
  "query": "target",
  "type": "auto" // auto, social, network, email, phone
}
```

### **Response Format**
```javascript
{
  "platform": "GitHub",
  "status": "success", // success, warning, error
  "data": "Profile found: John Doe | Repos: 25 | Followers: 150",
  "url": "https://github.com/johndoe"
}
```

---

## 🔒 Security & Ethics

### **Ethical Use Only**
- ✅ Authorized penetration testing
- ✅ Security research
- ✅ Academic purposes
- ✅ Personal investigation (legal)
- ❌ Unauthorized surveillance
- ❌ Stalking or harassment
- ❌ Illegal activities

### **Security Features**
- Rate limiting (100 req/15min)
- Input sanitization
- XSS protection
- CSRF protection
- Secure headers

---

## 🏗️ Architecture

```
InfoHub OSINT/
├── packages/
│   ├── frontend/          # Web interface
│   ├── api/              # REST API
│   └── shared/           # Shared modules
├── docker/               # Docker configuration
├── docs/                 # Documentation
└── deploy/               # Deployment scripts
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

---

## 📋 Requirements

- **Node.js** 16+ 
- **npm** 7+
- **Git**
- **Docker** (optional)

---

## 🌍 Supported Platforms

### **Social Media**
GitHub • Twitter/X • Instagram • LinkedIn • Facebook • YouTube • TikTok • Reddit

### **Search Engines**
Google Dorks • Bing • DuckDuckGo • Archive.org • Pastebin

### **Databases**
Have I Been Pwned • DeHashed • LeakCheck • TrueCaller • WhitePages

### **Network Tools**
DNS Lookup • WHOIS • Subdomain Enum • Port Scan • SSL Analysis

---

## 📈 Roadmap

- [ ] **Dark Web Monitoring**
- [ ] **Cryptocurrency Analysis**
- [ ] **Image Recognition**
- [ ] **AI-Powered Correlation**
- [ ] **Mobile App**
- [ ] **Enterprise Features**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

This tool is for educational and authorized testing purposes only. Users are responsible for complying with applicable laws and regulations. The developers assume no liability for misuse.

---

## 🙏 Acknowledgments

- **OSINT Community** for methodologies and techniques
- **Open Source Projects** for libraries and tools
- **Security Researchers** for best practices
- **Contributors** for improvements and feedback

---

<div align="center">

**Made with ❤️ for the OSINT Community**

[⭐ Star this repo](../../stargazers) • [🐛 Report issues](../../issues) • [💬 Discussions](../../discussions)

</div>