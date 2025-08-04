# OAuth Popup Issue - Immediate Fix

## Issue Identified
**Error**: "Popup window closed" from Google OAuth library
**Cause**: Browser popup blocker or missing redirect URI configuration

## Required Google Cloud Console Configuration

### 1. Authorized JavaScript Origins (✅ User confirmed this is done)
```
https://0eaa0906-91da-425d-a7fb-ee8d092a93fb-00-1yrbtgt9gt5c5.janeway.replit.dev
```

### 2. Authorized Redirect URIs (❓ Check if this is configured)
Add these redirect URIs to your OAuth 2.0 client:
```
https://0eaa0906-91da-425d-a7fb-ee8d092a93fb-00-1yrbtgt9gt5c5.janeway.replit.dev
https://0eaa0906-91da-425d-a7fb-ee8d092a93fb-00-1yrbtgt9gt5c5.janeway.replit.dev/auth
```

## Browser Solutions

### Option 1: Allow Popups
1. Click the popup blocker icon in Chrome's address bar
2. Select "Always allow popups from this site"
3. Refresh and try login again

### Option 2: Manual Popup Test
1. Try clicking login button again - I've added popup blocker detection
2. If you see "Please allow popups" message, follow Option 1

## Technical Details
- The popup opens but closes immediately
- This typically means either popup blocker OR redirect URI mismatch
- The login button now tests for popup blockers before attempting OAuth

## Next Steps
1. **Check redirect URIs** in Google Cloud Console (most likely missing)
2. **Allow popups** if browser blocks them
3. **Test login** - should work immediately after fixing either issue