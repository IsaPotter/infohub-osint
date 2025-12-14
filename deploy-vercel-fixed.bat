@echo off
echo ========================================
echo InfoHub OSINT - Vercel Deployment
echo ========================================

echo Checking Node.js version...
node --version

echo.
echo Installing dependencies...
npm install

echo.
echo Building project...
npm run build 2>nul || echo No build script found, continuing...

echo.
echo Deploying to Vercel...
vercel --prod

echo.
echo ========================================
echo Deployment completed!
echo Check your Vercel dashboard for status
echo ========================================
pause