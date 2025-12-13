@echo off
echo ========================================
echo    InfoHub OSINT - Deploy Automatico
echo ========================================
echo.

echo [1/4] Fazendo login no Vercel...
vercel login

echo.
echo [2/4] Configurando projeto...
vercel

echo.
echo [3/4] Fazendo deploy de producao...
vercel --prod

echo.
echo [4/4] Deploy concluido!
echo Seu InfoHub OSINT esta online!
echo.
pause