# LUX — The Constitution of Pangea

*The foundational law of Pangea. Only what is strictly necessary to make the platform function and prevent it from derailing. Everything else is decided democratically by the citizens.*

---

## Title I — Foundational Principles

### Art. 1 — Nature of Pangea

1. Pangea is a digital platform for democratic self-governance, open to all of humanity.

2. Pangea is not a state, a nation, or a government. It is the infrastructure through which any form of democratic governance may emerge.

3. Pangea does not impose any ideology, religion, economic model, or political system. The platform provides the tools; the substance is determined by the citizens and communities that use them.

### Art. 2 — Citizenship

1. Any natural person aged 18 or older may become a citizen of Pangea by registering on the platform and accepting this Constitution.

2. Citizenship is voluntary and may be relinquished at any time without penalty.

3. Citizenship grants the right to: vote on laws and proposals, propose legislation, delegate votes, stand for election, and create or join groups.

4. Every citizen has two profiles: a **private profile** and a **public profile**. The private profile is the default. The public profile activates when the citizen accepts delegations or assumes leadership of a group. Both profiles have independent settings that the citizen controls.

5. No citizen may be compelled to reveal their identity, their activity, or any personal data. The citizen alone decides what is visible and to whom.

### Art. 3 — Privacy and Anonymity ⟨REINFORCED⟩

1. Privacy and anonymity are primary rights in Pangea. They take precedence over transparency, traceability, and any other interest except where this Constitution explicitly states otherwise.

2. All personal data, communications, and metadata are encrypted. No one — not the platform, not its administrators, not other citizens — may access a citizen's data without their explicit consent.

3. Citizens are the sole and sovereign owners of their data. Every citizen has the right to access, rectify, and permanently delete any data collected about them.

4. The platform's algorithms and code are open-source and auditable. No opaque system may influence what citizens see, how content is ranked, or how governance operates.

### Art. 4 — Groups

1. The fundamental organizational unit of Pangea is the **group**. Groups may take any form citizens conceive: jurisdictions, parties, communities, working groups, or anything else.

2. Groups are organized in a **recursive tree structure**. Pangea itself is the root node.

3. Every group may create sub-groups, establish its own laws within its scope, and govern its internal affairs autonomously, provided these do not conflict with this Constitution or with the laws of any ancestor group.

4. Groups may be **completely private**. In a private group, no one outside the group can see its members, deliberations, or activity. Admission requires acceptance by a member with the appropriate authority. Pangea root is the only group that cannot be private.

5. Groups may **receive delegations** from citizens. The group's founder (or founders) decide in the group's settings who within the group is authorized to exercise delegated votes. Delegation power is split equally among all authorized holders. Groups are always public in the actions they perform with delegated votes.

6. All groups at the same level of the tree are equal in status and rights.

### Art. 5 — Fundamental Rights

1. Every citizen is treated with dignity and respect. Governance decisions, laws, and interactions on the platform must be compatible with this principle.

2. All citizens are equal before the law. Discrimination on any basis is prohibited.

3. Every citizen has the right to freedom of thought, conscience, and expression. No citizen may be silenced or excluded from governance without due process.

4. The limits of expression are: incitement to violence and harassment. These are not protected. All other content moderation is within the competence of each group, through its democratically elected moderators.

5. Every citizen has the right to participate in governance without economic prerequisites. No fee, deposit, or token may be required to vote, propose, or stand for election — unless established by a law enacted through the democratic process defined in this Constitution.

### Art. 6 — Right to Leave ⟨REINFORCED⟩

1. Participation in Pangea is entirely voluntary. Any citizen may leave the platform, any group, or any process at any time and for any reason.

2. Any delegation may be revoked at any time with immediate effect.

3. No group or governance body may prevent a citizen from leaving or impose penalties for departure.

### Art. 7 — Liquid Democracy

1. Pangea operates on the principles of **liquid democracy**, combining direct and delegated voting.

2. Every citizen possesses one vote on every legislative matter within their scope. This vote may be cast directly or delegated to another citizen or to a group.

3. Delegation may be **general** (applying to all matters) or **specific** (limited to certain domains). A citizen may delegate different domains to different proxies.

4. Delegation is **transitive**: if Citizen A delegates to Citizen B, and B delegates to C, then C votes with the combined weight — unless a delegator has restricted transitivity.

5. Delegation requires the **consent** of the delegate. When a citizen accepts a delegation, their public profile activates and the actions they perform as proxy are publicly visible. This is the price of trust.

6. Delegations apply to both legislative votes and elections.

7. A delegation expires after 180 days of inactivity by the delegating citizen.

### Art. 8 — The Legislative System

