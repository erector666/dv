# Hugging Face CLI Setup Script
# This script sets up the Hugging Face CLI environment

Write-Host "🤗 Hugging Face CLI Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Add Python Scripts to PATH if not already there
$pythonScriptsPath = "C:\Users\kango\AppData\Local\Programs\Python\Python312\Scripts"
if ($env:PATH -notlike "*$pythonScriptsPath*") {
    $env:PATH += ";$pythonScriptsPath"
    Write-Host "✅ Added Python Scripts to PATH" -ForegroundColor Green
} else {
    Write-Host "✅ Python Scripts already in PATH" -ForegroundColor Green
}

# Check if Hugging Face CLI is available
try {
    $version = hf version
    Write-Host "✅ Hugging Face CLI is installed: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Hugging Face CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Check login status
try {
    $whoami = hf whoami
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not logged in. Run 'hf login' to authenticate." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Available Commands:" -ForegroundColor Cyan
Write-Host "  hf login          - Log in to Hugging Face" -ForegroundColor White
Write-Host "  hf whoami         - Check current user" -ForegroundColor White
Write-Host "  hf download       - Download models/datasets" -ForegroundColor White
Write-Host "  hf upload         - Upload files to Hub" -ForegroundColor White
Write-Host "  hf repo create    - Create a new repository" -ForegroundColor White
Write-Host "  hf env            - Show environment info" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: https://huggingface.co/docs/huggingface_hub" -ForegroundColor Blue