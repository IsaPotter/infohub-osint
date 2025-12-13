# 🚀 InfoHub OSINT - Guia de Deploy

## Opções de Hospedagem

### 1. 🆓 GRATUITO - Vercel (Recomendado)

**Passos:**
1. Crie conta no [Vercel](https://vercel.com)
2. Conecte seu GitHub
3. Faça push do código para GitHub
4. Importe projeto no Vercel
5. Deploy automático!

**Comandos:**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy direto
vercel

# Deploy para produção
vercel --prod
```

**URL final:** `https://seu-projeto.vercel.app`

---

### 2. 🆓 GRATUITO - Railway

**Passos:**
1. Crie conta no [Railway](https://railway.app)
2. Conecte GitHub
3. Deploy automático
4. Configure domínio

**URL final:** `https://seu-projeto.up.railway.app`

---

### 3. 🆓 GRATUITO - Render

**Passos:**
1. Crie conta no [Render](https://render.com)
2. Conecte repositório
3. Configure:
   - Build Command: `npm install`
   - Start Command: `node packages/frontend/server.js`

**URL final:** `https://seu-projeto.onrender.com`

---

### 4. 💰 PAGO - DigitalOcean App Platform

**Passos:**
1. Crie conta no [DigitalOcean](https://digitalocean.com)
2. Use App Platform
3. Deploy com Docker

**Custo:** ~$5/mês

---

### 5. 💰 PAGO - AWS/Google Cloud/Azure

**Para deploy profissional com alta disponibilidade**

---

## Deploy com Docker

### Build da imagem:
```bash
docker build -t infohub-osint .
```

### Executar localmente:
```bash
docker run -p 3002:3002 infohub-osint
```

### Deploy no Docker Hub:
```bash
# Tag da imagem
docker tag infohub-osint seu-usuario/infohub-osint

# Push para Docker Hub
docker push seu-usuario/infohub-osint
```

---

## Configuração de Domínio Personalizado

### 1. Comprar Domínio
- [Namecheap](https://namecheap.com)
- [GoDaddy](https://godaddy.com)
- [Registro.br](https://registro.br) (para .com.br)

### 2. Configurar DNS
```
Tipo: CNAME
Nome: @
Valor: seu-projeto.vercel.app
```

### 3. Configurar SSL
- Automático no Vercel/Railway/Render
- Let's Encrypt gratuito

---

## Variáveis de Ambiente para Produção

Crie arquivo `.env.production`:
```env
NODE_ENV=production
PORT=3002
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

---

## Monitoramento e Analytics

### 1. Google Analytics
Adicione no HTML:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

### 2. Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com) (gratuito)
- [Pingdom](https://pingdom.com)

---

## SEO e Performance

### 1. Meta Tags
```html
<meta name="description" content="InfoHub OSINT - Professional Intelligence Gathering Platform">
<meta name="keywords" content="osint, intelligence, cybersecurity, reconnaissance">
<meta property="og:title" content="InfoHub OSINT">
<meta property="og:description" content="Advanced OSINT Platform">
<meta property="og:image" content="https://seu-site.com/logo.png">
```

### 2. Sitemap
Crie `sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://seu-site.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## Segurança em Produção

### 1. Rate Limiting
```javascript
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
```

### 2. HTTPS Obrigatório
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 3. Security Headers
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

---

## Backup e Manutenção

### 1. Backup Automático
- Configure backup do código no GitHub
- Backup de logs e dados

### 2. Atualizações
```bash
# Atualizar dependências
npm update

# Verificar vulnerabilidades
npm audit

# Corrigir vulnerabilidades
npm audit fix
```

---

## Monetização (Opcional)

### 1. Google AdSense
- Adicione anúncios responsivos
- Respeite políticas de conteúdo

### 2. API Premium
- Ofereça API paga para uso comercial
- Limite de requests para usuários gratuitos

### 3. Doações
- PayPal, PIX, Bitcoin
- Patreon para suporte mensal

---

## Comandos Rápidos

### Deploy no Vercel:
```bash
npx vercel
```

### Deploy no Railway:
```bash
npx @railway/cli login
npx @railway/cli deploy
```

### Deploy no Render:
1. Conecte GitHub no painel
2. Configure build/start commands
3. Deploy automático

---

## Troubleshooting

### Erro de Porta:
```javascript
const PORT = process.env.PORT || 3002;
```

### Erro de CORS:
```javascript
app.use(cors({
  origin: ['https://seu-dominio.com'],
  credentials: true
}));
```

### Erro de Memory:
```json
{
  "scripts": {
    "start": "node --max-old-space-size=512 packages/frontend/server.js"
  }
}
```

---

## 🎯 Recomendação Final

**Para começar:** Use Vercel (gratuito, fácil, rápido)
**Para crescer:** Migre para DigitalOcean ou AWS
**Para profissional:** Use Docker + Kubernetes

**URL de exemplo:** `https://infohub-osint.vercel.app`