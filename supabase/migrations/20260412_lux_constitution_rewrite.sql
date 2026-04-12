-- LUX-REWRITE: Delete old laws + insert new Constitution structure
-- Decision: Francesco 2026-04-12
-- Titolo I (Principles) + Titolo IV (Final Provisions) = full content from Charter
-- Titolo II (Core Protocol) + Titolo III (Platform Protocol) = placeholders (executable laws, to be completed when code is stable)

BEGIN;

-- 1. Delete ALL existing laws (176 old LUX + satellite codes)
DELETE FROM laws;

-- 2. Insert new Constitution LUX
DO $$
DECLARE
  v_constitution_id uuid;
  v_title1_id uuid;
  v_title2_id uuid;
  v_title3_id uuid;
  v_title4_id uuid;
  v_ch1_id uuid;
  v_ch2_id uuid;
  v_ch3_id uuid;
  v_ch4_id uuid;
BEGIN

  -- ROOT: Constitution of Pangea
  INSERT INTO laws (id, parent_id, title, summary, content, code, article_number, order_index, law_type, status, is_active, lock_category, bootstrap_lock_threshold)
  VALUES (gen_random_uuid(), NULL,
    'Constitution of Pangea (LUX)',
    'The supreme and foundational law of the Pangea platform, establishing the rules of democratic governance, fundamental rights, and the constitutional framework within which all communities operate.',
    'This Constitution is organized in four Titles with differentiated protection levels. Title I contains the foundational principles and rights (declarative, requiring 90% approval and 60% quorum to amend). Title II describes the Core Protocol (executable laws mirroring platform core code, requiring 80%/50%). Title III describes the Platform Protocol (executable laws for platform features, requiring 66%/40%). Title IV contains final provisions including amendment procedures.',
    'LUX', NULL, 0, 'code', 'active', true, 'reinforced', 1000)
  RETURNING id INTO v_constitution_id;

  -- ═══════════════════════════════════════════════════════════════
  -- TITLE I: Fundamental Principles (declarative, 90%/60%)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active, lock_category)
  VALUES (gen_random_uuid(), v_constitution_id,
    'Title I — Fundamental Principles',
    'The foundational principles, rights, legislative framework, and architecture of law. Declarative provisions requiring 90% approval and 60% quorum to amend.',
    'LUX-I', 1, 'title', 'active', true, 'reinforced')
  RETURNING id INTO v_title1_id;

  -- Chapter I: The Platform and Its Principles
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active)
  VALUES (gen_random_uuid(), v_title1_id,
    'Chapter I — The Platform and Its Principles',
    'Defines the nature, principles, neutrality, citizenship model, group structure, and universal identification system of Pangea.',
    'LUX-I-1', 1, 'chapter', 'active', true)
  RETURNING id INTO v_ch1_id;

  -- Art. 1 — Nature of Pangea
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch1_id,
    'Nature of Pangea',
    'Pangea is a digital platform for democratic self-governance, open to all of humanity.',
    E'1. Pangea is a digital platform for democratic self-governance, open to all of humanity.\n\n2. Pangea exists as a neutral space where individuals and communities can organize, deliberate, and create laws that govern their collective life. It is not a state, a nation, or a government — it is the infrastructure through which any form of democratic governance may emerge.\n\n3. Pangea is founded upon the conviction that all people deserve access to the tools of self-governance, and that no system of collective coexistence can function without a shared framework of rules freely chosen by those who live under them.',
    'Pangea is a digital tool where people can govern themselves democratically. It''s not a country — it''s the infrastructure for any community to create and vote on their own rules.',
    'LUX-I-1', 'Art. 1', 1, 'article', 'active', true);

  -- Art. 2 — Foundational Principles ⟨REINFORCED⟩
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active, lock_category)
  VALUES (v_ch1_id,
    'Foundational Principles',
    'The eight core principles guiding all of Pangea: democratic governance, equal participation, transparency, voluntary association, human dignity, rule of law, openness, and pluralism.',
    E'Pangea is founded upon and shall always be guided by the following principles:\n\n• Democratic governance: all power flows from the citizens.\n• Equal participation: every citizen has an equal voice.\n• Transparency: all governance activity is public and verifiable.\n• Voluntary association: no one is compelled to participate.\n• Human dignity: every person is treated with respect.\n• Rule of law: the same rules apply to everyone, without exception.\n• Openness: the platform is open to all people and all ideas that do not seek to destroy the platform itself.\n• Pluralism: the coexistence of different visions, models, and communities is a strength, not a problem.\n\nThese principles shall guide the interpretation of this Constitution and all laws derived therefrom. They are subject to the reinforced amendment procedure defined in Title IV.',
    'Pangea is built on 8 principles: democracy, equality, transparency, voluntary participation, dignity, rule of law, openness, and pluralism. Changing these requires the hardest procedure.',
    'LUX-I-1', 'Art. 2', 2, 'article', 'active', true, 'reinforced');

  -- Art. 3 — Neutrality of the Platform
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch1_id,
    'Neutrality of the Platform',
    'Pangea does not impose any ideology. Root-level laws concern only platform functioning, rights protection, and democratic process integrity.',
    E'1. Pangea does not impose any ideology, religion, economic model, or political system upon its citizens. The platform provides the tools for democratic governance; the substance of laws is determined by the communities that create them.\n\n2. No group, party, or jurisdiction within Pangea may claim to represent the platform itself or to speak in its name, unless expressly authorized by this Constitution.\n\n3. The root-level laws of Pangea shall concern themselves exclusively with the functioning of the platform, the protection of fundamental rights, and the integrity of the democratic process. All other matters are within the sovereign competence of the groups and jurisdictions created by citizens.',
    'Pangea is neutral — it doesn''t push any ideology. The platform provides governance tools; communities decide the content of their laws. Only root-level laws govern the platform itself.',
    'LUX-I-1', 'Art. 3', 3, 'article', 'active', true);

  -- Art. 4 — Citizenship
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch1_id,
    'Citizenship',
    'Anyone can become a citizen by registering and accepting the Constitution. Citizenship is voluntary and grants governance rights.',
    E'1. Any natural person may become a citizen of Pangea by registering on the platform and accepting this Constitution.\n\n2. Citizenship is voluntary and may be relinquished at any time without penalty.\n\n3. Citizenship grants the right to participate in governance: to vote, to propose laws, to delegate votes, to stand for election, and to create or join groups.\n\n4. Citizenship shall not be denied on any discriminatory basis as defined in Art. 8.\n\n5. Citizenship entails the responsibility to respect this Constitution and to engage with the governance process in good faith.',
    'Anyone can become a Pangea citizen by signing up. You can leave anytime. Being a citizen means you can vote, propose laws, run for positions, and join groups.',
    'LUX-I-1', 'Art. 4', 4, 'article', 'active', true);

  -- Art. 5 — Groups
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch1_id,
    'Groups',
    'Groups are the fundamental organizational unit, organized in a recursive tree structure with Pangea as root.',
    E'1. The fundamental organizational unit of Pangea is the Group. Groups may be of any type: jurisdictions, political parties, communities, working groups, or any other form citizens may conceive.\n\n2. Groups are organized in a recursive tree structure. Pangea itself is the root node of this tree.\n\n3. Every group may create sub-groups, establish its own laws within its scope, and govern its internal affairs autonomously, provided these do not conflict with this Constitution or with the laws of any ancestor group in the tree.\n\n4. All groups at the same level of the tree are equal in status and rights. No group type is inherently superior to another.\n\n5. Groups may register formal links with other groups at the same level — for instance, a political party may declare its affiliation with a jurisdiction it seeks to represent. Such links are public, voluntary, and carry no automatic legal effect unless established by law.',
    'Groups are how people organize on Pangea — they can be countries, parties, communities, anything. They form a tree: every group can have sub-groups, and all groups at the same level are equal.',
    'LUX-I-1', 'Art. 5', 5, 'article', 'active', true);

  -- Art. 6 — Universal Entity Identification
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch1_id,
    'Universal Entity Identification',
    'Every entity in Pangea receives a permanent unique identifier (UID) for traceability and transparency.',
    E'1. Every entity in Pangea — citizens, groups, laws, proposals, discussions, elections, posts — receives a permanent unique identifier (UID) at the moment of creation.\n\n2. UIDs ensure traceability, transparency, and accountability across the entire platform.\n\n3. UIDs are permanent and may not be reassigned or deleted. The entity they reference may change status, but the identifier persists as part of Pangea''s historical record.',
    'Everything on Pangea gets a permanent ID number — people, groups, laws, votes. These IDs can never be reused or deleted, creating a permanent record.',
    'LUX-I-1', 'Art. 6', 6, 'article', 'active', true);

  -- Chapter II: Fundamental Rights
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active)
  VALUES (gen_random_uuid(), v_title1_id,
    'Chapter II — Fundamental Rights',
    'The inviolable rights of every Pangea citizen: dignity, equality, expression, privacy, participation, information, right to leave, protection of minors, and fair process.',
    'LUX-I-2', 2, 'chapter', 'active', true)
  RETURNING id INTO v_ch2_id;

  -- Art. 7 — Human Dignity ⟨REINFORCED⟩
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active, lock_category)
  VALUES (v_ch2_id,
    'Human Dignity',
    'Human dignity is inviolable and must be respected in all interactions and governance decisions.',
    'Human dignity is inviolable. It shall be respected and protected in all interactions on the platform. Every governance decision, every law, and every action by any group or citizen must be compatible with this principle.',
    'Everyone must be treated with dignity. This is the most fundamental rule — every law and decision must respect it.',
    'LUX-I-2', 'Art. 7', 1, 'article', 'active', true, 'reinforced');

  -- Art. 8 — Equality and Non-Discrimination
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Equality and Non-Discrimination',
    'All citizens are equal before the law. Discrimination on any ground is prohibited.',
    E'1. All citizens are equal before the law.\n\n2. Discrimination based on sex, race, color, ethnic or social origin, genetic features, language, religion or belief, political or any other opinion, national origin, property, birth, disability, age, sexual orientation, gender identity, or any other ground is prohibited.\n\n3. Equality between all genders shall be ensured. The principle of equality shall not prevent measures providing for specific advantages in favor of the underrepresented.',
    'Everyone is equal on Pangea. No discrimination of any kind is allowed. Positive measures to help underrepresented groups are permitted.',
    'LUX-I-2', 'Art. 8', 2, 'article', 'active', true);

  -- Art. 9 — Freedom of Thought and Expression
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Freedom of Thought and Expression',
    'Every citizen has the right to freedom of thought, conscience, religion, and expression, with responsibilities.',
    E'1. Every citizen has the right to freedom of thought, conscience, religion, and expression.\n\n2. This right includes the freedom to hold opinions, to receive and impart information, and to participate in public debate without interference.\n\n3. No citizen may be silenced, censored, or excluded from governance without due process as defined by law.\n\n4. The exercise of this freedom carries with it responsibilities: incitement to violence, harassment, and deliberate disinformation intended to undermine the democratic process are not protected expression.',
    'You can think, believe, and say what you want on Pangea. But incitement to violence, harassment, and deliberate disinformation are not protected.',
    'LUX-I-2', 'Art. 9', 3, 'article', 'active', true);

  -- Art. 10 — Right to Privacy and Data Sovereignty
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Right to Privacy and Data Sovereignty',
    'Citizens own their data. All algorithms are transparent and open-source. Right to encryption.',
    E'1. Every citizen has the right to respect for their private life and communications.\n\n2. Every citizen is the sovereign owner of their personal data. Personal data must be processed fairly, for specified purposes, and only on the basis of consent or a legitimate basis laid down by law.\n\n3. Every citizen has the right to access, rectify, and erase data collected about them.\n\n4. All algorithms used by the platform shall be transparent, open-source, and auditable by the citizenry.\n\n5. Every citizen has the right to use encryption to secure their communications and to control the degree of visibility of their identity and activity on the platform, within the limits established by law.',
    'Your data belongs to you. You can see, fix, or delete it. All platform algorithms are open-source and auditable. You can use encryption.',
    'LUX-I-2', 'Art. 10', 4, 'article', 'active', true);

  -- Art. 11 — Right to Participate ⟨REINFORCED⟩
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active, lock_category)
  VALUES (v_ch2_id,
    'Right to Participate',
    'Every citizen has the right to vote, propose legislation, delegate, stand for election, and join groups. No economic prerequisites.',
    E'1. Every citizen has the right to vote on laws and proposals, to propose legislation, to delegate their vote, to stand for any elected position, and to create or join any group.\n\n2. No citizen may be denied the exercise of their political rights on any basis other than the lawful procedures established by this Constitution.\n\n3. No economic condition, group membership, or social status may be used as a prerequisite for participation in governance.',
    'Every citizen can vote, propose laws, delegate, run for office, and join groups. Nobody can be excluded for economic or social reasons.',
    'LUX-I-2', 'Art. 11', 5, 'article', 'active', true, 'reinforced');

  -- Art. 12 — Right to Information and Transparency
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Right to Information and Transparency',
    'All governance activity is public. Every citizen can access documents and records. Transparency is the default.',
    E'1. All laws, votes, proposals, and governance decisions shall be public and accessible.\n\n2. Every citizen has a right of access to documents and records of any governance body operating within Pangea.\n\n3. Transparency is the default. Restrictions on access are permissible only to protect individual privacy and must be established by law.',
    'Everything on Pangea is public by default — laws, votes, proposals, decisions. Privacy restrictions are only allowed to protect individuals.',
    'LUX-I-2', 'Art. 12', 6, 'article', 'active', true);

  -- Art. 13 — Right to Leave ⟨REINFORCED⟩
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active, lock_category)
  VALUES (v_ch2_id,
    'Right to Leave',
    'Participation is voluntary. Any citizen may leave at any time without penalty.',
    E'1. Participation in Pangea is entirely voluntary. Any citizen may leave the platform at any time and for any reason.\n\n2. Any citizen may leave any group, revoke any delegation, or withdraw from any process at any time.\n\n3. No group, jurisdiction, or governance body may prevent a citizen from leaving or impose penalties for departure.',
    'You can leave Pangea, any group, or any process at any time. Nobody can stop you or punish you for leaving.',
    'LUX-I-2', 'Art. 13', 7, 'article', 'active', true, 'reinforced');

  -- Art. 14 — Protection of Minors
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Protection of Minors',
    'Children have the right to protection. Their best interests are the primary consideration.',
    E'1. Children shall have the right to protection and care appropriate to their well-being.\n\n2. In all actions relating to minors, the child''s best interests shall be the primary consideration.\n\n3. The conditions under which minors may participate in governance shall be established by law, with appropriate safeguards.',
    'Children are protected on Pangea. Their well-being always comes first. Specific rules for minors'' participation will be established by law.',
    'LUX-I-2', 'Art. 14', 8, 'article', 'active', true);

  -- Art. 15 — Right to a Fair Process
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch2_id,
    'Right to a Fair Process',
    'Every citizen has the right to fair, impartial dispute resolution and to be heard before decisions affecting them.',
    E'1. Every citizen has the right to have disputes resolved fairly, impartially, and within a reasonable time.\n\n2. Every citizen has the right to be heard before any governance decision that directly affects their rights.\n\n3. The specific mechanisms for dispute resolution — whether courts, arbitration, or community processes — are within the competence of each jurisdiction to establish.',
    'If there''s a dispute, you have the right to a fair process. You must be heard before any decision that affects your rights.',
    'LUX-I-2', 'Art. 15', 9, 'article', 'active', true);

  -- Chapter III: The Legislative System
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active)
  VALUES (gen_random_uuid(), v_title1_id,
    'Chapter III — The Legislative System',
    'How laws are made: legislative power belongs to citizens, exercised through liquid democracy with direct and delegated voting.',
    'LUX-I-3', 3, 'chapter', 'active', true)
  RETURNING id INTO v_ch3_id;

  -- Art. 16 — Legislative Power
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch3_id,
    'Legislative Power',
    'Legislative power belongs to citizens, exercised through the Agora. Groups and parties advocate but do not vote as entities.',
    E'1. Within any scope of Pangea — whether the root level or any group — legislative power belongs to its citizens.\n\n2. Citizens exercise this power through the Agora, the platform''s deliberation and voting space. The Agora is available at every level: root, jurisdiction, party, community.\n\n3. Every citizen participates and votes in their individual capacity. Groups and parties may advocate for positions, publish manifestos, and coordinate campaigns, but they do not possess voting power as entities.',
    'Only people vote — not groups or parties. Every community has its own Agora where citizens deliberate and vote on their laws.',
    'LUX-I-3', 'Art. 16', 1, 'article', 'active', true);

  -- Art. 17 — Liquid Democracy
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch3_id,
    'Liquid Democracy',
    'Combines direct and delegated voting. Delegation is general or specific, transitive, revocable, and requires consent.',
    E'1. Pangea operates on the principles of liquid democracy, combining direct and delegated voting.\n\n2. Every citizen possesses one vote on every legislative matter within their scope. This vote may be cast directly or delegated to another citizen as a proxy.\n\n3. Delegation may be general (applying to all matters) or specific (limited to certain domains or topics). A citizen may delegate different domains to different proxies.\n\n4. Delegation is transitive: if Citizen A delegates to Citizen B, and Citizen B delegates to Citizen C, then Citizen C votes with the combined weight — unless a delegator has restricted transitivity.\n\n5. Any delegation may be revoked at any time and for any reason, with immediate effect.\n\n6. Individual votes shall be cryptographically secured and private. The voting records of proxies acting on behalf of delegators shall be public, to ensure accountability.\n\n7. Delegation requires the consent of the delegate. No citizen can be forced to carry another''s vote.',
    'You can vote directly or delegate your vote to someone you trust. Delegation can be general or topic-specific, and you can take it back anytime. Your vote is private; delegates'' votes are public.',
    'LUX-I-3', 'Art. 17', 2, 'article', 'active', true);

  -- Art. 18 — Legislative Procedure
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch3_id,
    'Legislative Procedure',
    'Any citizen may propose legislation. Proposals go through curation, then voting. Different majorities for ordinary vs structural laws.',
    E'1. Any citizen may propose legislation within the appropriate scope — either at the root level or within a group of which they are a member.\n\n2. A proposal enters a curation phase: it must secure a predetermined threshold of support signals from fellow citizens before proceeding to formal debate and voting. The threshold is calculated dynamically based on the size of the community.\n\n3. Ordinary laws require a simple majority (>50%) of all votes cast for adoption, amendment, or repeal.\n\n4. Structural laws — those defining the organization of governance bodies, the creation of new group types, or the fundamental rules of a jurisdiction — require a three-fifths majority (60%) for adoption, amendment, or repeal.\n\n5. Amendments to this Constitution are governed exclusively by Title IV.\n\n6. Every adopted law receives a UID and enters the Living Codes system (Art. 22).',
    'Anyone can propose a law. It first needs community support (curation), then goes to a vote. Regular laws need >50%, structural laws need 60%. Constitutional changes follow special rules.',
    'LUX-I-3', 'Art. 18', 3, 'article', 'active', true);

  -- Art. 19 — Electoral Systems
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch3_id,
    'Electoral Systems',
    'Voters distribute 100% of their voting power among chosen candidates. Specific rules set by each jurisdiction.',
    E'1. In elections for positions within the governance structure, voters may support multiple candidates.\n\n2. Each voter has 100% of their voting power to distribute among their chosen candidates as they see fit.\n\n3. The specific rules for elections — candidacy requirements, terms, recall procedures — are within the competence of each jurisdiction or group to establish, provided they respect this Constitution.',
    'In elections, you spread your voting power across candidates however you want. Each group sets its own election rules, as long as they respect this Constitution.',
    'LUX-I-3', 'Art. 19', 4, 'article', 'active', true);

  -- Art. 20 — Scope of Laws
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch3_id,
    'Scope of Laws',
    'Root laws apply to all Pangea. Group laws apply only within that group. No child law may contradict a parent law.',
    E'1. Laws enacted at the root level apply to all of Pangea.\n\n2. Laws enacted within a group apply only to that group and its sub-groups.\n\n3. No group law may contradict a law of its parent group, or of any ancestor group, or of this Constitution.\n\n4. In case of conflict between laws of groups at the same level, each law applies only within its own group. Citizens who belong to multiple groups are subject to the laws of each, within that group''s scope. Where genuine conflict arises, the mechanisms of Art. 23 apply.',
    'Root-level laws apply everywhere. Group laws only apply inside that group. A group''s laws can never contradict its parent group''s laws or this Constitution.',
    'LUX-I-3', 'Art. 20', 5, 'article', 'active', true);

  -- Chapter IV: Architecture of Law
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active)
  VALUES (gen_random_uuid(), v_title1_id,
    'Chapter IV — Architecture of Law',
    'Hierarchy of norms, Living Codes system, group autonomy, conflict resolution, and accessibility of law.',
    'LUX-I-4', 4, 'chapter', 'active', true)
  RETURNING id INTO v_ch4_id;

  -- Art. 21 — Hierarchy of Norms
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch4_id,
    'Hierarchy of Norms',
    'This Constitution is supreme. Root-level laws are subordinate only to it. Group laws are subordinate to root laws.',
    E'1. This Constitution is the supreme law of Pangea. All other laws, decisions, and actions must conform to it.\n\n2. Root-level laws — enacted by the full citizenry — are subordinate only to this Constitution.\n\n3. Group laws — enacted within a jurisdiction, party, or community — are subordinate to root-level laws and to this Constitution.\n\n4. Any law or decision found to conflict with a higher norm shall be declared void through the processes established by law.',
    'The Constitution is the highest law. Root laws come next. Group laws come last. Any law that contradicts a higher law is void.',
    'LUX-I-4', 'Art. 21', 1, 'article', 'active', true);

  -- Art. 22 — Living Codes
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch4_id,
    'Living Codes',
    'All laws are organized in version-controlled, publicly accessible digital compilations with full change history.',
    E'1. All laws of Pangea — at every level — shall be organized in continuously updated, version-controlled, and publicly accessible digital compilations known as Living Codes.\n\n2. Living Codes shall be maintained in both human-readable and machine-readable formats.\n\n3. Every change to a law is permanently recorded with full history, attribution, and the identifier of the proposal from which it originated.\n\n4. The purpose of Living Codes is to ensure that the law is not only transparent but also comprehensible and accessible to every citizen, regardless of legal expertise.',
    'All laws are kept in "Living Codes" — version-controlled, publicly accessible, with full change history. Like Git for laws. Every change is tracked and attributed.',
    'LUX-I-4', 'Art. 22', 2, 'article', 'active', true);

  -- Art. 23 — Group Autonomy and Conflict Resolution
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch4_id,
    'Group Autonomy and Conflict Resolution',
    'Groups are sovereign in their internal legal system. Diversity of governance models is a feature. Conflicts resolved by root-level mechanisms.',
    E'1. Each group has the sovereign right to organize its internal legal system as it sees fit, within the limits of this Constitution and the laws of its ancestor groups.\n\n2. Groups may establish their own codes, governance bodies, dispute resolution mechanisms, and procedures.\n\n3. The diversity of legal systems within Pangea is a feature, not a defect. The platform enables experimentation and healthy competition between governance models.\n\n4. When a conflict arises between groups at the same level — or between a citizen''s obligations under different groups — the dispute shall be resolved through the conflict resolution mechanisms established by root-level law.',
    'Each group governs itself however it wants, within the Constitution. Different governance models competing is a feature. Cross-group conflicts are resolved by root-level rules.',
    'LUX-I-4', 'Art. 23', 3, 'article', 'active', true);

  -- Art. 24 — Accessibility of Law
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_ch4_id,
    'Accessibility of Law',
    'Laws must be easy to understand. Every law has a simplified summary. Automatic translation to all supported languages.',
    E'1. All laws shall be formulated to be easily comprehensible. Legal language that is unnecessarily complex or obscure defeats the purpose of democratic governance.\n\n2. Every law shall be accompanied by a simplified summary in plain language.\n\n3. The platform shall provide automatic translation of all laws into the languages supported by the platform.',
    'Laws must be written clearly. Every law gets a plain-language summary. The platform translates laws into all supported languages.',
    'LUX-I-4', 'Art. 24', 4, 'article', 'active', true);

  -- ═══════════════════════════════════════════════════════════════
  -- TITLE II: Core Protocol (PLACEHOLDER — executable, 80%/50%)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO laws (id, parent_id, title, summary, content, code, order_index, law_type, status, is_active, lock_category)
  VALUES (gen_random_uuid(), v_constitution_id,
    'Title II — Core Protocol',
    'Executable laws describing the core platform code: authentication, voting engine, group tree, delegation system, and data integrity. Requires 80% approval and 50% quorum with double vote procedure.',
    E'This Title will contain executable laws that describe the platform''s core code at a functional level. These laws are the bridge between democratic decisions and platform behavior — when citizens vote to change a Core Protocol law, the code changes accordingly.\n\nThis Title is currently a placeholder. It will be populated when the core platform code reaches stability, ensuring that each law accurately reflects the actual implementation.\n\nPlanned sections:\n• Chapter I — Identity & Authentication\n• Chapter II — Voting Engine\n• Chapter III — Group Tree & Hierarchy\n• Chapter IV — Delegation System\n• Chapter V — Data Integrity & Cryptography',
    'LUX-II', 2, 'title', 'active', true, 'structural')
  RETURNING id INTO v_title2_id;

  -- ═══════════════════════════════════════════════════════════════
  -- TITLE III: Platform Protocol (PLACEHOLDER — executable, 66%/40%)
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO laws (id, parent_id, title, summary, content, code, order_index, law_type, status, is_active, lock_category)
  VALUES (gen_random_uuid(), v_constitution_id,
    'Title III — Platform Protocol',
    'Executable laws describing platform features: feed algorithm, notifications, moderation tools, UI behavior, and integrations. Requires 66% approval and 40% quorum with double vote procedure.',
    E'This Title will contain executable laws that describe the platform''s feature code at a functional level. These are less critical than Core Protocol but still govern how citizens interact with the platform daily.\n\nThis Title is currently a placeholder. It will be populated when the platform features reach stability.\n\nPlanned sections:\n• Chapter I — Feed & Discovery\n• Chapter II — Notifications & Communication\n• Chapter III — Moderation & Content Policy\n• Chapter IV — User Interface Standards\n• Chapter V — External Integrations',
    'LUX-III', 3, 'title', 'active', true, 'ordinary')
  RETURNING id INTO v_title3_id;

  -- ═══════════════════════════════════════════════════════════════
  -- TITLE IV: Final Provisions
  -- ═══════════════════════════════════════════════════════════════
  INSERT INTO laws (id, parent_id, title, summary, code, order_index, law_type, status, is_active, lock_category)
  VALUES (gen_random_uuid(), v_constitution_id,
    'Title IV — Final Provisions',
    'Amendment procedures, reinforced provisions, technical upgrades, periodic review, ratification, and languages.',
    'LUX-IV', 4, 'title', 'active', true, 'reinforced')
  RETURNING id INTO v_title4_id;

  -- Art. 25 — Amendment Procedure
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_title4_id,
    'Amendment Procedure',
    'Standard amendments: 30 days debate + 66.7% majority. Reinforced amendments: 90 days + two rounds of 75% majority with cooling period.',
    E'1. This Constitution may be amended by the will of the citizenry. No provision is permanently immutable — but the most foundational provisions are protected by increasingly demanding procedures, reflecting the gravity of what would be changed.\n\n2. Standard constitutional amendments (provisions not marked as REINFORCED):\n   • Must be published and open for debate for a minimum of 30 days before voting begins.\n   • Require a two-thirds (66.7%) majority in a special referendum open to all citizens.\n\n3. Reinforced amendments (provisions marked as REINFORCED):\n   • Must be published and open for debate for a minimum of 90 days before the first vote.\n   • Require a three-quarters (75%) majority in a first referendum.\n   • After the first vote passes, a mandatory cooling period of 30 days begins, during which further debate occurs.\n   • A second referendum is then held, again requiring a three-quarters (75%) majority to confirm the amendment.\n   • Only if both votes pass does the amendment take effect.\n\n4. The reinforced procedure exists not to make change impossible, but to ensure that changes to the most fundamental provisions of Pangea reflect the deep, sustained, and overwhelming will of the citizenry — not a momentary impulse.',
    'The Constitution can be changed, but it''s hard on purpose. Regular changes need 66.7% after 30 days of debate. The most important articles need 75% in TWO separate votes with a cooling period.',
    'LUX-IV', 'Art. 25', 1, 'article', 'active', true);

  -- Art. 26 — Reinforced Provisions ⟨REINFORCED⟩
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active, lock_category)
  VALUES (v_title4_id,
    'Reinforced Provisions',
    'Lists which articles require the reinforced amendment procedure: Art. 2, 7, 11, 13, 25.3, and this article itself.',
    E'The following provisions are subject to the reinforced amendment procedure (Art. 25.3):\n\n• Art. 2 — Foundational Principles\n• Art. 7 — Human Dignity\n• Art. 11 — Right to Participate\n• Art. 13 — Right to Leave\n• Art. 25.3 — The reinforced amendment procedure itself\n• Art. 26 — This article itself\n\nThese provisions represent the core identity of Pangea. They can be changed — because no generation should be permanently bound by the choices of a previous one — but only through a process that demands extraordinary consensus and deliberation.',
    'Six articles are extra-protected: Foundational Principles, Human Dignity, Right to Participate, Right to Leave, the reinforced procedure itself, and this list. They need 75% in two votes to change.',
    'LUX-IV', 'Art. 26', 2, 'article', 'active', true, 'reinforced');

  -- Art. 27 — Technical Upgrades
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_title4_id,
    'Technical Upgrades',
    'Software changes that do not alter principles or rights need only a simple majority. In doubt, the stricter procedure applies.',
    E'1. Technical upgrades to the platform — changes to the software, interface, infrastructure, or algorithms — that do not alter the principles, rights, or procedures established by this Constitution may be proposed through a simplified process.\n\n2. Such upgrades require a simple majority (>50%) vote.\n\n3. Whether a proposed change constitutes a technical upgrade or a constitutional amendment shall be determined by the governance mechanisms established by root-level law. In cases of doubt, the stricter amendment procedure applies.',
    'Simple software updates that don''t change the rules only need >50% approval. If it''s unclear whether something is a simple update or a constitutional change, the stricter rules apply.',
    'LUX-IV', 'Art. 27', 3, 'article', 'active', true);

  -- Art. 28 — Periodic Review
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_title4_id,
    'Periodic Review',
    'The Constitution must be reviewed at least every 10 years. Any citizen can petition for review of specific provisions.',
    E'1. This Constitution shall be reviewed at least once every ten years.\n\n2. Any citizen may petition at any time for the review of a specific provision.\n\n3. A review does not imply amendment — it is an opportunity for the citizenry to reaffirm, update, or improve the Constitution through the procedures of Art. 25.',
    'Every 10 years, the Constitution gets reviewed. Anyone can also request a review of specific parts at any time. A review doesn''t mean it changes — just that it gets reconsidered.',
    'LUX-IV', 'Art. 28', 4, 'article', 'active', true);

  -- Art. 29 — Ratification and Entry into Force
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_title4_id,
    'Ratification and Entry into Force',
    'This Constitution enters into force upon approval by a 66.7% majority of founding citizens.',
    E'1. This Constitution shall be submitted to the founding citizens for ratification.\n\n2. It enters into force once approved by a two-thirds (66.7%) majority of founding citizens who participate in the ratification vote.\n\n3. Upon entry into force, it supersedes all previous foundational documents at the root level.',
    'This Constitution becomes active when 66.7% of founding citizens approve it. Once active, it replaces all previous foundational documents.',
    'LUX-IV', 'Art. 29', 5, 'article', 'active', true);

  -- Art. 30 — Languages
  INSERT INTO laws (parent_id, title, summary, content, simplified_content, code, article_number, order_index, law_type, status, is_active)
  VALUES (v_title4_id,
    'Languages',
    'English is the primary working language. All laws are translated to supported languages. English text is authoritative.',
    E'1. The primary working language of Pangea is English.\n\n2. The platform supports multiple languages through its automatic translation system. Every citizen has the right to access the platform and its laws in any supported language.\n\n3. In case of discrepancy between translations, the English text of this Constitution is the authentic and authoritative version.',
    'Pangea works primarily in English but translates everything. If translations disagree, the English version is the official one.',
    'LUX-IV', 'Art. 30', 6, 'article', 'active', true);

END $$;

COMMIT;
