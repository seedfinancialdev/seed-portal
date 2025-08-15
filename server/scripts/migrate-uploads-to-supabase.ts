import path from 'path';
import { promises as fs } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { db, closeDatabaseConnections } from '../db';
import { users } from '../../shared/schema';
import { eq, like } from 'drizzle-orm';

function contentTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
    case '.jfif':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    case '.tiff':
    case '.tif':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
}

async function main() {
  const DRY_RUN = process.env.DRY_RUN === '1';
  const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const SUPABASE_BUCKET_PROFILE_PHOTOS = process.env.SUPABASE_BUCKET_PROFILE_PHOTOS || 'profile-photos';
  const SUPABASE_USE_SIGNED_URLS = process.env.SUPABASE_SIGNED_URLS === '1';

  if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_KEY)) {
    console.error('Supabase credentials missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY). Or run with DRY_RUN=1.');
    process.exit(1);
  }

  const supabase = (SUPABASE_URL && SUPABASE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  console.log('Starting migration of legacy /uploads profile photos to Supabase Storage');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will upload and update DB)'}\n`);

  type Row = { id: number; profilePhoto: string | null };
  const candidates: Row[] = await db
    .select({ id: users.id, profilePhoto: users.profilePhoto })
    .from(users)
    .where(like(users.profilePhoto, '/uploads/%'));

  console.log(`Found ${candidates.length} users with legacy /uploads profile photos`);

  let migrated = 0;
  let skippedMissingFile = 0;
  let errors = 0;

  for (const row of candidates) {
    const original = row.profilePhoto!;
    const withoutPrefix = original.startsWith('/uploads/')
      ? original.slice('/uploads/'.length)
      : original.replace(/^\/+/, '');

    const localPath = path.join(UPLOADS_DIR, withoutPrefix);
    const fileExists = await fs.access(localPath).then(() => true).catch(() => false);

    if (!fileExists) {
      console.warn(`User ${row.id}: file not found -> ${localPath} (from ${original})`);
      skippedMissingFile++;
      continue;
    }

    const ext = path.extname(localPath) || '.jpg';
    const basename = path.basename(localPath, ext);
    const objectPath = `users/${row.id}/${basename}${ext.toLowerCase()}`;

    if (DRY_RUN) {
      console.log(`DRY RUN user ${row.id}: would upload ${localPath} -> ${SUPABASE_BUCKET_PROFILE_PHOTOS}/${objectPath} and update DB`);
      migrated++;
      continue;
    }

    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const buffer = await fs.readFile(localPath);
      const contentType = contentTypeFromExt(ext);

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET_PROFILE_PHOTOS)
        .upload(objectPath, buffer, { contentType, cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      let photoUrl: string | null = null;
      if (SUPABASE_USE_SIGNED_URLS) {
        const { data: signed, error: signErr } = await supabase.storage
          .from(SUPABASE_BUCKET_PROFILE_PHOTOS)
          .createSignedUrl(objectPath, 60 * 60 * 24 * 365);
        if (signErr) throw signErr;
        photoUrl = signed?.signedUrl || null;
      }
      if (!photoUrl) {
        const { data: pub } = supabase.storage
          .from(SUPABASE_BUCKET_PROFILE_PHOTOS)
          .getPublicUrl(objectPath);
        photoUrl = pub.publicUrl;
      }

      if (!photoUrl) throw new Error('Failed to determine Supabase file URL');

      await db.update(users)
        .set({ profilePhoto: photoUrl, updatedAt: new Date() as unknown as any })
        .where(eq(users.id, row.id));

      console.log(`Migrated user ${row.id}: ${original} -> ${photoUrl}`);
      migrated++;
    } catch (err) {
      console.error(`Error migrating user ${row.id}:`, err);
      errors++;
    }
  }

  console.log('\nMigration complete.');
  console.log(`Migrated: ${migrated}`);
  console.log(`Missing files skipped: ${skippedMissingFile}`);
  console.log(`Errors: ${errors}`);

  await closeDatabaseConnections();
}

main().catch(async (err) => {
  console.error('Fatal error in migration script:', err);
  await closeDatabaseConnections();
  process.exit(1);
});
