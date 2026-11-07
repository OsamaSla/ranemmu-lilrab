# Deployment Guide for GitHub Pages

## Issue: 404 Error

If you're seeing a 404 error when visiting `https://osamsla.github.io/ranemmu-lilrab/`, you need to enable GitHub Pages in your repository settings.

## Solution: Enable GitHub Pages (One-time setup)

### Step 1: Go to Repository Settings
1. Visit: https://github.com/OsamaSla/ranemmu-lilrab/settings/pages
2. OR go to your repo → Click **Settings** tab → Scroll down to find **Pages** section

### Step 2: Configure Source
In the Pages section, configure these settings:
- **Source**: Select "GitHub Actions"
- **Workflow**: `.github/workflows/deploy.yml` (if multiple workflows exist)

### Step 3: Wait for First Deploy
After setting this up, any new commit will trigger the deploy workflow automatically.

## What Happens Now

When the workflow runs successfully:
1. Files from `public/` folder are copied to `dist/`
2. They're uploaded as an artifact
3. GitHub Pages serves them at: https://osamsla.github.io/ranemmu-lilrab/

## Verify Deployment

After workflow completes (green checkmark):
1. Go to: https://github.com/OsamaSla/ranemmu-lilrab/settings/pages
2. Look for the deployed URL with last successful build timestamp

## Manual Test After Setup

Visit in browser:
- Base URL: `https://osamsla.github.io/ranemmu-lilrab/`
- Manifest: `https://osamsla.github.io/ranemmu-lilrab/manifest.json`
- Hello test: `https://osamsla.github.io/ranemmu-lilrab/hello.html`

## Alternative: Netlify (Recommended for PWA)

Since GitHub Pages can be finicky with PWAs, consider using Netlify which handles PWAs better:

### Quick Netlify Setup:
1. Visit https://www.netlify.com/
2. Sign in with GitHub
3. Import repository: `OsamaSla/ranemmu-lilrab`
4. Build command: (not needed, static files only)
5. Publish directory: `public`
6. Click "Deploy site"

Netlify provides:
- ✅ Faster builds
- ✅ Better PWA support
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Form handling
- ✅ Edge functions

## Current Status

✅ Workflow file is correct and deploys properly
✅ Public folder contains all PWA assets
⚠️ Need to enable GitHub Pages source in repository settings
