-- =============================================================================
-- MIGRATION: Remove real-world placeholder groups from DB
-- =============================================================================
-- Date: 2026-04-12
-- Reason: IGO, NGO, and party groups were seeded without verified founders.
--         They are archived in supabase/seeds/real_world_groups.sql and will
--         be re-inserted when T16 (founder verification) is implemented.
--
-- Safe to run: no child groups exist (verified before migration).
-- geographic_areas table is NOT affected — it remains intact.
-- =============================================================================

DELETE FROM groups
WHERE founder_id IS NULL
  AND group_type IN ('igo', 'ngo', 'party');
