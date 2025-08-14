import { GoogleAdminService } from '../google-admin';

(async () => {
  try {
    const svc = new GoogleAdminService();
    const result = await svc.testConnection();
    if (result.connected) {
      console.log('✅ Google Admin connectivity OK');
      process.exit(0);
    } else {
      console.error('❌ Google Admin connectivity FAILED:', result.error || 'Unknown error');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Google Admin test error:', err?.message || err);
    process.exit(1);
  }
})();
