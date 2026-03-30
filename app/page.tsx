"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProposalGrid } from "@/components/proposal-grid"
import { ProposalDialog } from "@/components/proposal-dialog"
import { getCurrentCitizen } from "@/lib/auth"

export default function AgoraPangea() {
  const [selectedProposal, setSelectedProposal] = useState<any>(null)
  const [activeNav, setActiveNav] = useState("active")
  const [currentCitizen, setCurrentCitizen] = useState<any>(null)

  useEffect(() => {
    async function loadCitizen() {
      const { citizen } = await getCurrentCitizen()
      setCurrentCitizen(citizen)
    }
    loadCitizen()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} currentCitizen={currentCitizen} />
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
