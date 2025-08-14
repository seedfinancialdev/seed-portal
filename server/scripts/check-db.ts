import { checkDatabaseHealth, closeDatabaseConnections } from '../db';

(async () => {
  try {
    const ok = await checkDatabaseHealth();
    console.log(ok ? '✅ DB connectivity OK' : '❌ DB connectivity FAILED');
    await closeDatabaseConnections();
    process.exit(ok ? 0 : 1);
  } catch (err: any) {
    console.error('DB check error:', err?.message || err);
    process.exit(1);
  }
})();
