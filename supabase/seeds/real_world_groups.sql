-- =============================================================================
-- SEED: Real-World Groups (IGO, NGO, Political Parties)
-- =============================================================================
-- Created: 2026-04-12
-- Purpose: Archive of real-world groups removed from production DB pending T16
--          (founder verification system). Re-insert when T16 is implemented.
--
-- Usage:   Run this SQL against Supabase after T16 is ready.
--          All groups have founder_id = NULL (no verified founder yet).
--          parent_group_id = '00000000-0000-0000-0000-000000000001' (Pangea Root)
--
-- Count:   11 IGO + 9 NGO + 39 party = 59 groups total
-- =============================================================================

-- -----------------------------------------------------------------------------
-- IGOs (Intergovernmental Organizations)
-- -----------------------------------------------------------------------------
INSERT INTO groups (id, uid, name, description, group_type, logo_emoji, founder_id, parent_group_id, geographic_area_id, settings, locked_settings, is_active)
VALUES
  ('48dbf452-13a8-43d1-a889-48c930fdd9ba', 'GRP-3450d75d', 'BRICS',
   'Intergovernmental organization of major emerging economies. Originally Brazil, Russia, India, China, South Africa — expanded in 2024 to include Egypt, Ethiopia, Iran, Saudi Arabia, and UAE. Represents over 40% of world population.',
   'igo', '🧱', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('12c78391-2981-4cb9-88e8-b29dd87c5b16', 'GRP-c2561e71', 'European Union',
   'Supranational political and economic union of 27 member states in Europe. Established by the Maastricht Treaty in 1993. Features single market, common currency (euro), and shared institutions. Headquartered in Brussels.',
   'igo', '🇪🇺', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('e1c489bb-3afa-4df6-b376-9ef280a1a45a', 'GRP-b49a06bf', 'G20',
   'Group of Twenty. International forum of governments and central bank governors from 19 countries and the EU and AU. Represents about 85% of global GDP. Addresses major issues related to the global economy.',
   'igo', '🌍', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('a652a52a-f5f8-4a67-897f-be74f2407033', 'GRP-d1a381d8', 'G7',
   'Group of Seven. Intergovernmental political and economic forum of seven major advanced economies: Canada, France, Germany, Italy, Japan, United Kingdom, and United States. Holds annual summits to coordinate global policy.',
   'igo', '7️⃣', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('902bb725-64b9-46af-9645-b525a4e1188c', 'GRP-438704cb', 'International Monetary Fund',
   'International financial institution working to foster global monetary cooperation, secure financial stability, facilitate international trade, and reduce poverty. 190 member countries. Headquartered in Washington, D.C.',
   'igo', '💰', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('60ddc301-6398-4697-b768-bdaf5a987161', 'GRP-79db4f02', 'NATO',
   'North Atlantic Treaty Organization. Intergovernmental military alliance of 32 member states from North America and Europe. Founded in 1949 for collective defense. Headquartered in Brussels.',
   'igo', '🛡️', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('27fd2e9a-c5a9-485f-a6bd-9c8b8b0f5e26', 'GRP-23ff79b3', 'UNESCO',
   'United Nations Educational, Scientific and Cultural Organization. Promotes peace through international cooperation in education, sciences, culture, and communication. Manages World Heritage Sites. Headquartered in Paris.',
   'igo', '📚', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('b2570458-b7c5-45f6-a816-b372a571c4af', 'GRP-e2885198', 'United Nations',
   'International organization founded in 1945 to maintain international peace and security, develop friendly relations among nations, and promote social progress. Headquarters in New York City. 193 member states.',
   'igo', '🇺🇳', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('fed462f8-d30f-4003-962e-f32c722c0a47', 'GRP-5de1dec2', 'World Bank',
   'International financial institution providing loans and grants to governments of low- and middle-income countries for capital projects. Founded in 1944, headquartered in Washington, D.C. Part of the World Bank Group.',
   'igo', '🏦', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('b1c8e233-3e75-4013-b357-9e9c7a64e415', 'GRP-b5d2e1fd', 'World Health Organization',
   'Specialized agency of the United Nations responsible for international public health. Founded in 1948, headquartered in Geneva. Coordinates global health responses, sets health standards, and promotes universal health coverage.',
   'igo', '⚕️', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('ea87918d-304e-4ddc-9862-8b7963aa99c8', 'GRP-d48724b1', 'World Trade Organization',
   'Intergovernmental organization regulating and facilitating international trade. Founded in 1995 replacing GATT. 164 member states. Headquartered in Geneva.',
   'igo', '🌐', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true);

-- -----------------------------------------------------------------------------
-- NGOs (Non-Governmental Organizations)
-- -----------------------------------------------------------------------------
INSERT INTO groups (id, uid, name, description, group_type, logo_emoji, founder_id, parent_group_id, geographic_area_id, settings, locked_settings, is_active)
VALUES
  ('862e6ab6-5aed-4464-9f6f-73508f2e18a9', 'GRP-1ad9b675', 'Amnesty International',
   'International NGO focused on human rights. Founded in 1961, campaigns for the protection of human rights worldwide. Nobel Peace Prize laureate (1977). Over 10 million members globally. Headquartered in London.',
   'ngo', '🕯️', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('2eba8037-f0e4-4ea0-a5ac-5f2a8dd0ae65', 'GRP-88d18171', 'CARE International',
   'Major international humanitarian agency delivering emergency relief and long-term development projects. Founded in 1945. Focuses on poverty, social injustice, and empowerment of women and girls. Active in over 100 countries.',
   'ngo', '💛', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('20239d59-6c77-443d-ac35-a8be88b740d9', 'GRP-620874d3', 'Greenpeace',
   'International environmental organization founded in 1971. Uses non-violent direct action and lobbying to campaign for solutions to global environmental problems including climate change, deforestation, and overfishing. Headquartered in Amsterdam.',
   'ngo', '🌿', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('6033dc8f-5cac-4766-9b63-913e048fff88', 'GRP-e359bf00', 'Human Rights Watch',
   'International NGO that conducts research and advocacy on human rights. Founded in 1978 as Helsinki Watch. Publishes annual World Report. Headquartered in New York City.',
   'ngo', '👁️', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('ac536580-305d-4c85-860d-aeec29a6feb3', 'GRP-d4734a7f', 'International Committee of the Red Cross',
   'ICRC. Impartial, neutral, and independent humanitarian organization protecting victims of armed conflict and violence. Founded in 1863 by Henry Dunant. Headquartered in Geneva. Multiple Nobel Peace Prizes.',
   'ngo', '➕', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('156d7f40-d095-4a58-b8f7-270f727828f2', 'GRP-0c6fc495', 'International Federation of Red Cross',
   'IFRC. World''s largest humanitarian organization with 191 National Societies. Founded in 1919. Coordinates international disaster relief, health programs, and development. Headquartered in Geneva.',
   'ngo', '🔴', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('78914b2b-ab98-4b9a-aff2-a82d7be4e5c3', 'GRP-9e9ee495', 'Médecins Sans Frontières',
   'Doctors Without Borders. International humanitarian medical NGO providing emergency medical aid. Founded in 1971. Nobel Peace Prize laureate (1999). Active in over 70 countries. Headquartered in Geneva.',
   'ngo', '🏥', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('6c216993-be93-4c51-8734-57b2d0e86b2a', 'GRP-8252a5d5', 'Save the Children',
   'International NGO promoting children''s rights and providing relief and support in developing countries. Founded in 1919. Operates in approximately 120 countries. Headquartered in London.',
   'ngo', '👶', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('b40b1853-4488-4e7f-b80e-386ec8dee97a', 'GRP-7aa500cd', 'WWF',
   'World Wildlife Fund (World Wide Fund for Nature). International NGO founded in 1961 working on wilderness preservation and reducing human impact on the environment. Active in over 100 countries. Headquartered in Gland, Switzerland.',
   'ngo', '🐼', NULL, '00000000-0000-0000-0000-000000000001', NULL,
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true);

-- -----------------------------------------------------------------------------
-- Political Parties
-- -----------------------------------------------------------------------------
INSERT INTO groups (id, uid, name, description, group_type, logo_emoji, founder_id, parent_group_id, geographic_area_id, settings, locked_settings, is_active)
VALUES
  ('6c579b99-50d2-4954-8e66-af4df7741249', 'GRP-ce93fb8c', 'Aam Aadmi Party',
   'Indian political party founded in 2012. Born from the anti-corruption movement. Advocates for transparency, decentralization, and public services. Governs Delhi and Punjab.',
   'party', '🧹', NULL, '00000000-0000-0000-0000-000000000001', 'ea0105d3-cae6-44e7-98af-83fa2c63229b',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('d0d41d13-6fd2-400c-b45c-6d3eaa8a862e', 'GRP-a0cde8be', 'AfD',
   'Alternative for Germany. Right-wing to far-right political party. Founded in 2013. Eurosceptic, anti-immigration platform. Significant presence in eastern German states.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', 'bc6e45c5-cd10-4896-9321-b67eb59b8f49',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('97c360b5-80c7-47b8-8738-fea58a805e51', 'GRP-4b5ea1a7', 'Bharatiya Janata Party',
   'Indian right-wing political party. Founded in 1980. India''s largest party by membership and seats. Hindu nationalist platform. Governing party under Prime Minister Narendra Modi.',
   'party', '🪷', NULL, '00000000-0000-0000-0000-000000000001', 'ea0105d3-cae6-44e7-98af-83fa2c63229b',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('86b553bd-5f25-4c59-96ad-41a56a084988', 'GRP-97fcbf4f', 'Bloc Québécois',
   'Canadian federal political party advocating for Quebec sovereignty and interests. Founded in 1991. Only runs candidates in Quebec. Social democratic, Quebec nationalist.',
   'party', '⚜️', NULL, '00000000-0000-0000-0000-000000000001', 'ebf2dee2-495c-4d83-9e16-f18d4a192bd4',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('aafcecf8-9652-4778-a073-cafe799f6ef5', 'GRP-a107cd6c', 'Bündnis 90/Die Grünen',
   'Alliance 90/The Greens. German green political party. Founded in 1980. Advocates for environmentalism, social justice, and participatory democracy. Part of governing coalitions at federal and state levels.',
   'party', '🌻', NULL, '00000000-0000-0000-0000-000000000001', 'bc6e45c5-cd10-4896-9321-b67eb59b8f49',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('c8dd5349-fe9f-4b97-aabd-5eb15542225b', 'GRP-ae31032e', 'CDU/CSU',
   'Christian Democratic Union / Christian Social Union. Centre-right political alliance in Germany. The CDU operates nationwide except Bavaria, where its sister party CSU operates. Founded 1945.',
   'party', '⚫', NULL, '00000000-0000-0000-0000-000000000001', 'bc6e45c5-cd10-4896-9321-b67eb59b8f49',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('037f4c71-26d2-42d8-96ae-da848623b05f', 'GRP-b6d67c63', 'Chinese Communist Party',
   'Ruling party of the People''s Republic of China. Founded in 1921. Largest political party in the world with over 98 million members. Marxist-Leninist, one-party system.',
   'party', '⭐', NULL, '00000000-0000-0000-0000-000000000001', '98ab25d1-6f5c-446f-9e8d-d7c2fe0097fa',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('f2bdb106-e2d1-4821-829e-34e81c91fda8', 'GRP-e7a9d475', 'Communist Party of the Russian Federation',
   'Russian left-wing political party. Founded in 1993 as successor to the Communist Party of the Soviet Union. Second-largest party in the State Duma.',
   'party', '🔴', NULL, '00000000-0000-0000-0000-000000000001', '772972ea-3f3b-45b6-8562-cd860e2427cb',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('fb091ae6-9902-4143-a281-dd333d221334', 'GRP-3410d6e1', 'Conservative Party (UK)',
   'Centre-right political party in the United Kingdom. Founded in 1834. One of the two main UK political parties. Also known as the Tories. Longest-serving political party in British history.',
   'party', '🌳', NULL, '00000000-0000-0000-0000-000000000001', 'bc4e4c08-5b62-40e6-9aa7-45ad32079801',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('3951e7fb-d04f-43b4-9e39-8cb7605ff0b5', 'GRP-51710dbe', 'Conservative Party of Canada',
   'Canadian centre-right party. Founded in 2003 from merger of Canadian Alliance and Progressive Conservatives. Advocates for lower taxes, smaller government, and traditional values.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', 'ebf2dee2-495c-4d83-9e16-f18d4a192bd4',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('243955e2-e5c6-44bf-b463-ccb6c53154d5', 'GRP-6214b316', 'Constitutional Democratic Party (Japan)',
   'Japanese centre-left political party. Founded in 2017, re-established 2020. Main opposition party. Social liberal, progressive platform.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', '7690e60c-aa36-4e11-bc18-51396fd8b679',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('1c81a730-a2de-46a2-9105-bcd8a8aaedbe', 'GRP-8ada91cc', 'Democratic Party (US)',
   'One of the two major political parties in the United States. Founded in 1828, making it one of the oldest active political parties in the world. Generally associated with liberal and progressive policies.',
   'party', '🫏', NULL, '00000000-0000-0000-0000-000000000001', '2ba1aeef-e1cc-40fb-9383-4f27a0a2f234',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('fb8b95ae-fba7-4412-92bd-1882a37da398', 'GRP-661d486a', 'FDP',
   'Free Democratic Party. German classical liberal party. Founded in 1948. Advocates for individual liberty, free markets, and civil rights. Historically a kingmaker in coalition politics.',
   'party', '💛', NULL, '00000000-0000-0000-0000-000000000001', 'bc6e45c5-cd10-4896-9321-b67eb59b8f49',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('b9e84781-e857-4f44-8449-6cca48424caf', 'GRP-fdec480b', 'Forza Italia',
   'Italian centre-right party. Founded in 1994 by Silvio Berlusconi. Liberal-conservative, pro-European. Part of centre-right coalition.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', 'ee614069-9057-4203-ba30-b9ec490beb3c',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('1ba36742-97ac-4724-bd8a-4751ad47acb0', 'GRP-5cd06666', 'Fratelli d''Italia',
   'Italian right-wing to far-right party. Founded in 2012. Led by Giorgia Meloni. National-conservative, eurosceptic platform. Governing party since 2022.',
   'party', '🔥', NULL, '00000000-0000-0000-0000-000000000001', 'ee614069-9057-4203-ba30-b9ec490beb3c',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('08217388-9dbc-4221-b7cb-e5e1f9d98bd4', 'GRP-6f6e0eb8', 'Green Party (US)',
   'Political party in the United States founded in 2001. Advocates for environmentalism, social justice, grassroots democracy, and nonviolence.',
   'party', '🌻', NULL, '00000000-0000-0000-0000-000000000001', '2ba1aeef-e1cc-40fb-9383-4f27a0a2f234',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('8c3e5d32-dc23-4ffc-91c3-2a915cdaa0b4', 'GRP-7b02b4c6', 'Indian National Congress',
   'Indian centre-left political party. Founded in 1885, one of the oldest parties in the world. Led India''s independence movement. Social democratic, secular platform.',
   'party', '✋', NULL, '00000000-0000-0000-0000-000000000001', 'ea0105d3-cae6-44e7-98af-83fa2c63229b',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('50abfa0b-ea37-4cb8-bd65-9586ef4f8525', 'GRP-f6853930', 'Komeito',
   'Japanese centre to centre-right party. Founded in 1964. Coalition partner of the LDP. Associated with Soka Gakkai Buddhist organization. Advocates for peace and welfare.',
   'party', '🌸', NULL, '00000000-0000-0000-0000-000000000001', '7690e60c-aa36-4e11-bc18-51396fd8b679',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('8f2bc255-d608-40e4-8307-c277d44eb571', 'GRP-27550f25', 'La France Insoumise',
   'French left-wing populist party. Founded in 2016 by Jean-Luc Mélenchon. Advocates for democratic socialism, ecological planning, and Sixth Republic constitutional reform.',
   'party', '🟣', NULL, '00000000-0000-0000-0000-000000000001', 'bfed3eea-bd10-445c-ad2d-6d56ab2ddc97',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('6febe866-c7ed-444f-9955-68f3ff87ed8d', 'GRP-1b810f03', 'Labour Party (UK)',
   'Centre-left political party in the United Kingdom. Founded in 1900. One of the two main UK parties. Historically linked to trade unions and the working class.',
   'party', '🌹', NULL, '00000000-0000-0000-0000-000000000001', 'bc4e4c08-5b62-40e6-9aa7-45ad32079801',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('79b68882-be48-47b6-8684-d14d09b637d4', 'GRP-373edb46', 'LDPR',
   'Liberal Democratic Party of Russia. Founded in 1991. Despite its name, considered nationalist and right-wing populist. Founded by Vladimir Zhirinovsky.',
   'party', '🟡', NULL, '00000000-0000-0000-0000-000000000001', '772972ea-3f3b-45b6-8562-cd860e2427cb',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('5bb38794-f945-483c-b677-5264b50386fd', 'GRP-7dfdc13c', 'Lega',
   'Italian right-wing party. Founded in 1989 as Lega Nord. Led by Matteo Salvini. Nationalist, federalist, eurosceptic platform. Part of governing coalition.',
   'party', '🟢', NULL, '00000000-0000-0000-0000-000000000001', 'ee614069-9057-4203-ba30-b9ec490beb3c',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('87c4454a-065a-4b55-8133-92c0e4e0d627', 'GRP-aa82f323', 'Les Républicains',
   'French centre-right Gaullist political party. Founded in 2015 as successor to UMP. Conservative, pro-business platform.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', 'bfed3eea-bd10-445c-ad2d-6d56ab2ddc97',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('5d60f89a-b202-4df7-bc70-ff1660d28d67', 'GRP-2c5c9ea4', 'Liberal Democratic Party (Japan)',
   'Japanese centre-right to right-wing political party. Founded in 1955. Has governed Japan almost continuously since its founding. Conservative, pro-business platform.',
   'party', '🗾', NULL, '00000000-0000-0000-0000-000000000001', '7690e60c-aa36-4e11-bc18-51396fd8b679',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('1796ac3e-37f3-45c0-b611-ce83328eef38', 'GRP-387ecaa4', 'Liberal Democrats (UK)',
   'Centrist to centre-left political party in the United Kingdom. Formed in 1988 from merger of the Liberal Party and SDP. Advocates for liberalism, internationalism, and constitutional reform.',
   'party', '🔶', NULL, '00000000-0000-0000-0000-000000000001', 'bc4e4c08-5b62-40e6-9aa7-45ad32079801',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('85062041-b633-4be2-bf56-4af29ef4dcea', 'GRP-32b7692e', 'Liberal Party of Canada',
   'Canadian centrist to centre-left party. Founded in 1867. One of the two major federal parties. Known as the "Natural Governing Party" for its long periods in power.',
   'party', '🍁', NULL, '00000000-0000-0000-0000-000000000001', 'ebf2dee2-495c-4d83-9e16-f18d4a192bd4',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('4b03fade-0282-46ef-806a-8c8c1e2a4e9a', 'GRP-8e5f4977', 'Libertarian Party (US)',
   'Third-largest political party in the United States. Founded in 1971. Advocates for civil liberties, free markets, non-interventionism, and limited government.',
   'party', '🗽', NULL, '00000000-0000-0000-0000-000000000001', '2ba1aeef-e1cc-40fb-9383-4f27a0a2f234',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('35cee2c0-199a-49bf-87ce-0996ef24a569', 'GRP-1e66081f', 'MDB',
   'Brazilian Democratic Movement. Brazilian centrist party. Founded in 1966. One of the largest parties in Brazil. Pragmatic, catch-all party with broad ideological range.',
   'party', '🟡', NULL, '00000000-0000-0000-0000-000000000001', '070b8c82-b847-432e-bcf2-a59cba4482c8',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('ebe1a181-512c-4d3c-9466-65f5a6123886', 'GRP-21bc739e', 'Movimento 5 Stelle',
   'Italian populist party. Founded in 2009 by Beppe Grillo and Gianroberto Casaleggio. Originally anti-establishment, focused on direct democracy, environmentalism, and digital rights.',
   'party', '⭐', NULL, '00000000-0000-0000-0000-000000000001', 'ee614069-9057-4203-ba30-b9ec490beb3c',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('cf279d1f-3585-4ca2-8dfe-2db329afadb8', 'GRP-535950f0', 'New Democratic Party (Canada)',
   'Canadian social democratic party. Founded in 1961. Third-largest party federally. Advocates for workers'' rights, universal healthcare expansion, and environmental protection.',
   'party', '🟠', NULL, '00000000-0000-0000-0000-000000000001', 'ebf2dee2-495c-4d83-9e16-f18d4a192bd4',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('b669f697-6d7a-49b4-a08a-8d9fb5ec23d7', 'GRP-b9d8ee3c', 'Partido dos Trabalhadores',
   'Workers'' Party. Brazilian centre-left to left-wing party. Founded in 1980. Led by Lula da Silva. Social democratic, labour movement roots. Governing party since 2023.',
   'party', '⭐', NULL, '00000000-0000-0000-0000-000000000001', '070b8c82-b847-432e-bcf2-a59cba4482c8',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('4a6b8018-b593-44bc-ac22-85b868eb4514', 'GRP-95ff555b', 'Partido Liberal (Brazil)',
   'Brazilian right-wing party. Refounded in 2006. Led by Jair Bolsonaro since 2021. Largest party in the Brazilian Congress by seats. Conservative, liberal economic platform.',
   'party', '🟢', NULL, '00000000-0000-0000-0000-000000000001', '070b8c82-b847-432e-bcf2-a59cba4482c8',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('42870429-6c08-4645-b9c3-9ddbc3f6a7ae', 'GRP-abe5c24e', 'Partito Democratico',
   'Italian centre-left party. Founded in 2007. Social democratic, pro-European. Main centre-left force in Italian politics.',
   'party', '🔴', NULL, '00000000-0000-0000-0000-000000000001', 'ee614069-9057-4203-ba30-b9ec490beb3c',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('d20cf463-12aa-4a58-a1d7-82e1f8033225', 'GRP-862a2b7c', 'Rassemblement National',
   'French right-wing to far-right party. Founded in 1972 as Front National, renamed in 2018. Led by Marine Le Pen. Nationalist, eurosceptic, anti-immigration platform.',
   'party', '🔵', NULL, '00000000-0000-0000-0000-000000000001', 'bfed3eea-bd10-445c-ad2d-6d56ab2ddc97',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('a49492bc-f830-4baa-81e9-80da11d8a3db', 'GRP-8ac7677a', 'Renaissance (FR)',
   'French centrist and liberal political party. Founded in 2016 by Emmanuel Macron as En Marche!, renamed in 2022. Pro-European, socially liberal, and economically centrist.',
   'party', '🟡', NULL, '00000000-0000-0000-0000-000000000001', 'bfed3eea-bd10-445c-ad2d-6d56ab2ddc97',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('4aa129cd-25f5-4886-88d7-936acf5bc6db', 'GRP-0a1145ac', 'Republican Party (US)',
   'One of the two major political parties in the United States. Founded in 1854. Also known as the GOP (Grand Old Party). Generally associated with conservative and right-leaning policies.',
   'party', '🐘', NULL, '00000000-0000-0000-0000-000000000001', '2ba1aeef-e1cc-40fb-9383-4f27a0a2f234',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('fb8cd999-7095-49a5-a5e2-c709c4f909bd', 'GRP-05209baa', 'Scottish National Party',
   'Political party in Scotland advocating for Scottish independence. Founded in 1934. Social democratic and civic nationalist. Largest party in the Scottish Parliament.',
   'party', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', NULL, '00000000-0000-0000-0000-000000000001', 'bc4e4c08-5b62-40e6-9aa7-45ad32079801',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('99d3c47f-bdac-49d1-b363-dbfffed51694', 'GRP-405ee410', 'SPD',
   'Social Democratic Party of Germany. Centre-left party and one of the oldest democratic parties in the world. Founded in 1863. Major party in German coalition governments.',
   'party', '🔴', NULL, '00000000-0000-0000-0000-000000000001', 'bc6e45c5-cd10-4896-9321-b67eb59b8f49',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true),

  ('7c0e6a8a-2e42-48be-8af7-38853ee0367d', 'GRP-c2a15338', 'United Russia',
   'Dominant political party of the Russian Federation. Founded in 2001. Centre-right, nationalist, pro-Putin platform. Controls supermajority in the State Duma.',
   'party', '🐻', NULL, '00000000-0000-0000-0000-000000000001', '772972ea-3f3b-45b6-8562-cd860e2427cb',
   '{"can_post":"members","visibility":"public","join_policy":"open","can_create_subgroups":"admins"}', '{}', true);
