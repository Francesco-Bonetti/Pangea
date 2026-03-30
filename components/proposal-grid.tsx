"use client"

import { useEffect, useState } from "react"
import { getProposals } from "@/lib/db"
import { ProposalCard } from "@/components/proposal-card"

interface ProposalGridProps {
  filter: string
  onSelectProposal: (proposal: any) => void
}

export function ProposalGrid({ filter, onSelectProposal }: ProposalGridProps) {
  const [filteredProposals, setFilteredProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProposals() {
      setLoading(true)
      setError(null)

      let filterStatus = undefined
      if (filter === "active") filterStatus = "open"
      if (filter === "archive") filterStatus = "closed"

      const { data, error: dbError } = await getProposals(filterStatus)
      if (dbError) {
        setError(dbError.message)
        setFilteredProposals([])
      } else {
        setFilteredProposals(data || [])
      }
      setLoading(false)
    }

    loadProposals()
  }, [filter])

  const getTitle = () => {
    switch (filter) {
      case "active":
        return "Active Proposals"
      case "archive":
        return "Historical Archive"
      case "delegations":
        return "Liquid Delegations"
      case "ssid":
        return "My SSID"
      default:
        return "Proposals"
    }
  }

  const getDescription = () => {
    switch (filter) {
      case "active":
        return "Vote on pending legislative measures"
      case "archive":
        return "Review past decisions and their outcomes"
      case "delegations":
        return "Manage your voting power delegations"
      case "ssid":
        return "Your Sovereign Self-Issued Identity"
      default:
        return ""
    }
  }

  if (filter === "delegations") {
    return (
      <div>
        <header className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            {getTitle()}
          </h2>
          <p className="text-muted-foreground mt-1">{getDescription()}</p>
        </header>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No active delegations. You retain full voting power.
          </p>
        </div>
      </div>
    )
  }

  if (filter === "ssid") {
    return (
      <div>
        <header className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            {getTitle()}
          </h2>
          <p className="text-muted-foreground mt-1">{getDescription()}</p>
        </header>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-mono text-primary">PN</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Pangean Citizen</h3>
              <p className="text-sm font-mono text-muted-foreground">
                SSID: 0x7f3a...9c2e
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-xs text-muted-foreground mb-1">Voting Power</p>
              <p className="text-lg font-semibold text-foreground">1.00 VP</p>
            </div>
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-xs text-muted-foreground mb-1">Votes Cast</p>
              <p className="text-lg font-semibold text-foreground">23</p>
            </div>
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-xs text-muted-foreground mb-1">Member Since</p>
              <p className="text-lg font-semibold text-foreground">Block #1,204,832</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          {getTitle()}
        </h2>
        <p className="text-muted-foreground mt-1">{getDescription()}</p>
      </header>

      {error && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-destructive">Error loading proposals: {error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Loading proposals...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onClick={() => onSelectProposal(proposal)}
            />
          ))}
        </div>
      )}

      {!loading && !error && filteredProposals.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No proposals found.</p>
        </div>
      )}
    </div>
  )
}
