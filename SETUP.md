# Setup Guide

This guide will walk you through setting up Quick Capture Lists from scratch.

## Prerequisites

- A GitHub account ([sign up here](https://github.com/join))
- A Google/Firebase account ([sign up here](https://firebase.google.com/))
- Basic familiarity with Git (optional - you can use GitHub's web interface)

---

## Part 1: Firebase Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "quick-capture-lists")
4. **Optional**: Disable Google Analytics (not needed for this app)
5. Click **"Create project"**
6. Wait for project creation, then click **"Continue"**

### Step 2: Register Your Web App

1. In your Firebase project overview, click the **Web icon** (`</>`) to add a web app
2. Register app:
   - **App nickname**: "Quick Capture Lists" (or any name)
   - **Do NOT** check "Firebase Hosting" (we're using GitHub Pages)
3. Click **"Register app"**
4. **IMPORTANT**: Copy the Firebase configuration object shown
   - It will look like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
5. Click **"Continue to console"**

### Step 3: Enable Authentication

1. In the Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click on the **"Sign-in method"** tab
4. Enable **"Email/Password"**:
   - Click on "Email/Password"
   - Toggle **"Enable"** to ON
   - **DO NOT** enable "Email link (passwordless sign-in)"
   - Click **"Save"**

### Step 4: Create Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. **Security Rules**: Select **"Start in production mode"**
   - Don't worry, we'll add custom rules next
4. **Location**: Choose a location close to you (e.g., us-central, europe-west)
5. Click **"Enable"**
6. Wait for database creation

### Step 5: Configure Firestore Security Rules

1. Once in Firestore Database, click the **"Rules"** tab
2. **Replace** the existing rules with the following:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // User data is private - users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

### Step 6: Authorize Your Domain

1. In Firebase Console, go to **"Authentication"** → **"Settings"** → **"Authorized domains"**
2. Your domains should include:
   - `localhost` (for local testing)
   - `YOUR-USERNAME.github.io` (add this after you know your GitHub username)
3. Click **"Add domain"** if your GitHub Pages domain isn't listed

### Step 7: Copy Your Firebase Config

1. Go to **Project Settings** (gear icon next to "Project Overview")
2. Scroll down to **"Your apps"** section
3. You should see your web app
4. Copy the `firebaseConfig` object
5. **Save this somewhere** - you'll need it in the next step

---

## Part 2: Configure the App

### Step 1: Edit firebase-config.js

1. Open `firebase-config.js` in your code editor
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

3. Save the file

**Note**: The Firebase API key is safe to commit to Git. Security comes from Firebase's server-side rules, not from hiding the API key.

---

## Part 3: GitHub Repository Setup

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com/) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Repository settings:
   - **Repository name**: `notes` (or any name you prefer)
   - **Description**: "Quick Capture Lists - A fast, simple list manager"
   - **Public** or **Private** (your choice - both work with GitHub Pages)
   - **Do NOT** initialize with README, .gitignore, or license
4. Click **"Create repository"**

### Step 2: Push Your Code

If you're familiar with Git:

```bash
cd path/to/notes
git init
git add .
git commit -m "Initial commit - Quick Capture Lists"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/notes.git
git push -u origin main
```

If you're **not** familiar with Git, use GitHub's web interface:

1. Go to your repository on GitHub
2. Click **"uploading an existing file"**
3. Drag all files from your `notes` folder into the upload area
4. Commit the files

### Step 3: Enable GitHub Pages

1. In your GitHub repository, click **"Settings"** tab
2. In the left sidebar, click **"Pages"**
3. Under **"Source"**:
   - **Branch**: Select `main`
   - **Folder**: Select `/ (root)`
4. Click **"Save"**
5. Wait 1-2 minutes for deployment
6. Your app will be live at: `https://YOUR-USERNAME.github.io/notes/`

### Step 4: Update Firebase Authorized Domains

1. Go back to [Firebase Console](https://console.firebase.google.com/)
2. Open your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add: `YOUR-USERNAME.github.io`
6. Click **"Add"**

---

## Part 4: Testing

### Step 1: Access Your App

1. Visit `https://YOUR-USERNAME.github.io/notes/`
2. You should see the login page

### Step 2: Create an Account

1. Click **"Sign Up"**
2. Enter an email and password (min 6 characters)
3. Click **"Create Account"**
4. You should be redirected to the main app

### Step 3: Create Your First List

1. Click **"+ New List"**
2. Name: "Test List"
3. Icon: 📋
4. Click **"Save"**

### Step 4: Add Items

1. Select "📋 Test List" in the dropdown
2. Type "Test item" in the input
3. Press Enter or click "+"
4. Item should appear in your list

### Step 5: Test Features

- ✓ Click item to mark complete
- ✏️ Click edit icon to modify
- 🗑️ Click X to delete
- Click list header to collapse/expand

---

## Part 5: Optional Enhancements

### Add App Icons (PWA Support)

1. Create two PNG icons:
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)
2. Place them in your `notes` folder
3. Commit and push to GitHub

You can use tools like:
- [Favicon.io](https://favicon.io/) - Generate from emoji
- [Canva](https://www.canva.com/) - Design custom icon

### Enable reCAPTCHA (Optional but Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **App Check**
3. Register your app with reCAPTCHA v3
4. Copy the site key
5. In `firebase-config.js`, uncomment and add:
   ```javascript
   appCheckSiteKey: "YOUR_RECAPTCHA_SITE_KEY"
   ```

---

## Troubleshooting

### "Not Authenticated" Error
- Check Firebase Authentication is enabled
- Verify Email/Password provider is enabled
- Check security rules are configured correctly

### "Permission Denied" in Firestore
- Verify security rules are published
- Make sure you're logged in
- Check the rules match the format in Step 5 above

### Login Page Doesn't Redirect
- Check browser console for errors
- Verify `firebase-config.js` has correct values
- Make sure Firebase Auth is enabled

### GitHub Pages Not Working
- Wait 2-3 minutes after enabling
- Check repository is public (or you have GitHub Pro for private Pages)
- Verify branch and folder are set correctly

### App Loads but Firebase Errors
- Check `firebase-config.js` has correct credentials
- Verify your domain is in Firebase Authorized Domains
- Check browser console for specific error messages

---

## Next Steps

### Customize Your App

1. **Change Colors**: Edit CSS variables in `styles.css`
2. **Update Title**: Change title in `index.html` and `login.html`
3. **Modify Icon**: Update emoji in HTML files

### Add More Features

Check out the "Planned Features" section in `README.md` for ideas!

### Backup Your Data

Use the **Settings → Export All Data** feature regularly to backup your lists.

---

## Support

### Common Questions

**Q: Is my data safe?**
A: Yes! Each user's data is completely isolated via Firestore security rules.

**Q: Can I use this offline?**
A: Yes! The app works offline and syncs when you reconnect.

**Q: How much does this cost?**
A: Firebase free tier is generous - likely free for personal use. GitHub Pages is free.

**Q: Can I use my own domain?**
A: Yes! Configure a custom domain in GitHub Pages settings, then add it to Firebase Authorized Domains.

**Q: How do I share lists with others?**
A: This feature is planned but not yet implemented.

### Need More Help?

- Firebase Documentation: https://firebase.google.com/docs
- GitHub Pages Documentation: https://docs.github.com/en/pages
- Check browser console for error messages

---

## Summary Checklist

- [ ] Created Firebase project
- [ ] Registered web app in Firebase
- [ ] Enabled Email/Password authentication
- [ ] Created Firestore database
- [ ] Configured Firestore security rules
- [ ] Copied Firebase config to `firebase-config.js`
- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Enabled GitHub Pages
- [ ] Added GitHub Pages domain to Firebase
- [ ] Tested login and list creation
- [ ] App is working correctly

**Congratulations! Your Quick Capture Lists app is now live! 🎉**
