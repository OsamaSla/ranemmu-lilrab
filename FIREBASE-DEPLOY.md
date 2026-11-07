# Firebase Deployment Guide - Quick Start

## Prerequisites
✅ Firebase account with existing project: `ranemmu-lilrab`
✅ Node.js installed
✅ Git repo contains all PWA files in `public/` folder

---

## ⚡ Fast Track (Copy & Paste Commands)

Open PowerShell in your project folder: `D:\PROJECTS\ranemmu-lilrab>`

```powershell
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login to Google account
firebase login

# 3. Initialize Firebase (select 'hosting' only)
firebase init hosting

# When prompted, select these options:
# [ ] Use project from other directory
# □ Firestore
# □ Functions
# ☑️ Hosting
# 
# Then answer:
# ? Which Firebase resource do you want to use? › Hosting
# ? Configure as a single-page app (SPA) for Angular [y/N]? n
# ? Firebase Project: ranemmu-lilrab (use your existing one)
# ? Public directory: public
# ? Set up automatic builds and deploys from GitHub? No
# ? File structure for static assets? Keep as-is
```

---

## 📦 Deploy Your App

After running `firebase init`:

```powershell
firebase deploy --only hosting
```

### What This Does:
- Reads all files from `public/` folder
- Uploads to Firebase Hosting CDN
- Activates at: https://ranemmu-lilrab.web.app

---

## 🎉 Verify Deployment

Open in browser:
- Main app: https://ranemmu-lilrab.web.app
- Test page: https://ranemmu-lilrab.web.app/hello.html
- Manifest: https://ranemmu-lilrab.web.app/manifest.json

All should load correctly now!

---

## 🌐 Custom Domain (Optional)

Want to use a custom domain like `tranim.com`?

1. In Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS setup instructions
5. Wait for SSL certificate generation (~20 min)

---

## 🔧 If You Already Ran Firebase Init Before

Just skip initialization and deploy directly:

```powershell
# Check if .firebaserc and firebase.json exist
dir .firebaserc
dir firebase.json

# If they exist, just deploy:
firebase deploy --only hosting
```

---

## 🛠️ Troubleshooting

### Error: "Cannot read properties of null"
→ Run `firebase login` again and authenticate

### Error: "Permission denied"  
→ Make sure you're logged in as project owner

### Files not showing up
→ Verify `public/` folder contains index.html:
   ```powershell
   dir public\index.html
   ```

---

## 📱 After Deployment - Install on Phone

1. Visit: https://ranemmu-lilrab.web.app
2. Tap ⋮ (three dots) → **"Add to Home screen"**
3. Should show your blue/gold icon
4. Icon appears on home screen!
5. **Test position highlighting feature** - scroll through hymns and see numbers light up!

---

## ✨ Next Steps After Deploy

1. Test on Android phone (Samsung S26)
2. Verify "Add to Home screen" works with custom icon
3. Scroll through hymn to test position highlighting
4. Share link with community!
