-- ============================================================
-- T24: Trial Environment — tracking + feedback
-- Ref: Art. 8.3 (Core/Platform = double vote with trial)
-- Ref: project_legislative_architecture.md (trial = snapshot reali)
-- Applied via Supabase MCP on 2026-04-13
-- ============================================================

-- 1. trial_environments table
CREATE TABLE IF NOT EXISTS trial_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) UNIQUE,
  supabase_branch_id TEXT,
  supabase_branch_name TEXT,
  vercel_deployment_id TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'provisioning', 'active', 'completed', 'failed', 'cancelled')),
  snapshot_taken_at TIMESTAMPTZ,
  snapshot_row_counts JSONB DEFAULT '{}'::jsonb,
  applied_sql TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  provisioned_by UUID REFERENCES profiles(id)
);

ALTER TABLE trial_environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY trial_env_read ON trial_environments FOR SELECT USING (true);

-- 2. trial_feedback table
CREATE TABLE IF NOT EXISTS trial_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES trial_environments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  feedback_type TEXT NOT NULL DEFAULT 'observation'
    CHECK (feedback_type IN ('bug', 'concern', 'observation', 'approval')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trial_id, author_id, feedback_type)
);

ALTER TABLE trial_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY trial_feedback_read ON trial_feedback FOR SELECT USING (true);
CREATE POLICY trial_feedback_insert ON trial_feedback FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_trial_env_proposal ON trial_environments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_trial_env_status ON trial_environments(status) WHERE status IN ('pending', 'provisioning', 'active');
CREATE INDEX IF NOT EXISTS idx_trial_feedback_trial ON trial_feedback(trial_id);

-- 4-8. RPCs: create_trial_environment, provision_trial_environment,
--           get_trial_environment, submit_trial_feedback, complete_trial_environment
-- (Applied via Supabase MCP — see full SQL in migration apply log)
