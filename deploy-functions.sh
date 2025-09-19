#!/bin/bash

# AppVault Firebase Functions Deployment Script
# This script deploys the Firebase Functions to production

set -e

echo "🚀 Starting Firebase Functions deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the appvault directory."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Not logged into Firebase. Please run: firebase login"
    exit 1
fi

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building functions..."
npm run build

echo "🧪 Running linting..."
npm run lint

echo "🚀 Deploying to Firebase..."
firebase deploy --only functions

echo "✅ Deployment completed successfully!"
echo "🌐 Functions Base URL: https://us-central1-$(firebase projects:list --json | jq -r '.result[] | select(.isActive==true).projectId') .cloudfunctions.net"
echo "📊 View logs: firebase functions:log"
