# Authentication System Rebuild Plan

## Current Working System (DO NOT BREAK)
- **Hook**: `client/src/hooks/use-auth.tsx` - ACTIVE in App.tsx
- **Page**: `client/src/pages/auth-page.tsx` - ACTIVE route /auth
- **Protection**: `client/src/lib/protected-route.tsx` - Uses useAuth()
- **Backend**: `/api/login`, `/api/logout`, `/api/user` - ACTIVE endpoints

## Dependencies Using Current System
- All ProtectedRoute components
- Profile page
- All dashboard pages  
- App.tsx AuthProvider wrapper

## Systems to REMOVE (Unused)
- `client/src/hooks/use-firebase-auth.tsx` - Not used in App.tsx
- `client/src/hooks/use-google-auth.tsx` - Not used in App.tsx  
- `client/src/hooks/use-unified-auth.tsx` - Not used in App.tsx
- `client/src/pages/auth-page-google.tsx` - Not in routes
- `client/src/pages/auth-page-unified.tsx` - Not in routes
- `client/src/lib/firebase.ts` - Not used by active system

## Backend Endpoints to Clean
- `/api/login` - Remove multiple auth types, keep session + Google OAuth only
- `/api/auth/google/sync` - REMOVE (deprecated, not used by active system)

## Rollback Strategy
- All changes will be incremental
- Current auth interface will be preserved
- If anything breaks, we can immediately revert specific files
- No changes to the AuthContextType interface initially

## Success Criteria  
- All existing functionality continues to work
- Users can still sign in with Google
- Protected routes still protect properly
- No impact on existing user sessions
- Clean, maintainable auth system

## Implementation Order
1. Remove unused auth systems (safest first)
2. Clean backend endpoints
3. Improve current use-auth.tsx
4. Test everything thoroughly