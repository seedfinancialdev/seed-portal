import { Request, Response, NextFunction } from 'express';

// Comprehensive session debugging middleware
export function debugSession(label: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 SESSION DEBUG [${label}]`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📍 URL: ${req.method} ${req.url}`);
    console.log(`📍 Time: ${new Date().toISOString()}`);
    console.log(`📍 Session ID: ${req.sessionID}`);
    console.log(`📍 Session Cookie: ${req.headers.cookie?.includes('connect.sid') ? 'Present' : 'Missing'}`);
    console.log(`📍 Session Exists: ${!!req.session}`);
    console.log(`📍 Session Store Type: ${req.session?.store?.constructor?.name || 'Unknown'}`);
    console.log(`📍 Is Authenticated: ${req.isAuthenticated()}`);
    console.log(`📍 Passport Session: ${JSON.stringify(req.session?.passport)}`);
    console.log(`📍 User Exists: ${!!req.user}`);
    console.log(`📍 User ID: ${req.user?.id}`);
    console.log(`📍 User Email: ${req.user?.email}`);
    console.log(`📍 Headers:`, {
      authorization: req.headers.authorization ? 'Present' : 'None',
      cookie: req.headers.cookie ? 'Present' : 'None',
      'x-csrf-token': req.headers['x-csrf-token'] ? 'Present' : 'None',
    });
    
    // Deep session inspection
    if (req.session) {
      console.log(`📍 Session Keys: ${Object.keys(req.session).join(', ')}`);
      console.log(`📍 Session Cookie Settings:`, req.session.cookie);
    }
    
    console.log(`${'='.repeat(80)}\n`);
    next();
  };
}

// Session consistency checker
export function checkSessionConsistency(req: Request) {
  const checks = {
    sessionExists: !!req.session,
    sessionIDExists: !!req.sessionID,
    passportInSession: !!req.session?.passport,
    userInPassport: !!req.session?.passport?.user,
    userInReq: !!req.user,
    userIdInReq: !!req.user?.id,
    isAuthenticated: req.isAuthenticated(),
    cookiePresent: !!req.headers.cookie?.includes('connect.sid'),
  };
  
  const issues = [];
  if (!checks.sessionExists) issues.push('No session object');
  if (!checks.sessionIDExists) issues.push('No session ID');
  if (checks.sessionExists && !checks.passportInSession) issues.push('No passport in session');
  if (checks.passportInSession && !checks.userInPassport) issues.push('No user ID in passport session');
  if (!checks.userInReq) issues.push('No user object in request');
  if (checks.userInReq && !checks.userIdInReq) issues.push('User object exists but ID is missing');
  if (!checks.isAuthenticated) issues.push('isAuthenticated() returns false');
  if (!checks.cookiePresent) issues.push('No session cookie in request');
  
  return {
    checks,
    issues,
    healthy: issues.length === 0
  };
}