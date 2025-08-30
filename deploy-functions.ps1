# AppVault Firebase Functions Deployment Script (PowerShell)
# This script deploys the Firebase Functions to production

param(
    [switch]$DryRun
)

Write-Host "🚀 Starting Firebase Functions deployment..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the appvault directory." -ForegroundColor Red
    exit 1
}

# Check if Firebase CLI is installed
try {
    $null = Get-Command firebase -ErrorAction Stop
} catch {
    Write-Host "❌ Error: Firebase CLI not found. Please install it with: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Check if user is logged in
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "❌ Error: Not logged into Firebase. Please run: firebase login" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "🔨 Building functions..." -ForegroundColor Yellow
npm run build

Write-Host "🧪 Running linting..." -ForegroundColor Yellow
npm run lint

if ($DryRun) {
    Write-Host "🔍 Dry run mode - skipping deployment" -ForegroundColor Cyan
    Write-Host "✅ Dry run completed successfully!" -ForegroundColor Green
} else {
    Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Yellow
    Set-Location ../docvault
    firebase deploy --only functions:docvault
    
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Functions URL: https://us-central1-gpt1-77ce0.cloudfunctions.net" -ForegroundColor Cyan
    Write-Host "📊 View logs: firebase functions:log" -ForegroundColor Cyan
}
