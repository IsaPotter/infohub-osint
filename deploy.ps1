# InfoHub OSINT - Script de Deploy Automático
Write-Host "🚀 InfoHub OSINT - Deploy Automático" -ForegroundColor Green

# Verificar se Git está instalado
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git não encontrado. Instale o Git primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se Node.js está instalado
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm install

Write-Host "🔧 Configurando Git..." -ForegroundColor Yellow
git init
git add .
git commit -m "Initial commit - InfoHub OSINT Professional"

# Menu de opções de deploy
Write-Host "`n🌐 Escolha a plataforma de deploy:" -ForegroundColor Cyan
Write-Host "1. Vercel (Gratuito - Recomendado)"
Write-Host "2. Railway (Gratuito)"
Write-Host "3. Render (Gratuito)"
Write-Host "4. GitHub Pages (Estático)"
Write-Host "5. Docker Build"

$choice = Read-Host "Digite sua escolha (1-5)"

switch ($choice) {
    "1" {
        Write-Host "🚀 Deploying para Vercel..." -ForegroundColor Green
        
        # Instalar Vercel CLI se não existir
        if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
            Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        # Deploy
        vercel --prod
        Write-Host "✅ Deploy concluído! Seu site está online." -ForegroundColor Green
    }
    
    "2" {
        Write-Host "🚂 Deploying para Railway..." -ForegroundColor Green
        
        # Instalar Railway CLI se não existir
        if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
            Write-Host "📦 Instalando Railway CLI..." -ForegroundColor Yellow
            npm install -g @railway/cli
        }
        
        # Login e deploy
        railway login
        railway deploy
        Write-Host "✅ Deploy concluído! Seu site está online." -ForegroundColor Green
    }
    
    "3" {
        Write-Host "🎨 Para Render:" -ForegroundColor Green
        Write-Host "1. Acesse https://render.com"
        Write-Host "2. Conecte seu GitHub"
        Write-Host "3. Importe este repositório"
        Write-Host "4. Configure:"
        Write-Host "   - Build Command: npm install"
        Write-Host "   - Start Command: node packages/frontend/server.js"
        Write-Host "5. Deploy automático!"
    }
    
    "4" {
        Write-Host "📄 Configurando para GitHub Pages..." -ForegroundColor Green
        
        # Criar branch gh-pages
        git checkout -b gh-pages
        git push origin gh-pages
        
        Write-Host "✅ Configure GitHub Pages nas configurações do repositório." -ForegroundColor Green
    }
    
    "5" {
        Write-Host "🐳 Building Docker image..." -ForegroundColor Green
        
        # Verificar se Docker está instalado
        if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "❌ Docker não encontrado. Instale o Docker primeiro." -ForegroundColor Red
            exit 1
        }
        
        # Build da imagem
        docker build -t infohub-osint .
        
        Write-Host "✅ Imagem Docker criada: infohub-osint" -ForegroundColor Green
        Write-Host "Para executar: docker run -p 3002:3002 infohub-osint" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Opção inválida." -ForegroundColor Red
    }
}

Write-Host "`n🎉 Deploy process completed!" -ForegroundColor Green
Write-Host "📖 Consulte DEPLOY-GUIDE.md para mais informações." -ForegroundColor Cyan