-- T15: Geographic Areas table + IGO/NGO group types
-- Creates geographic_areas reference tree (separate from groups)
-- Links groups to geographic areas via geographic_area_id FK
-- Adds 'igo' and 'ngo' to group_type constraint
-- Makes founder_id nullable for pre-seeded institutional groups

-- ── 1. Geographic Areas table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS geographic_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES geographic_areas(id),
  level TEXT NOT NULL CHECK (level IN ('world', 'continent', 'sub_region', 'country', 'territory', 'region', 'city')),
  iso_alpha2 TEXT,
  iso_alpha3 TEXT,
  iso_numeric TEXT,
  emoji_flag TEXT,
  sovereignty_status TEXT DEFAULT 'sovereign' CHECK (sovereignty_status IN ('sovereign', 'territory', 'disputed', 'special', 'antarctic')),
  administering_country_id UUID REFERENCES geographic_areas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geographic_areas_iso2 ON geographic_areas(iso_alpha2) WHERE iso_alpha2 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_geographic_areas_iso3 ON geographic_areas(iso_alpha3) WHERE iso_alpha3 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geographic_areas_parent ON geographic_areas(parent_id);
CREATE INDEX IF NOT EXISTS idx_geographic_areas_level ON geographic_areas(level);

-- RLS: publicly readable
ALTER TABLE geographic_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Geographic areas are publicly readable" ON geographic_areas FOR SELECT USING (true);

-- ── 2. Groups schema changes ───────────────────────────────────────
-- Make founder_id nullable (for pre-seeded institutional groups)
ALTER TABLE groups ALTER COLUMN founder_id DROP NOT NULL;

-- Add geographic_area_id FK
ALTER TABLE groups ADD COLUMN IF NOT EXISTS geographic_area_id UUID REFERENCES geographic_areas(id);
CREATE INDEX IF NOT EXISTS idx_groups_geographic_area ON groups(geographic_area_id);

-- Update group_type constraint to include igo and ngo
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_group_type_check;
ALTER TABLE groups ADD CONSTRAINT groups_group_type_check
  CHECK (group_type = ANY (ARRAY['jurisdiction','party','community','working_group','custom','religion','igo','ngo']));

-- ── 3. Data seeded via execute_sql (not in migration) ──────────────
-- 272 geographic areas: 1 world + 7 continents + 21 sub-regions + 198 countries + 45 territories
-- 11 IGOs, 9 NGOs, 44 political parties (11 countries)
-- See seed data in Supabase directly
