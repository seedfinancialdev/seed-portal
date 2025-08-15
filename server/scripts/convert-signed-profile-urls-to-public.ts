import { db, closeDatabaseConnections } from '../db';
import { users } from '../../shared/schema';
import { eq, like } from 'drizzle-orm';

/**
 * Convert a Supabase signed URL to a public URL by swapping the path segment
 * "/storage/v1/object/sign/" -> "/storage/v1/object/public/" and stripping query params.
 * Returns null if the URL is not a recognized Supabase signed URL.
 */
function convertSignedToPublicUrl(signedUrlStr: string): string | null {
  try {
    const u = new URL(signedUrlStr);
    const signPrefix = '/storage/v1/object/sign/';
    const idx = u.pathname.indexOf(signPrefix);
    if (idx === -1) return null;

    // Remainder contains: "<bucket>/<objectPath>"
    const remainder = u.pathname.slice(idx + signPrefix.length);
    const publicPath = `/storage/v1/object/public/${remainder}`;

    return `${u.origin}${publicPath}`;
  } catch {
    return null;
  }
}

async function main() {
  const DRY_RUN = process.env.DRY_RUN === '1';

  console.log('Converting existing signed Supabase profile photo URLs to public URLs');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will update DB)'}\n`);

  type Row = { id: number; profilePhoto: string | null };
  const candidates: Row[] = await db
    .select({ id: users.id, profilePhoto: users.profilePhoto })
    .from(users)
    .where(like(users.profilePhoto, '%/storage/v1/object/sign/%'));

  console.log(`Found ${candidates.length} users with signed Supabase profile photos`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of candidates) {
    const current = row.profilePhoto;
    if (!current) { skipped++; continue; }

    const nextUrl = convertSignedToPublicUrl(current);
    if (!nextUrl) {
      console.warn(`User ${row.id}: not a recognized signed Supabase URL -> ${current}`);
      skipped++;
      continue;
    }

    if (nextUrl === current) {
      // Shouldn't happen, but guard anyway
      skipped++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`DRY RUN user ${row.id}: ${current} -> ${nextUrl}`);
        updated++;
        continue;
      }

      await db.update(users)
        .set({ profilePhoto: nextUrl, updatedAt: new Date() as unknown as any })
        .where(eq(users.id, row.id));

      console.log(`Updated user ${row.id}: ${current} -> ${nextUrl}`);
      updated++;
    } catch (err) {
      console.error(`Error updating user ${row.id}:`, err);
      errors++;
    }
  }

  console.log('\nConversion complete.');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  await closeDatabaseConnections();
}

main().catch(async (err) => {
  console.error('Fatal error in conversion script:', err);
  await closeDatabaseConnections();
  process.exit(1);
});
