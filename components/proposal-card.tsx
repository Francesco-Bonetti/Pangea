"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2 } from "lucide-react"
import { type Proposal, getTimeRemaining } from "@/lib/proposals"

interface ProposalCardProps {
  proposal: Proposal
  onClick: () => void
}

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const isOpen = proposal.status === "open"
  const timeText = isOpen
    ? getTimeRemaining(proposal.closingDate)
    : `Closed ${formatClosedDate(proposal.closingDate)}`

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 bg-card"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {proposal.id}
          </span>
          <Badge
            variant="outline"
            className={
              isOpen
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-muted-foreground/30 bg-muted text-muted-foreground"
            }
          >
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
        <h3 className="font-semibold text-foreground leading-tight mt-2 text-balance">
          {proposal.title}
        </h3>
      </CardHeader>
      <CardContent className="pt-0">
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-md p-3 mb-4">
          {proposal.summary}
        </pre>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isOpen ? (
            <Clock className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>{timeText}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function formatClosedDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  return `${days} days ago`
}
