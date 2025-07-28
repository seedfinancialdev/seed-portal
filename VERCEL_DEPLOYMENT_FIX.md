# Vercel Deployment Issue Fix

## Problem
Vercel shows "To deploy to production, push to the Repository Default branch" even though you're on `/main`.

## Common Solutions

### Solution 1: Check Default Branch Settings
1. **GitHub Repository**: Go to your Wiki.js repository on GitHub
2. **Settings Tab**: Click "Settings" → "General" → "Default branch"
3. **Verify Branch**: Ensure it shows `main` as the default branch
4. **Change if Needed**: If it shows `master` or another branch, change it to `main`

### Solution 2: Vercel Project Settings
1. **Vercel Dashboard**: Go to your Wiki.js project in Vercel
2. **Settings**: Click "Settings" → "Git"
3. **Production Branch**: Verify it's set to `main`
4. **Update**: Change it to `main` if it's different

### Solution 3: Force Push to Main
If you're working on a different branch:
```bash
# Ensure you're on main
git checkout main

# Pull latest changes
git pull origin main

# If you have changes on another branch, merge them
git merge your-feature-branch

# Push to main
git push origin main
```

### Solution 4: Manual Deployment Trigger
1. **Vercel Dashboard**: Go to your project
2. **Deployments Tab**: Click "Deployments"
3. **Deploy Button**: Click "Deploy" next to your latest commit
4. **Select Branch**: Choose `main` branch

### Solution 5: Re-connect Repository
If settings look correct but it's still not working:
1. **Vercel Project**: Go to Settings → Git
2. **Disconnect**: Disconnect the repository
3. **Reconnect**: Connect it again and select `main` as production branch

## Verification Steps
1. **Check Branch**: `git branch` - should show `* main`
2. **Check Remote**: `git remote -v` - verify GitHub URL
3. **Check Commits**: Ensure your latest changes are committed and pushed
4. **Vercel Logs**: Check deployment logs for specific error messages

## Wiki.js Specific Build Configuration

### Build Settings for Wiki.js on Vercel
Based on your screenshot, you need to configure these settings:

**Framework Preset**: Other (keep as selected)

**Build Command**: 
```bash
npm run build
```

**Output Directory**: 
```bash
.
```
(Just a single dot - Wiki.js builds in place)

**Install Command**: 
```bash
npm install
```

**Development Command**: 
```bash
npm run dev
```

### Alternative Build Configuration
If the above doesn't work, try:

**Build Command**: 
```bash
npm ci && npm run build
```

**Output Directory**: 
```bash
dist
```

### Root Directory Setting
- Leave "Root Directory" empty (should show just "/" or be blank)
- Make sure "Include files outside the root directory in the Build Step" is ENABLED

## Step-by-Step Fix
1. In your Vercel project, go to Settings → Build and Development Settings
2. Set Framework Preset to "Other"
3. Set Build Command to `npm run build`
4. Set Output Directory to `.` (single dot)
5. Set Install Command to `npm install`
6. Click "Save"
7. Go to Deployments and trigger a new deployment

## If Build Still Fails
- Check if your Wiki.js repository has a `package.json` with proper build scripts
- Verify your Neon database environment variables are correctly set
- Check deployment logs for specific error messages

Let me know which solution works for your setup!