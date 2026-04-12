-- ============================================
-- LUX-DB-UPDATE: Replace Charter v1 (30 art.) → LUX v2 (13 art.)
-- ELECTED-MODERATORS: Block manual moderator assignment
-- Ref: Phase 5 compliance LUX v2
-- ============================================

-- 1. Clean orphaned content_hashes from old laws
DELETE FROM content_hashes WHERE entity_type = 'law';

-- 2. Delete all existing Charter v1 laws
DELETE FROM laws WHERE parent_id IS NOT NULL AND law_type = 'article';
DELETE FROM laws WHERE parent_id IS NOT NULL AND law_type = 'chapter';
DELETE FROM laws WHERE parent_id IS NOT NULL AND law_type = 'title';
DELETE FROM laws WHERE parent_id IS NOT NULL;
DELETE FROM laws;

-- 3. Insert LUX v2 root
INSERT INTO laws (id, title, summary, content, law_type, status, order_index, lock_category, is_active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'LUX — The Constitution of Pangea',
  'The foundational law of Pangea. Only what is strictly necessary to make the platform function and prevent it from derailing.',
  'The foundational law of Pangea. Only what is strictly necessary to make the platform function and prevent it from derailing. Everything else is decided democratically by the citizens.',
  'code', 'active', 0, 'reinforced', true
);

