# InfoHub OSINT Professional Platform

Uma plataforma profissional de inteligência OSINT (Open Source Intelligence) para reconhecimento, análise de segurança e investigação digital.

## 🚀 Funcionalidades Profissionais

### Reconhecimento Avançado
- **Enumeração de Subdomínios**: Descoberta automática de subdomínios
- **Port Scanning**: Detecção de serviços e portas abertas
- **Análise DNS**: Registros A, MX, TXT, NS completos
- **WHOIS Lookup**: Informações de registro de domínio
- **SSL/TLS Analysis**: Análise de certificados

### Inteligência Social
- **Multi-Platform Search**: GitHub, Twitter, Instagram, LinkedIn, Facebook, YouTube, TikTok, Reddit
- **Profile Analysis**: Extração automática de dados de perfil
- **Cross-Reference**: Correlação entre plataformas
- **Behavioral Analysis**: Padrões de atividade

### Análise de Email
- **Validation**: Verificação de formato e domínio
- **Breach Detection**: Verificação em bases de dados vazados
- **Domain Intelligence**: Análise do provedor de email
- **SMTP Analysis**: Verificação de servidor de email

### Análise de Telefone
- **Number Validation**: Verificação de formato
- **Carrier Detection**: Identificação da operadora
- **Geolocation**: Localização aproximada
- **Type Detection**: Móvel vs. fixo

### Recursos Profissionais
- **API REST Completa**: Endpoints para todas as funcionalidades
- **Rate Limiting**: Proteção contra abuso
- **Batch Processing**: Processamento em lote
- **Report Generation**: Relatórios detalhados
- **Security Headers**: Proteções de segurança
- **Health Monitoring**: Monitoramento de saúde dos serviços

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Docker Desktop
- Git
- PowerShell/Terminal

### Instalação Rápida

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd IbHub
```

2. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

3. **Inicie a plataforma profissional**:
```bash
docker-compose -f docker-compose.professional.yml up -d --build
```

4. **Acesse a plataforma**:
- Dashboard: http://localhost:3000/dashboard.html
- API: http://localhost:3001/api/health
- Frontend: http://localhost:3002

### Instalação Manual

1. **Instale as dependências**:
```bash
npm install
```

2. **Inicie os serviços separadamente**:
```bash
# Terminal 1 - API
npm run start:api

# Terminal 2 - Frontend
npm start

# Terminal 3 - Dashboard
npm run start:dashboard
```

## 📊 Dashboard Profissional

O dashboard oferece uma interface moderna e intuitiva com:

- **Scan Comprehensive**: Análise completa do alvo
- **Estatísticas em Tempo Real**: Métricas de uso
- **Histórico de Atividades**: Log de scans realizados
- **Ferramentas Rápidas**: Acesso direto a funcionalidades
- **Visualização de Resultados**: Apresentação clara dos dados

## 🔌 API Endpoints

### Scan Endpoints
```
POST /api/scan/comprehensive  # Scan completo
POST /api/scan/social        # Redes sociais
POST /api/scan/network       # Reconhecimento de rede
POST /api/scan/email         # Análise de email
POST /api/scan/phone         # Análise de telefone
POST /api/scan/subdomains    # Enumeração de subdomínios
POST /api/scan/ports         # Port scanning
POST /api/scan/batch         # Processamento em lote
```

### Utility Endpoints
```
GET  /api/health             # Status da API
```

### Exemplo de Uso da API

```javascript
// Scan comprehensive
const response = await fetch('/api/scan/comprehensive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        target: 'example.com',
        type: 'comprehensive'
    })
});

const result = await response.json();
console.log(result.data);
```

## 🔒 Segurança

### Medidas Implementadas
- **Rate Limiting**: Proteção contra spam e abuso
- **Input Validation**: Sanitização de entradas
- **Security Headers**: Helmet.js para proteção
- **CORS**: Configuração adequada de CORS
- **Error Handling**: Tratamento seguro de erros

### Configurações de Segurança
```javascript
// Rate limits configurados
- API Geral: 100 requests/15min
- Scans: 5 requests/min
- Batch: Máximo 10 alvos por request
```

## 📈 Monitoramento

### Health Checks
```bash
# Verificar status da API
curl http://localhost:3001/api/health

# Verificar containers
docker ps

# Logs em tempo real
docker-compose -f docker-compose.professional.yml logs -f
```

### Métricas Disponíveis
- Total de scans realizados
- Alvos únicos analisados
- Findings descobertos
- Tempo de execução médio

## 🚀 Uso Profissional

### Casos de Uso
1. **Pentesting**: Reconhecimento inicial de alvos
2. **Threat Intelligence**: Coleta de informações sobre ameaças
3. **Digital Forensics**: Investigação digital
4. **Brand Monitoring**: Monitoramento de marca
5. **Compliance**: Verificação de exposição de dados

### Melhores Práticas
- Use rate limiting apropriado
- Mantenha logs de auditoria
- Implemente autenticação em produção
- Configure SSL/TLS
- Monitore uso de recursos

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```env
# Database
POSTGRES_PASSWORD=SecurePass123!
REDIS_PASSWORD=RedisPass123!

# API Configuration
API_PORT=3001
FRONTEND_PORT=3002
DASHBOARD_PORT=3000

# Security
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Nginx Configuration
Para produção, configure SSL e proxy reverso:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://infohub-osint-pro:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://infohub-osint-pro:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📝 Comandos Úteis

```bash
# Build da imagem profissional
npm run build

# Executar com Docker
npm run docker:run

# Desenvolvimento com hot reload
npm run dev

# Parar todos os serviços
docker-compose -f docker-compose.professional.yml down

# Limpar volumes (CUIDADO: remove dados)
docker-compose -f docker-compose.professional.yml down -v

# Backup do banco
docker exec infohub-postgres-pro pg_dump -U osint_user infohub_osint > backup.sql

# Restaurar backup
docker exec -i infohub-postgres-pro psql -U osint_user infohub_osint < backup.sql
```

## 🤝 Contribuição

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## ⚖️ Uso Ético e Legal

**IMPORTANTE**: Esta ferramenta deve ser usada apenas para:
- Testes em sistemas próprios
- Pentesting autorizado
- Pesquisa acadêmica
- Investigações legais

**NÃO use para**:
- Atividades ilegais
- Invasão não autorizada
- Stalking ou assédio
- Violação de privacidade

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação da API
- Verifique os logs de erro

---

**InfoHub OSINT Professional Platform** - Inteligência profissional ao seu alcance.