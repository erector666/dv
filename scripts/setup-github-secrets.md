# GitHub Secrets Setup Guide

## Required GitHub Secrets

To fix the CI/CD pipeline, you need to add these secrets to your GitHub repository:

### 1. Go to GitHub Repository Settings
- Navigate to: `https://github.com/erector666/dv/settings/secrets/actions`
- Click "New repository secret"

### 2. Add These Secrets:

#### Vercel Secrets
- **Name**: `VERCEL_TOKEN`
- **Value**: Get from https://vercel.com/account/tokens (create new token)

#### Firebase Secrets  
- **Name**: `FIREBASE_TOKEN`
- **Value**: Run `firebase login:ci` locally and copy the token

#### Firebase Environment Variables
- **Name**: `REACT_APP_FIREBASE_API_KEY`
- **Value**: Your Firebase API key

- **Name**: `REACT_APP_FIREBASE_AUTH_DOMAIN`
- **Value**: `gpt1-77ce0.firebaseapp.com`

- **Name**: `REACT_APP_FIREBASE_PROJECT_ID`
- **Value**: `gpt1-77ce0`

- **Name**: `REACT_APP_FIREBASE_STORAGE_BUCKET`
- **Value**: `gpt1-77ce0.appspot.com`

- **Name**: `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: Your Firebase messaging sender ID

- **Name**: `REACT_APP_FIREBASE_APP_ID`
- **Value**: Your Firebase app ID

### 3. Get Firebase Token
Run this command locally:
```bash
firebase login:ci
```

### 4. Get Vercel Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Give it a name like "GitHub Actions"
4. Copy the token

## Current Configuration
- **Vercel Org ID**: `nikolas-projects-8cb9fb29` (already configured)
- **Vercel Project ID**: `dv` (already configured)
- **Firebase Project ID**: `gpt1-77ce0` (already configured)
- **Production URL**: `https://dv-beta-peach.vercel.app`

## Test the Pipeline
After adding the secrets, push to main branch to trigger the CI/CD pipeline:
```bash
git add .
git commit -m "Fix CI/CD pipeline configuration"
git push origin main
```

## Monitor the Pipeline
- Go to: `https://github.com/erector666/dv/actions`
- Watch the "CI/CD Pipeline - GitHub → Firebase → Vercel" workflow
