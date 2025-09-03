# CI/CD Pipeline Setup Guide

## Overview

This guide will help you set up the complete CI/CD pipeline for GitHub → Firebase → Vercel deployment.

## Prerequisites

- GitHub repository with your code
- Firebase project (use your own project ID)
- Vercel account and project
- Firebase CLI installed locally

## Step 1: Generate Firebase Token

### 1.1 Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 1.2 Login to Firebase

```bash
firebase login
```

### 1.3 Generate CI Token

```bash
firebase login:ci
```

This will open a browser window. After authentication, copy the token.

## Step 2: Get Vercel Configuration

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
```

### 2.3 Get Project Information

```bash
vercel projects ls
```

Note down your project ID.

### 2.4 Get Organization ID

```bash
vercel teams ls
```

Note down your organization ID.

### 2.5 Generate Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Copy the token

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

### Firebase Secrets

- `FIREBASE_TOKEN`: The token from Step 1.3

### Vercel Secrets

- `VERCEL_TOKEN`: The token from Step 2.5
- `VERCEL_ORG_ID`: Your organization ID from Step 2.4
- `VERCEL_PROJECT_ID`: Your project ID from Step 2.3

### Firebase Environment Variables

- `REACT_APP_FIREBASE_API_KEY`: your_firebase_api_key
- `REACT_APP_FIREBASE_AUTH_DOMAIN`: your_project.firebaseapp.com
- `REACT_APP_FIREBASE_PROJECT_ID`: your_project_id
- `REACT_APP_FIREBASE_STORAGE_BUCKET`: your_project.appspot.com
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`: your_messaging_sender_id
- `REACT_APP_FIREBASE_APP_ID`: your_app_id
- `REACT_APP_FUNCTIONS_BASE_URL`: https://us-central1-your_project_id.cloudfunctions.net

### Functions Environment Variables

- `GOOGLE_TRANSLATE_API_KEY`: your_translate_api_key

## Step 4: Configure Firebase Auth Domains

1. Go to Firebase Console → Authentication → Settings
2. Add `docsort.vercel.app` to Authorized Domains
3. Add `localhost` for local development

## Step 5: Configure Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the Firebase environment variables listed above

## Step 6: Test the Pipeline

### 6.1 Push to Main Branch

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

### 6.2 Check GitHub Actions

Go to your GitHub repository → Actions tab to monitor the pipeline.

## Step 7: Branch Strategy

### Development Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit
3. Push to feature branch
4. Create Pull Request to `develop` or `main`
5. CI/CD will run tests and create preview deployment
6. Review and merge

### Production Deployment

- Push to `main` branch triggers production deployment
- Automatic deployment to Firebase (backend) and Vercel (frontend)

## Troubleshooting

### Common Issues

1. **Firebase Token Expired**
   - Regenerate token: `firebase login:ci`

2. **Vercel Deployment Fails**
   - Check Vercel token and project ID
   - Verify environment variables in Vercel dashboard

3. **Build Fails**
   - Check TypeScript errors
   - Verify all dependencies are installed

4. **CORS Errors**
   - Ensure Firebase Auth domains include Vercel domain
   - Check Firebase Functions CORS configuration

### Debug Commands

```bash
# Test Firebase deployment locally
firebase deploy --only functions --dry-run

# Test Vercel deployment locally
vercel --prod --dry-run

# Check build locally
npm run build
```

## Pipeline Flow

```
GitHub Push → Code Quality → Firebase Backend → Vercel Frontend → Verification
     ↓              ↓              ↓                ↓              ↓
   Trigger      ESLint/TS      Functions        Build/Deploy   Health Check
```

## Monitoring

- **GitHub Actions**: Monitor pipeline status
- **Firebase Console**: Check Functions deployment
- **Vercel Dashboard**: Monitor frontend deployment
- **Application**: https://docsort.vercel.app
