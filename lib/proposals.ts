export interface Proposal {
  id: string
  title: string
  summary: string
  fullText: string
  status: "open" | "closed"
  closingDate: Date
  results?: {
    approve: number
    reject: number
    abstain: number
  }
}

export const proposals: Proposal[] = [
  {
    id: "PROP-042",
    title: "Amendment to Civil Code Art. 12",
    summary: "feat(civil): expand digital identity recognition\n\nExtends citizen verification protocols to include biometric hashing under the new Constitutional CI/CD framework.",
    fullText: `# Amendment to Civil Code Article 12

## Preamble
This amendment proposes the expansion of digital identity recognition within the Pangean Republic's civil infrastructure.

## Section 1: Digital Identity Framework
All citizens shall have the right to a cryptographically secured digital identity (SSID) that:
- Is self-sovereign and non-transferable
- Utilizes biometric hashing for verification
- Integrates with the Constitutional CI/CD protocol

## Section 2: Implementation
The Department of Digital Affairs shall deploy the identity framework within 90 days of ratification.

## Section 3: Privacy Provisions
All biometric data shall be processed locally on citizen devices. No centralized biometric database shall be maintained.`,
    status: "open",
    closingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROP-041",
    title: "Decentralized Treasury Protocol v2.0",
    summary: "refactor(treasury): implement multi-sig governance\n\nMigrates treasury operations to a 5-of-9 multi-signature scheme with time-locked transactions.",
    fullText: `# Decentralized Treasury Protocol v2.0

## Abstract
This proposal introduces a comprehensive overhaul of the Pangean Treasury system, implementing cryptographic safeguards and decentralized governance.

## Core Changes
1. **Multi-Signature Requirements**: All treasury disbursements exceeding 10,000 PAN require 5-of-9 Council signatures.
2. **Time-Locks**: Major expenditures trigger a 72-hour time-lock for community review.
3. **Audit Trail**: All transactions are logged to the Constitutional Ledger.

## Economic Impact
Projected to reduce unauthorized disbursement risk by 94%.`,
    status: "open",
    closingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROP-040",
    title: "Environmental Data Commons Act",
    summary: "feat(environment): establish open environmental monitoring\n\nCreates a citizen-operated network of environmental sensors with public data access.",
    fullText: `# Environmental Data Commons Act

## Purpose
To establish a decentralized, citizen-operated environmental monitoring network that provides transparent, real-time data to all Pangean residents.

## Key Provisions
- Deploy 10,000 IoT environmental sensors across all territories
- All sensor data published to public blockchain
- Citizens may propose sensor placement locations
- AI-powered anomaly detection for pollution events

## Funding
Allocated from the Environmental Reserve Fund (ERF-2024).`,
    status: "open",
    closingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROP-039",
    title: "Universal Basic Compute Allocation",
    summary: "feat(compute): guarantee computational resources for citizens\n\nEnsures every citizen access to baseline GPU/CPU resources for digital participation.",
    fullText: `# Universal Basic Compute Allocation

## Rationale
Digital participation in the Pangean Republic requires computational resources. This proposal ensures equitable access.

## Allocation Tiers
- **Basic Tier**: 2 vCPU, 4GB RAM, 50GB storage
- **Citizen Tier**: 4 vCPU, 8GB RAM, 100GB storage, 2h GPU/day
- **Council Tier**: 8 vCPU, 16GB RAM, 500GB storage, unlimited GPU

## Infrastructure
Resources provided via the Pangean Cloud Federation.`,
    status: "closed",
    closingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    results: {
      approve: 67,
      reject: 23,
      abstain: 10,
    },
  },
  {
    id: "PROP-038",
    title: "Liquid Democracy Framework Enhancement",
    summary: "refactor(governance): improve delegation chains\n\nOptimizes the liquid democracy protocol to support up to 10 delegation depth with cycle detection.",
    fullText: `# Liquid Democracy Framework Enhancement

## Current Limitations
The existing delegation system supports only 3 levels of depth and lacks robust cycle detection.

## Proposed Improvements
1. Extend delegation depth to 10 levels
2. Implement O(1) cycle detection using Tarjan's algorithm
3. Add delegation expiry with automatic renewal prompts
4. Introduce partial delegation by topic category

## Security Considerations
All delegation changes logged with 24-hour revocation window.`,
    status: "closed",
    closingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    results: {
      approve: 82,
      reject: 12,
      abstain: 6,
    },
  },
  {
    id: "PROP-037",
    title: "Digital Courts Arbitration Protocol",
    summary: "feat(legal): establish decentralized dispute resolution\n\nCreates a three-tier digital arbitration system with smart contract enforcement.",
    fullText: `# Digital Courts Arbitration Protocol

## Overview
A fully digital, transparent dispute resolution system for the Pangean Republic.

## Three-Tier Structure
1. **Automated Tier**: AI-mediated resolution for disputes under 100 PAN
2. **Community Tier**: Jury pool of 7 randomly selected citizens
3. **Council Tier**: Constitutional Council review for appeals

## Smart Contract Enforcement
Rulings automatically execute via smart contracts where applicable.`,
    status: "closed",
    closingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    results: {
      approve: 54,
      reject: 38,
      abstain: 8,
    },
  },
  {
    id: "PROP-036",
    title: "Neural Interface Ethics Guidelines",
    summary: "docs(ethics): establish BCI usage standards\n\nDefines ethical boundaries for brain-computer interface integration in civic systems.",
    fullText: `# Neural Interface Ethics Guidelines

## Scope
These guidelines govern the use of Brain-Computer Interfaces (BCI) within Pangean civic infrastructure.

## Core Principles
1. **Voluntary Participation**: BCI use shall never be mandatory
2. **Cognitive Privacy**: Neural data classified as highest-tier personal data
3. **Right to Disconnect**: Citizens may disable BCI at any time without penalty
4. **No Subconscious Manipulation**: Systems may not influence below conscious awareness

## Enforcement
Violations subject to review by the Ethics Council.`,
    status: "open",
    closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROP-035",
    title: "Interplanetary Communication Standards",
    summary: "feat(comms): prepare infrastructure for Mars colony\n\nEstablishes delay-tolerant networking protocols for future off-world governance participation.",
    fullText: `# Interplanetary Communication Standards

## Vision
As Pangea expands beyond Earth, our governance systems must accommodate interplanetary latency.

## Technical Specifications
- Delay-Tolerant Networking (DTN) for all civic protocols
- Asynchronous voting with cryptographic time-stamping
- Local governance autonomy during communication blackouts
- Quantum-resistant encryption for long-duration messages

## Timeline
Phase 1 implementation by 2028.`,
    status: "open",
    closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  },
]

export function getTimeRemaining(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return "Closed"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}h remaining`
  }
  return `${hours}h remaining`
}

export function generateVoteReceipt(): string {
  const chars = "0123456789abcdef"
  return Array.from({ length: 16 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}
