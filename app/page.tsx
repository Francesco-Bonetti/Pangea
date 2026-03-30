"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProposalGrid } from "@/components/proposal-grid"
import { ProposalDialog } from "@/components/proposal-dialog"
import type { Proposal } from "@/lib/proposals"

export default function AgoraPangea() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [activeNav, setActiveNav] = useState("active")

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        <ProposalGrid
          filter={activeNav}
          onSelectProposal={setSelectedProposal}
        />
      </main>
      <ProposalDialog
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
      />
    </div>
  )
}
