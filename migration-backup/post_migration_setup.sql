-- =====================================================
-- POST-MIGRATION SETUP SCRIPT FOR SUPABASE
-- Run this in Supabase SQL Editor after migration
-- =====================================================

-- =====================================================
-- 1) VERIFY THE IMPORT
-- =====================================================

-- Check installed extensions
SELECT extname FROM pg_extension ORDER BY 1;

-- Verify all tables exist (should show approx_rows)
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS approx_rows
FROM pg_stat_all_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schemaname, relname;

-- Check for any invalid objects
SELECT * FROM pg_class 
WHERE relnamespace IN (
    SELECT oid FROM pg_namespace 
    WHERE nspname NOT IN ('pg_catalog', 'information_schema')
) 
AND relkind IN ('r', 'i', 'm')
AND NOT relispartition 
AND relfrozenxid IS NOT NULL
AND age(relfrozenxid) < 0;

-- =====================================================
-- 2) FIX SEQUENCES (SERIAL/IDENTITY COLUMNS)
-- =====================================================

-- Generate and execute sequence reset commands
DO $$
DECLARE
    r RECORD;
    seq_value BIGINT;
    max_value BIGINT;
BEGIN
    FOR r IN 
        SELECT 
            schemaname,
            tablename,
            attname AS column_name,
            pg_get_serial_sequence(schemaname||'.'||tablename, attname) AS seq_name
        FROM pg_tables t
        JOIN pg_attribute a ON a.attrelid = (schemaname||'.'||tablename)::regclass
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND a.attnum > 0  -- Exclude system columns
        AND NOT a.attisdropped  -- Exclude dropped columns
        AND pg_get_serial_sequence(schemaname||'.'||tablename, attname) IS NOT NULL
    LOOP
        IF r.seq_name IS NOT NULL THEN
            -- Get current max value from the table
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I.%I', 
                r.column_name, r.schemaname, r.tablename) INTO max_value;
            
            -- Get current sequence value
            EXECUTE format('SELECT last_value FROM %s', r.seq_name) INTO seq_value;
            
            -- Reset sequence if needed
            IF max_value >= seq_value THEN
                EXECUTE format('SELECT setval(%L, %s, true)', r.seq_name, max_value);
                RAISE NOTICE 'Reset sequence % to %', r.seq_name, max_value;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 3) UPDATE PRISMA + STATS  
-- =====================================================

-- Note: Prisma updates need to be done from command line:
-- doppler run -- npx prisma migrate deploy
-- doppler run -- npx prisma generate

-- Update table statistics for query planner
VACUUM ANALYZE;

-- =====================================================
-- 4) BASELINE PERFORMANCE
-- =====================================================

-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View current query stats (after some usage)
-- SELECT 
--     query,
--     calls,
--     total_time,
--     mean_time,
--     rows
-- FROM pg_stat_statements
-- ORDER BY total_time DESC
-- LIMIT 20;

-- Check for missing indexes (run after some usage)
-- SELECT 
--     schemaname,
--     tablename,
--     attname,
--     n_distinct,
--     correlation
-- FROM pg_stats
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- AND n_distinct > 100
-- AND correlation < 0.1
-- ORDER BY n_distinct DESC;

-- =====================================================
-- 5) SAFETY & CONFIGURATION
-- =====================================================

-- Enable RLS on all tables (if using Supabase Auth)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions', 'auth', 'storage', 'vault')
    LOOP
        -- Enable RLS but don't create policies yet (app-specific)
        -- EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
        -- RAISE NOTICE 'RLS enabled on %.%', r.schemaname, r.tablename;
        RAISE NOTICE 'Skipping RLS for %.% - configure based on your auth needs', r.schemaname, r.tablename;
    END LOOP;
END $$;

-- Check current timezone setting
SHOW timezone;

-- Set timezone if needed (uncomment and modify)
-- ALTER DATABASE postgres SET timezone TO 'America/Los_Angeles';

-- =====================================================
-- 6) BACKUP VERIFICATION
-- =====================================================

-- Note: Supabase automatically handles backups
-- You can verify backup settings in Supabase Dashboard:
-- Settings > Database > Backups

-- Create a simple backup validation query
SELECT 
    'Database Migration Completed' AS status,
    NOW() AS completed_at,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS public_tables_count,
    (SELECT SUM(n_live_tup) FROM pg_stat_user_tables) AS total_rows,
    pg_database_size(current_database()) AS database_size_bytes;

-- =====================================================
-- FINAL NOTES
-- =====================================================
-- 1. Run 'doppler run -- npx prisma migrate deploy' from terminal
-- 2. Monitor pg_stat_statements after some usage
-- 3. Configure RLS policies based on your auth requirements
-- 4. Set up monitoring/alerting in Supabase Dashboard
-- 5. Review and configure connection pooling settings
