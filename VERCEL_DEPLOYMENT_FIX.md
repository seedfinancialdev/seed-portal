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

## If Still Having Issues
- Check if your repository has any deployment restrictions
- Verify you have admin access to both GitHub repo and Vercel project
- Try creating a new commit and pushing to trigger deployment

Let me know which solution works for your setup!