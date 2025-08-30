#!/bin/bash

# CI/CD Pipeline Setup Script
# This script helps set up the GitHub → Firebase → Vercel pipeline

echo "🚀 Setting up CI/CD Pipeline for GitHub → Firebase → Vercel"
echo "=================================================="

# Check if required tools are installed
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ git is not installed. Please install git first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Install Firebase CLI
echo "🔥 Installing Firebase CLI..."
npm install -g firebase-tools

# Install Vercel CLI
echo "⚡ Installing Vercel CLI..."
npm install -g vercel

echo ""
echo "🔧 Next Steps:"
echo "=============="
echo ""
echo "1. 🔐 Generate Firebase Token:"
echo "   firebase login:ci"
echo ""
echo "2. 🎯 Get Vercel Configuration:"
echo "   vercel login"
echo "   vercel projects ls"
echo "   vercel teams ls"
echo ""
echo "3. 🔑 Configure GitHub Secrets:"
echo "   Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "   Add the following secrets:"
echo "   - FIREBASE_TOKEN"
echo "   - VERCEL_TOKEN"
echo "   - VERCEL_ORG_ID"
echo "   - VERCEL_PROJECT_ID"
echo "   - REACT_APP_FIREBASE_API_KEY"
echo "   - REACT_APP_FIREBASE_AUTH_DOMAIN"
echo "   - REACT_APP_FIREBASE_PROJECT_ID"
echo "   - REACT_APP_FIREBASE_STORAGE_BUCKET"
echo "   - REACT_APP_FIREBASE_MESSAGING_SENDER_ID"
echo "   - REACT_APP_FIREBASE_APP_ID"
echo ""
echo "4. 🌐 Configure Firebase Auth Domains:"
echo "   Add 'docsort.vercel.app' to Firebase Auth authorized domains"
echo ""
echo "5. 🚀 Test the Pipeline:"
echo "   git add ."
echo "   git commit -m 'Add CI/CD pipeline'"
echo "   git push origin main"
echo ""
echo "📖 For detailed instructions, see: scripts/setup-ci-cd.md"
echo ""
echo "🎉 Setup script completed!"