-- 4. Titles
INSERT INTO laws (id, title, law_type, status, order_index, parent_id, lock_category, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Title I — Foundational Principles', 'title', 'active', 1, 'c0000000-0000-0000-0000-000000000001', 'reinforced', true),
  ('c2000000-0000-0000-0000-000000000001', 'Title II — Core Protocol', 'title', 'active', 2, 'c0000000-0000-0000-0000-000000000001', 'structural', true),
  ('c3000000-0000-0000-0000-000000000001', 'Title III — Platform Protocol', 'title', 'active', 3, 'c0000000-0000-0000-0000-000000000001', 'ordinary', true),
  ('c4000000-0000-0000-0000-000000000001', 'Title IV — Final Provisions', 'title', 'active', 4, 'c0000000-0000-0000-0000-000000000001', 'reinforced', true);

-- Title II/III placeholder content
UPDATE laws SET
  summary = 'Executable laws describing the democratic kernel.',
  content = 'Executable laws describing the democratic kernel: voting mechanics, identity tiers, delegation resolution, law lifecycle, election procedures, and conflict resolution. To be written when the code is stable.'
WHERE id = 'c2000000-0000-0000-0000-000000000001';

UPDATE laws SET
  summary = 'Executable laws describing the interface layer.',
  content = 'Executable laws describing the interface layer: feed behavior, discussion rules, notification systems, moderation procedures, and content policies. To be written when the code is stable.'
WHERE id = 'c3000000-0000-0000-0000-000000000001';

-- 5. Title I Articles (Art. 1-10)
INSERT INTO laws (id, title, article_number, content, simplified_content, law_type, status, order_index, parent_id, lock_category, is_active) VALUES
('c1000000-0000-0000-0000-000000000a01', 'Nature of Pangea', 'Art. 1',
  E'1. Pangea is a digital platform for democratic self-governance, open to all of humanity.\n\n2. Pangea is not a state, a nation, or a government. It is the infrastructure through which any form of democratic governance may emerge.\n\n3. Pangea does not impose any ideology, religion, economic model, or political system. The platform provides the tools; the substance is determined by the citizens and communities that use them.',
  'Pangea is a digital tool for democracy, open to everyone. It is not a government — it provides the infrastructure, and citizens decide how to use it.',
  'article', 'active', 1, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a02', 'Citizenship', 'Art. 2',
  E'1. Any natural person aged 18 or older may become a citizen of Pangea by registering on the platform and accepting this Constitution.\n\n2. Citizenship is voluntary and may be relinquished at any time without penalty.\n\n3. Citizenship grants the right to: vote on laws and proposals, propose legislation, delegate votes, stand for election, and create or join groups.\n\n4. Every citizen has two profiles: a private profile and a public profile. The private profile is the default. The public profile activates when the citizen accepts delegations or assumes leadership of a group. Both profiles have independent settings that the citizen controls.\n\n5. No citizen may be compelled to reveal their identity, their activity, or any personal data. The citizen alone decides what is visible and to whom.',
  'Anyone 18+ can join Pangea. You get two profiles: private (default) and public (activates when you accept delegations or lead a group). You control what is visible about you.',
  'article', 'active', 2, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a03', 'Privacy and Anonymity', 'Art. 3',
  E'1. Privacy and anonymity are primary rights in Pangea. They take precedence over transparency, traceability, and any other interest except where this Constitution explicitly states otherwise.\n\n2. All personal data, communications, and metadata are encrypted. No one — not the platform, not its administrators, not other citizens — may access a citizen''s data without their explicit consent.\n\n3. Citizens are the sole and sovereign owners of their data. Every citizen has the right to access, rectify, and permanently delete any data collected about them.\n\n4. The platform''s algorithms and code are open-source and auditable. No opaque system may influence what citizens see, how content is ranked, or how governance operates.',
  'Privacy comes first. All your data is encrypted. Nobody can access it without your permission. You own your data and can delete it anytime. The platform code is open-source.',
  'article', 'active', 3, 'c1000000-0000-0000-0000-000000000001', 'reinforced', true),

('c1000000-0000-0000-0000-000000000a04', 'Groups', 'Art. 4',
  E'1. The fundamental organizational unit of Pangea is the group. Groups may take any form citizens conceive: jurisdictions, parties, communities, working groups, or anything else.\n\n2. Groups are organized in a recursive tree structure. Pangea itself is the root node.\n\n3. Every group may create sub-groups, establish its own laws within its scope, and govern its internal affairs autonomously, provided these do not conflict with this Constitution or with the laws of any ancestor group.\n\n4. Groups may be completely private. In a private group, no one outside the group can see its members, deliberations, or activity. Admission requires acceptance by a member with the appropriate authority. Pangea root is the only group that cannot be private.\n\n5. Groups may receive delegations from citizens. The group''s founder (or founders) decide in the group''s settings who within the group is authorized to exercise delegated votes. Delegation power is split equally among all authorized holders. Groups are always public in the actions they perform with delegated votes.\n\n6. All groups at the same level of the tree are equal in status and rights.',
  'Groups are how citizens organize — they can be anything (parties, communities, etc.). They form a tree structure with Pangea as root. Groups can be private, receive delegations, and govern themselves.',
  'article', 'active', 4, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a05', 'Fundamental Rights', 'Art. 5',
  E'1. Every citizen is treated with dignity and respect. Governance decisions, laws, and interactions on the platform must be compatible with this principle.\n\n2. All citizens are equal before the law. Discrimination on any basis is prohibited.\n\n3. Every citizen has the right to freedom of thought, conscience, and expression. No citizen may be silenced or excluded from governance without due process.\n\n4. The limits of expression are: incitement to violence and harassment. These are not protected. All other content moderation is within the competence of each group, through its democratically elected moderators.\n\n5. Every citizen has the right to participate in governance without economic prerequisites. No fee, deposit, or token may be required to vote, propose, or stand for election — unless established by a law enacted through the democratic process defined in this Constitution.',
  'Every citizen has dignity, equality, and freedom of expression. Only incitement to violence and harassment are banned. Moderators are elected. Participating in governance is free.',
  'article', 'active', 5, 'c1000000-0000-0000-0000-000000000001', 'reinforced', true),

('c1000000-0000-0000-0000-000000000a06', 'Right to Leave', 'Art. 6',
  E'1. Participation in Pangea is entirely voluntary. Any citizen may leave the platform, any group, or any process at any time and for any reason.\n\n2. Any delegation may be revoked at any time with immediate effect.\n\n3. No group or governance body may prevent a citizen from leaving or impose penalties for departure.',
  'You can leave Pangea, any group, or revoke any delegation at any time. No one can stop you or penalize you for leaving.',
  'article', 'active', 6, 'c1000000-0000-0000-0000-000000000001', 'reinforced', true),

('c1000000-0000-0000-0000-000000000a07', 'Liquid Democracy', 'Art. 7',
  E'1. Pangea operates on the principles of liquid democracy, combining direct and delegated voting.\n\n2. Every citizen possesses one vote on every legislative matter within their scope. This vote may be cast directly or delegated to another citizen or to a group.\n\n3. Delegation may be general (applying to all matters) or specific (limited to certain domains). A citizen may delegate different domains to different proxies.\n\n4. Delegation is transitive: if Citizen A delegates to Citizen B, and B delegates to C, then C votes with the combined weight — unless a delegator has restricted transitivity.\n\n5. Delegation requires the consent of the delegate. When a citizen accepts a delegation, their public profile activates and the actions they perform as proxy are publicly visible. This is the price of trust.\n\n6. Delegations apply to both legislative votes and elections.\n\n7. A delegation expires after 180 days of inactivity by the delegating citizen.',
  'You can vote directly or delegate your vote to someone you trust. Delegation can be general or per-topic, and is transitive. Delegates must consent and become publicly visible. Delegations expire after 180 days of inactivity.',
  'article', 'active', 7, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a08', 'The Legislative System', 'Art. 8',
  E'1. Legislative power belongs to the citizens. Citizens exercise it through the Agora, the platform''s deliberation and voting space, available at every level of the tree.\n\n2. Any citizen may propose legislation within the appropriate scope.\n\n3. Laws are organized in four tiers, each with its own approval threshold and quorum:\n   - Constitutional Principles (this Title): 90% approval, 60% quorum of active citizens.\n   - Core Protocol (Title II): 80% approval, 50% quorum. Double vote with trial period.\n   - Platform Protocol (Title III): 66% approval, 40% quorum. Double vote with trial period.\n   - Ordinary laws: 50%+1 approval, 30% quorum. Single vote.\n\n4. Active citizen means: a citizen who has accessed the platform within the last 90 days.\n\n5. Quorum has a double requirement: a minimum number of unique individuals voting, and a threshold on total vote weight (including delegations).\n\n6. During an active vote, individual vote breakdowns are hidden to prevent herding. Only turnout is visible. Results are revealed when voting closes.',
  'Citizens make laws through the Agora. Four tiers exist: Constitutional (90%), Core Protocol (80%), Platform Protocol (66%), Ordinary (50%+1). Vote breakdowns are hidden during voting to prevent herding.',
  'article', 'active', 8, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a09', 'Architecture', 'Art. 9',
  E'1. Pangea''s technical architecture is divided into two layers:\n   - Core: the democratic kernel — voting, identity, delegations, laws, elections. Immutable except through the legislative process. All critical computations happen server-side.\n   - Edge: the interface layer — feed, discussions, comments, notifications. A lens for reading Core data. Edge never has veto power over Core.\n\n2. No Edge component may alter, filter, or suppress Core data. The Agora feed is deterministic — never influenced by opaque algorithms.\n\n3. The specific rules governing Core and Edge are defined in Titles II and III of this Constitution.',
  'The platform has two layers: Core (voting, laws, elections — cannot be manipulated) and Edge (feed, discussions — just a lens). The feed is never influenced by hidden algorithms.',
  'article', 'active', 9, 'c1000000-0000-0000-0000-000000000001', NULL, true),

('c1000000-0000-0000-0000-000000000a10', 'The Guardian', 'Art. 10',
  E'1. In its founding phase, Pangea is governed by a Guardian — the founder of the platform.\n\n2. The Guardian has the authority to promulgate this Constitution, seed initial data, and protect the integrity of the platform while the community is small.\n\n3. The Guardian''s powers have a sunset clause: they diminish progressively as the community grows and elects its own representatives. The specific conditions for sunset are defined by law.\n\n4. Once the Guardian cedes all powers, this Constitution becomes modifiable exclusively through the democratic procedures defined herein. No individual may ever again hold Guardian-level authority unless granted by unanimous decision of the citizenry.',
  'During bootstrap, a Guardian (the founder) protects the platform. Their powers diminish as the community grows. Once ceded, no one can ever hold that power again unless by unanimous vote.',
  'article', 'active', 10, 'c1000000-0000-0000-0000-000000000001', NULL, true);

-- 6. Title IV Articles (Art. 11-13)
INSERT INTO laws (id, title, article_number, content, simplified_content, law_type, status, order_index, parent_id, lock_category, is_active) VALUES
('c4000000-0000-0000-0000-000000000a11', 'Amendment Procedure', 'Art. 11',
  E'1. This Constitution may be amended by the will of the citizenry. No provision is permanently immutable — but the most foundational provisions are protected by demanding procedures.\n\n2. Standard amendments (provisions not marked REINFORCED): follow the threshold of the tier they belong to (Art. 8.3), with a minimum debate period of 30 days before voting.\n\n3. Reinforced amendments (provisions marked REINFORCED):\n   - Minimum 90 days of public debate before the first vote.\n   - First vote: 90% approval required.\n   - Mandatory cooling period of 30 days.\n   - Second vote: 90% approval required to confirm.\n\n4. The reinforced procedure exists to ensure that changes to Pangea''s most fundamental provisions reflect deep, sustained consensus — not a momentary impulse.',
  'The Constitution can be changed, but foundational provisions (marked REINFORCED) require 90 days debate, two rounds of 90% approval, and a 30-day cooling period between votes.',
  'article', 'active', 1, 'c4000000-0000-0000-0000-000000000001', 'reinforced', true),

('c4000000-0000-0000-0000-000000000a12', 'Reinforced Provisions', 'Art. 12',
  E'The following provisions are subject to the reinforced amendment procedure:\n\n- Art. 3 — Privacy and Anonymity\n- Art. 5.1–5.2 — Dignity and Equality\n- Art. 6 — Right to Leave\n- Art. 11.3 — The reinforced amendment procedure itself\n- Art. 12 — This article\n\nThese provisions represent the core identity of Pangea. They can be changed — because no generation should be bound by the choices of a previous one — but only through extraordinary consensus.',
  'These articles are extra-protected: Privacy (Art. 3), Dignity & Equality (Art. 5.1-5.2), Right to Leave (Art. 6), the reinforced procedure itself (Art. 11.3), and this list (Art. 12).',
  'article', 'active', 2, 'c4000000-0000-0000-0000-000000000001', 'reinforced', true),

('c4000000-0000-0000-0000-000000000a13', 'Entry into Force', 'Art. 13',
  E'1. This Constitution is promulgated by the Guardian in the founding phase of Pangea.\n\n2. It enters into force immediately upon promulgation.\n\n3. When the Guardian''s powers sunset, this Constitution continues in force and becomes modifiable exclusively through the procedures of Art. 11.',
  'This Constitution was promulgated by the Guardian and is in force now. When the Guardian steps down, only the democratic procedures of Art. 11 can change it.',
  'article', 'active', 3, 'c4000000-0000-0000-0000-000000000001', NULL, true);

-- 7. ELECTED-MODERATORS: Update change_group_member_role to block manual moderator assignment
-- Per Art. 5.4 LUX v2: moderators must be democratically elected
CREATE OR REPLACE FUNCTION change_group_member_role(
  p_group_id UUID,
  p_target_member_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_target_role TEXT;
  v_actor_weight INT;
  v_target_weight INT;
  v_new_weight INT;
  v_role_weights JSONB := '{
    "founder": 0, "co_founder": 1, "president": 2, "vice_president": 3,
    "admin": 4, "moderator": 5, "secretary": 6, "treasurer": 7,
    "member": 8, "observer": 9
  }'::JSONB;
  v_can_assign TEXT[] := ARRAY['founder', 'co_founder', 'president', 'admin'];
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF NOT (v_role_weights ? p_new_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ROLE');
  END IF;

  -- Art. 5.4 LUX v2: moderators can only be elected, never manually assigned
  IF p_new_role = 'moderator' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MODERATOR_MUST_BE_ELECTED');
  END IF;

  SELECT role INTO v_actor_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_actor_id;

  IF v_actor_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_A_MEMBER');
  END IF;

  IF NOT (v_actor_role = ANY(v_can_assign)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_PERMISSION');
  END IF;

  SELECT role INTO v_target_role
  FROM group_members
  WHERE id = p_target_member_id AND group_id = p_group_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_NOT_FOUND');
  END IF;

  v_actor_weight := (v_role_weights ->> v_actor_role)::INT;
  v_target_weight := (v_role_weights ->> v_target_role)::INT;
  v_new_weight := (v_role_weights ->> p_new_role)::INT;

  IF v_target_weight <= v_actor_weight THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_OUTRANKS_YOU');
  END IF;

  IF p_new_role = 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_ASSIGN_FOUNDER');
  END IF;

  IF p_new_role = 'co_founder' AND v_actor_role != 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ONLY_FOUNDER_CAN_ASSIGN_COFOUNDER');
  END IF;

  IF v_new_weight <= v_actor_weight THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_ASSIGN_HIGHER_ROLE');
  END IF;

  UPDATE group_members
  SET role = p_new_role
  WHERE id = p_target_member_id AND group_id = p_group_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_target_member_id,
    'old_role', v_target_role,
    'new_role', p_new_role
  );
END;
$$;