1. Legislative power belongs to the citizens. Citizens exercise it through the **Agora**, the platform's deliberation and voting space, available at every level of the tree.

2. Any citizen may propose legislation within the appropriate scope.

3. Laws are organized in four tiers, each with its own approval threshold and quorum:

   - **Constitutional Principles** (this Title): 90% approval, 60% quorum of active citizens.
   - **Core Protocol** (Title II): 80% approval, 50% quorum. Double vote with trial period.
   - **Platform Protocol** (Title III): 66% approval, 40% quorum. Double vote with trial period.
   - **Ordinary laws**: 50%+1 approval, 30% quorum. Single vote.

4. Active citizen means: a citizen who has accessed the platform within the last 90 days.

5. Quorum has a double requirement: a minimum number of unique individuals voting, and a threshold on total vote weight (including delegations).

6. During an active vote, individual vote breakdowns are hidden to prevent herding. Only turnout is visible. Results are revealed when voting closes.

### Art. 9 — Architecture

1. Pangea's technical architecture is divided into two layers:

   - **Core**: the democratic kernel — voting, identity, delegations, laws, elections. Immutable except through the legislative process. All critical computations happen server-side.
   - **Edge**: the interface layer — feed, discussions, comments, notifications. A lens for reading Core data. Edge never has veto power over Core.

2. No Edge component may alter, filter, or suppress Core data. The Agora feed is deterministic — never influenced by opaque algorithms.

3. The specific rules governing Core and Edge are defined in Titles II and III of this Constitution.

### Art. 10 — The Guardian

1. In its founding phase, Pangea is governed by a **Guardian** — the founder of the platform.

2. The Guardian has the authority to promulgate this Constitution, seed initial data, and protect the integrity of the platform while the community is small.

3. The Guardian's powers have a **sunset clause**: they diminish progressively as the community grows and elects its own representatives. The specific conditions for sunset are defined by law.

4. Once the Guardian cedes all powers, this Constitution becomes modifiable exclusively through the democratic procedures defined herein. No individual may ever again hold Guardian-level authority unless granted by unanimous decision of the citizenry.

---

## Title II — Core Protocol

*Executable laws describing the democratic kernel. These articles are subject to the Core tier: 80% approval, 50% quorum, double vote with trial period. They describe how the platform's critical systems function.*

### Art. 14 — Voting Mechanics

1. Every vote is cast through the Agora. A citizen may vote **Yea**, **Nay**, or **Abstain** on any proposal within their scope. Abstention counts toward quorum but not toward the approval threshold.

2. When a proposal defines deliberative options, voting is **distributed**: the citizen allocates 100% of their decision-making weight across the available options. No partial allocations are accepted — the total must equal exactly 100%.

3. Each vote carries a **weight** determined by the citizen's own vote plus any active delegations they hold. The system resolves delegation chains recursively, excluding delegators who have already voted directly.

4. During an active vote, individual vote breakdowns are hidden. Only total turnout is visible. Full results are revealed when the voting period closes. This prevents herding and conformity bias.

5. Every vote is cryptographically hashed at the time of casting (voter ID + proposal ID + vote type + salt). These hashes are stored immutably and can be verified by any citizen after the vote closes, ensuring integrity without compromising privacy during voting.

6. A citizen may change their vote at any time before the voting period closes. The previous vote is replaced, and a new hash is generated.

### Art. 15 — Proposal Lifecycle

1. A proposal follows a defined lifecycle. The stages are, in order: **Draft** → **Community Review** → **Active Vote** → **Closed**. For Core and Platform tier proposals, the lifecycle includes additional stages: **First Vote** → **Trial** → **Second Vote** → **Closed**.

2. **Draft**: the author prepares the proposal. It is visible only to the author until submitted.

3. **Community Review** (curation): the proposal is published for review. Citizens signal support. When the signal count reaches the dynamic threshold — calculated as the square root of active citizens, with a minimum of 2 — the proposal advances to voting.

4. **Contention resolution**: if multiple proposals target the same law node, they enter a contention group. An approval voting poll runs for 7 days (Monday to Monday). Citizens may approve any number of competing proposals. The most approved proposal proceeds to vote first. If rejected, the next in rank advances automatically. If approved, remaining proposals return to curation for re-evaluation.

5. **Voting period**: 7 days from advancement. The applicable thresholds and quorum are determined by the proposal's tier (Art. 8.3).

6. **Double vote** (Core and Platform tiers only): the first vote asks "Should we start the trial?" If approved, the proposal enters a trial period of configurable duration (1–90 days, set by the author). After the trial, all votes are cleared and a second vote asks "Do we confirm?" The same thresholds apply to both votes.

