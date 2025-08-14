-- Complete Database Reset Script
-- This removes ALL existing tables to start completely fresh

-- Drop the existing Supabase tables
DROP TABLE IF EXISTS public.box_folders CASCADE;
DROP TABLE IF EXISTS public.client_activities CASCADE;
DROP TABLE IF EXISTS public.document_templates CASCADE;
DROP TABLE IF EXISTS public.hubspot_debug CASCADE;
DROP TABLE IF EXISTS public.session CASCADE;

-- Drop any other tables that might exist from previous migration attempts
DROP TABLE IF EXISTS public.workspace_users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.sales_reps CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.monthly_bonuses CASCADE;
DROP TABLE IF EXISTS public.milestone_bonuses CASCADE;
DROP TABLE IF EXISTS public.kb_search_history CASCADE;
DROP TABLE IF EXISTS public.kb_categories CASCADE;
DROP TABLE IF EXISTS public.kb_bookmarks CASCADE;
DROP TABLE IF EXISTS public.kb_articles CASCADE;
DROP TABLE IF EXISTS public.kb_article_versions CASCADE;
DROP TABLE IF EXISTS public.hubspot_subscriptions CASCADE;
DROP TABLE IF EXISTS public.hubspot_invoices CASCADE;
DROP TABLE IF EXISTS public.hubspot_invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.commissions CASCADE;
DROP TABLE IF EXISTS public.commission_adjustments CASCADE;
DROP TABLE IF EXISTS public.approval_codes CASCADE;

-- Drop any sequences that might exist
DROP SEQUENCE IF EXISTS public.box_folders_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.client_activities_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.document_templates_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.hubspot_debug_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.session_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.workspace_users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.sales_reps_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.quotes_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.monthly_bonuses_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.milestone_bonuses_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.kb_search_history_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.kb_categories_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.kb_bookmarks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.kb_articles_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.kb_article_versions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.hubspot_subscriptions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.hubspot_invoices_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.hubspot_invoice_line_items_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.deals_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.commissions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.commission_adjustments_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.approval_codes_id_seq CASCADE;

-- Drop any indexes that might exist
DROP INDEX IF EXISTS public.idx_users_email CASCADE;
DROP INDEX IF EXISTS public.idx_session_expire CASCADE;
DROP INDEX IF EXISTS public.idx_quotes_owner_archived CASCADE;
DROP INDEX IF EXISTS public.idx_quotes_created_at CASCADE;
DROP INDEX IF EXISTS public.idx_quotes_contact_email CASCADE;

SELECT 'Database completely reset - ready for fresh migration!' as result;
