# Vercel Deployment Guide for DocVault

## Project Information

- **Project ID:** `prj_vyf1se0xS4YddmR3xxWzkXHmRMrP`
- **Repository:** https://github.com/erector666/dv.git
- **Framework:** React + TypeScript
- **Build Command:** `npm run build`
- **Output Directory:** `build`

## Environment Variables Required

### Firebase Configuration

```
REACT_APP_FIREBASE_API_KEY=AIzaSyAXBPuFnMNl6UDUrz75h-KFk92pMTtEuis
REACT_APP_FIREBASE_AUTH_DOMAIN=gpt1-77ce0.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gpt1-77ce0
REACT_APP_FIREBASE_STORAGE_BUCKET=gpt1-77ce0.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=887480132482
REACT_APP_FIREBASE_APP_ID=1:887480132482:web:7f8d166d0d36d4f058e59b
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XTCDJJGTD2
```

### Cloud Functions

```
REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-gpt1-77ce0.cloudfunctions.net
```

### Google Services

```
GOOGLE_TRANSLATE_API_KEY=AIzaSyB9-fp3cRPul2gSP9QKEOykzJoox9q9cFY
```

## Deployment Steps

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import Git repository: `https://github.com/erector666/dv.git`
4. Select the repository

### 2. Configure Project

- **Framework Preset:** Create React App
- **Root Directory:** `./` (root of repository)
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`

### 3. Set Environment Variables

In Vercel project settings, add each environment variable:

| Name                                     | Value                                               | Environment |
| ---------------------------------------- | --------------------------------------------------- | ----------- |
| `REACT_APP_FIREBASE_API_KEY`             | `AIzaSyAXBPuFnMNl6UDUrz75h-KFk92pMTtEuis`           | Production  |
| `REACT_APP_FIREBASE_AUTH_DOMAIN`         | `gpt1-77ce0.firebaseapp.com`                        | Production  |
| `REACT_APP_FIREBASE_PROJECT_ID`          | `gpt1-77ce0`                                        | Production  |
| `REACT_APP_FIREBASE_STORAGE_BUCKET`      | `gpt1-77ce0.firebasestorage.app`                    | Production  |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `887480132482`                                      | Production  |
| `REACT_APP_FIREBASE_APP_ID`              | `1:887480132482:web:7f8d166d0d36d4f058e59b`         | Production  |
| `REACT_APP_FIREBASE_MEASUREMENT_ID`      | `G-XTCDJJGTD2`                                      | Production  |
| `REACT_APP_FUNCTIONS_BASE_URL`           | `https://us-central1-gpt1-77ce0.cloudfunctions.net` | Production  |
| `GOOGLE_TRANSLATE_API_KEY`               | `AIzaSyB9-fp3cRPul2gSP9QKEOykzJoox9q9cFY`           | Production  |

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be available at the provided Vercel URL

## Post-Deployment Verification

### Check Firebase Functions

- Verify all 9 functions are accessible
- Test authentication flow
- Verify document upload/processing

### Check Environment Variables

- Ensure all variables are properly set
- Verify Firebase connection works
- Test Google Translate API

## Troubleshooting

### Common Issues

1. **Build Failures:** Check Node.js version compatibility
2. **Environment Variables:** Ensure all required variables are set
3. **Firebase Connection:** Verify API keys and project configuration
4. **CORS Issues:** Check Firebase security rules

### Support

- **Vercel Docs:** https://vercel.com/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Project Issues:** Check GitHub repository issues

## Current Status

- ✅ **Frontend:** React app ready for deployment
- ✅ **Backend:** Firebase Functions deployed and operational
- ✅ **Configuration:** Vercel config updated with project ID
- ✅ **Environment:** All variables documented and ready
- 🚀 **Ready for Production Deployment**
