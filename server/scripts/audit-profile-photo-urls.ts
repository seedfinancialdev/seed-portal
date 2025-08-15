import { db, closeDatabaseConnections } from '../db';
import { users } from '../../shared/schema';
import { like } from 'drizzle-orm';

async function main() {
  console.log('Auditing users.profile_photo for public vs signed Supabase URLs');

  type Row = { id: number; profilePhoto: string | null };

  const publicRows: Row[] = await db
    .select({ id: users.id, profilePhoto: users.profilePhoto })
    .from(users)
    .where(like(users.profilePhoto, '%/storage/v1/object/public/%'));

  const signedRows: Row[] = await db
    .select({ id: users.id, profilePhoto: users.profilePhoto })
    .from(users)
    .where(like(users.profilePhoto, '%/storage/v1/object/sign/%'));

  console.log(`Public URL count: ${publicRows.length}`);
  console.log(`Signed URL count: ${signedRows.length}`);

  if (signedRows.length > 0) {
    console.log('Example signed rows (up to 5):');
    for (const r of signedRows.slice(0, 5)) {
      console.log(`- id=${r.id} url=${r.profilePhoto}`);
    }
  }

  if (publicRows.length > 0) {
    console.log('Example public rows (up to 5):');
    for (const r of publicRows.slice(0, 5)) {
      console.log(`- id=${r.id} url=${r.profilePhoto}`);
    }

    // Try a HEAD request against the first public URL to confirm accessibility
    const sample = publicRows[0].profilePhoto;
    if (sample) {
      try {
        const res = await fetch(sample, { method: 'HEAD' });
        console.log(`HEAD ${sample} -> ${res.status}`);
        const ct = res.headers.get('content-type');
        if (ct) console.log(`content-type: ${ct}`);
      } catch (err) {
        console.error('HEAD request failed:', err);
      }
    }
  }

  await closeDatabaseConnections();
}

main().catch(async (err) => {
  console.error('Audit failed:', err);
  await closeDatabaseConnections();
  process.exit(1);
});