7. A proposal that fails to reach quorum or approval threshold is closed as rejected. It may be resubmitted as a new proposal.

### Art. 16 — Delegation Resolution

1. When a citizen casts a vote, the system resolves their total voting weight by traversing the delegation chain:
   - Direct delegations to the voter are counted.
   - If a delegation is marked as transitive, the system recursively follows the chain.
   - Delegators who have already voted directly on the same proposal are excluded from the weight calculation.

2. Delegation weight applies equally to legislative votes and elections.

3. When a group receives delegations, the delegated weight is split equally among the group's authorized vote holders (as designated by the group's founder). Each authorized member receives floor(total_delegated / number_of_authorized). Actions performed with group-delegated weight are always publicly attributed.

4. The system prevents delegation cycles. A delegation that would create a circular chain is rejected.

5. Delegations that have been inactive (delegator has not accessed the platform) for 180 days are automatically expired by the system.

### Art. 17 — Elections

1. Elections follow a lifecycle: **Upcoming** → **Candidature** → **Voting** → **Closed**.

2. During the candidature phase, eligible citizens register as candidates. The candidature period has a defined duration set at election creation.

3. During the voting phase, citizens cast a single vote for one candidate. Vote weight includes delegations, resolved identically to legislative votes (Art. 16).

4. When the voting period closes, the candidate with the highest weighted vote count wins. In case of a tie, the candidate who registered first prevails.

5. For group positions, elections are automatically created when new groups form. When a position election finalizes, the winner is automatically assigned the corresponding role within the group.

6. Moderators can only be appointed through elections — never by manual role assignment. This ensures all moderation authority derives from democratic mandate.

### Art. 18 — Identity and Integrity

1. Citizenship is established by registering with a valid email address and accepting this Constitution. Registration is protected against automated abuse through invisible verification mechanisms.

2. The platform maintains a cryptographic integrity layer. Every vote, every law, and every proposal is hashed using SHA-256. These hashes form a verifiable record that any citizen can audit.

3. When a law is amended, the previous version is preserved in the law's history. Citizens can view and compare any historical version of any law.

4. The system tracks the integrity of all records. Any modification to a hashed record is detectable and flagged.

### Art. 19 — Trial Environments

1. When a Core or Platform tier proposal passes its first vote, a **trial environment** is created. The trial environment is an isolated copy of the platform where the proposed changes can be tested with a snapshot of real data.

2. The trial environment consists of a database branch containing a snapshot of production data at the moment of the first vote, and a preview deployment where citizens can interact with the proposed changes.

3. During the trial period, citizens may submit feedback classified as: **Bug** (technical malfunction), **Concern** (policy or governance worry), **Observation** (neutral finding), or **Approval** (positive assessment). Each citizen may submit one feedback item of each type per trial.

4. When the trial period ends, the trial environment is closed and the proposal advances to the second vote. Citizen feedback from the trial is publicly visible during the second vote to inform the decision.

5. The Guardian (or, after sunset, an elected administrator) provisions trial environments. The platform tracks the status of each trial environment and provides citizens with access to the preview deployment.

---

## Title III — Platform Protocol

*Executable laws describing the interface layer. These articles are subject to the Platform tier: 66% approval, 40% quorum, double vote with trial period. They describe how citizens interact with the platform.*

### Art. 20 — The Agora

1. The **Agora** is the platform's public deliberation space. It exists at every level of the tree: the root Agora belongs to Pangea, and every group has its own Agora.

2. The Agora feed is **deterministic**. Content is ordered by creation time, activity (replies, votes), or explicit user choice. No opaque algorithm may influence what citizens see or in what order.

3. Citizens may create discussions in the Agora. Discussions support threaded replies, upvotes/downvotes, and reporting. Discussion content can be automatically translated to the citizen's preferred language.

4. The Agora serves as the incubation space for proposals. Proposals that gather sufficient community support (Art. 15.3) graduate from the Agora to the formal voting process.

### Art. 21 — Groups and the Tree

1. Groups are organized in a recursive tree. Every group may contain sub-groups to unlimited depth. Pangea is the root.

2. A group is created by a citizen who becomes its **founder**. The founder may invite **co-founders** who share equal authority. Additional roles — president, vice president, admin, secretary, treasurer, moderator, member, observer — are assigned through elections or by authorized members according to the group's role hierarchy.

3. Group settings are organized in four categories: **Governance** (voting duration, approval threshold, quorum, anonymous proposals), **Membership** (join policy, max members), **Privacy & Access** (visibility), and **Structure** (sub-group creation policy).

4. Settings may be **locked by a parent group**. A locked setting cannot be changed by the child group or any of its descendants. The root group (Pangea) may lock settings that apply to the entire tree. Locked settings are visually marked in the interface.

