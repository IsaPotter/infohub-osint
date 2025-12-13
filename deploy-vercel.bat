@echo off
echo ========================================
echo    InfoHub OSINT - Deploy Vercel
echo ========================================
echo.

echo Passo 1: Abra seu navegador e va para:
echo https://vercel.com/new
echo.
echo Passo 2: Clique em "Import Git Repository"
echo.
echo Passo 3: Conecte sua conta GitHub
echo.
echo Passo 4: Selecione o repositorio "IbHub"
echo.
echo Passo 5: Configure:
echo - Framework Preset: Other
echo - Root Directory: ./
echo - Build Command: npm install
echo - Output Directory: (deixe vazio)
echo - Install Command: npm install
echo.
echo Passo 6: Clique em "Deploy"
echo.
echo Em 30 segundos seu InfoHub OSINT estara online!
echo URL sera algo como: https://ib-hub-xyz.vercel.app
echo.
echo Alternativa rapida:
echo 1. Execute: vercel login
echo 2. Execute: vercel --prod
echo.
pause

echo Tentando deploy automatico...
vercel login
if %errorlevel% equ 0 (
    echo Login realizado com sucesso!
    vercel --prod
) else (
    echo Use o deploy manual acima.
)