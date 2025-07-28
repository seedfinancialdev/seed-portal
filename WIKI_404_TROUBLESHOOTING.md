# Wiki.js 404 Error Troubleshooting

## Common Causes for 404 on Wiki.js Vercel Deployment

### 1. Incomplete Setup Wizard
- Wiki.js requires initial setup before it's accessible
- Visit: https://seed-wiki.vercel.app/setup (if available)
- Or check Vercel deployment logs for setup instructions

### 2. Build Output Directory Issue
- Wiki.js may not have built correctly with `.` output directory
- Try changing Output Directory to `dist` or leaving blank

### 3. Database Connection Failed
- Check if Neon database credentials are correct in Vercel environment variables
- Verify database is accessible and Wiki.js can connect

### 4. Missing Entry Point
- Wiki.js might need specific routing configuration
- Check if `package.json` has correct start script

## Debugging Steps

### Check Vercel Deployment Status
1. Go to Vercel dashboard → Your project → Deployments
2. Check if build completed successfully (green checkmark)
3. Review build logs for any errors after npm install

### Verify Environment Variables
Required variables in Vercel:
```
DB_TYPE=postgres
DB_HOST=your-neon-host
DB_PORT=5432
DB_USER=your-neon-user
DB_PASS=your-neon-password
DB_NAME=wiki
DB_SSL=true
```

### Test Database Connection
- In Vercel deployment logs, look for database connection errors
- Ensure Neon database allows connections from Vercel IPs

### Alternative URLs to Try
- https://seed-wiki.vercel.app/setup
- https://seed-wiki.vercel.app/admin
- https://seed-wiki.vercel.app/login

## Quick Fixes

### Fix 1: Restart Deployment
- In Vercel, trigger a new deployment
- This often resolves temporary issues

### Fix 2: Check Build Configuration
- Ensure Build Command is set to `npm run build`
- Try changing Output Directory from `.` to blank

### Fix 3: Verify Wiki.js Version
- Some Wiki.js versions have different build requirements
- May need to use different Node.js version in Vercel

## Next Steps
1. Check Vercel deployment logs
2. Verify database connection
3. Try setup URLs
4. Review build configuration if needed