5. Groups may be completely private (Art. 4.4). In a private group, non-members see only the group name and a request-to-join button. Admission requires approval by a member with the appropriate permission.

### Art. 22 — Moderation

1. Content moderation within each group is the responsibility of that group's **elected moderators**. Moderators are elected through the standard election process (Art. 17).

2. Moderators may remove content and issue warnings within their group's scope. The only content universally prohibited across Pangea is: incitement to violence and harassment (Art. 5.4). All other moderation standards are determined by each group.

3. Any citizen may report content they believe violates group rules. Reports are reviewed by the group's moderators. The reporting citizen's identity is not revealed to the reported party.

4. The platform provides no automated content moderation. No AI or algorithm may take moderation actions. Automated systems may only flag content for human review.

### Art. 23 — The Guardian System

1. The Guardian system operates in four progressive phases, determined by the number of active Tier 2 citizens:

   - **Phase 0** (fewer than 10 T2 citizens): Full powers — the Guardian may set and remove bootstrap locks on laws, degrade administrators, and invoke emergency freeze.
   - **Phase 1** (10–99 T2 citizens): The Guardian may no longer set new bootstrap locks. Existing locks remain.
   - **Phase 2** (100–999 T2 citizens): Emergency freeze power is revoked. The Guardian retains administrative oversight.
   - **Phase 3** (1,000+ T2 citizens): All Guardian powers are revoked. Governance is fully decentralized.

2. Bootstrap locks protect foundational laws during the early phase when a small number of citizens could otherwise alter the Constitution without genuine consensus. Once removed, a bootstrap lock cannot be reinstated.

3. The thresholds for phase transitions are stored in the platform's configuration and may be adjusted through the standard legislative process of the applicable tier.

### Art. 24 — Messaging and Privacy

1. Citizens may exchange direct messages. All direct messages are encrypted end-to-end using public-key cryptography (Curve25519). The platform cannot read message contents.

2. Each citizen generates an encryption key pair protected by a personal password. Private keys are stored exclusively on the citizen's device, never on the server.

3. Message metadata (who communicates with whom, when, and how often) is stored on the platform's servers. A future protocol upgrade may decentralize messaging to eliminate metadata exposure (see Art. 3).

4. Notification preferences are controlled by each citizen. The platform sends notifications for: replies to discussions, new delegations, election results, and proposal status changes. Citizens may disable any notification category.

### Art. 25 — Technical Architecture

1. The platform is a web application accessible through any modern browser. It supports installation as a Progressive Web App (PWA) for mobile devices.

2. The **Core layer** consists of the database, server-side RPCs (remote procedure calls), and authentication. All critical computations — vote tallying, delegation resolution, quorum checks, and integrity verification — execute server-side. No client-side code may influence Core outcomes.

3. The **Edge layer** consists of the user interface, client-side rendering, and presentation logic. Edge reads Core data and presents it to the citizen. Edge may translate, format, and visualize — but may never alter, suppress, or filter Core data.

4. All platform source code is publicly available. The algorithms governing voting, delegation, and governance are auditable by any citizen.

---

## Title IV — Final Provisions

### Art. 11 — Amendment Procedure

1. This Constitution may be amended by the will of the citizenry. No provision is permanently immutable — but the most foundational provisions are protected by demanding procedures.

2. **Standard amendments** (provisions not marked ⟨REINFORCED⟩): follow the threshold of the tier they belong to (Art. 8.3), with a minimum debate period of 30 days before voting.

3. **Reinforced amendments** (provisions marked ⟨REINFORCED⟩):
   - Minimum 90 days of public debate before the first vote.
   - First vote: 90% approval required.
   - Mandatory cooling period of 30 days.
   - Second vote: 90% approval required to confirm.

4. The reinforced procedure exists to ensure that changes to Pangea's most fundamental provisions reflect deep, sustained consensus — not a momentary impulse.

### Art. 12 — Reinforced Provisions ⟨REINFORCED⟩

The following provisions are subject to the reinforced amendment procedure:

- **Art. 3** — Privacy and Anonymity
- **Art. 5.1–5.2** — Dignity and Equality
- **Art. 6** — Right to Leave
- **Art. 11.3** — The reinforced amendment procedure itself
- **Art. 12** — This article

These provisions represent the core identity of Pangea. They can be changed — because no generation should be bound by the choices of a previous one — but only through extraordinary consensus.

### Art. 13 — Entry into Force

1. This Constitution is promulgated by the Guardian in the founding phase of Pangea.

2. It enters into force immediately upon promulgation.

3. When the Guardian's powers sunset, this Constitution continues in force and becomes modifiable exclusively through the procedures of Art. 11.
