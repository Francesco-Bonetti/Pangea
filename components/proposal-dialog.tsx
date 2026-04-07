"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import {
  Check,
  X,
  Minus,
  ShieldCheck,
  Lock,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { type Proposal, getTimeRemaining, generateVoteReceipt } from "@/lib/proposals"

interface ProposalDialogProps {
  proposal: Proposal | null
  onClose: () => void
}

export function ProposalDialog({ proposal, onClose }: ProposalDialogProps) {
  const [voteState, setVoteState] = useState<"idle" | "loading" | "complete">("idle")
  const [selectedVote, setSelectedVote] = useState<"approve" | "reject" | "abstain" | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleVote = (vote: "approve" | "reject" | "abstain") => {
    setSelectedVote(vote)
    setVoteState("loading")

    setTimeout(() => {
      setReceipt(generateVoteReceipt())
      setVoteState("complete")
    }, 2000)
  }

  const handleClose = () => {
    setVoteState("idle")
    setSelectedVote(null)
    setReceipt(null)
    setCopied(false)
    onClose()
  }

  const copyReceipt = () => {
    if (receipt) {
      navigator.clipboard.writeText(receipt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!proposal) return null

  const isOpen = proposal.status === "open"

  return (
    <Dialog open={!!proposal} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-muted-foreground">
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
          <DialogTitle className="text-xl text-balance">{proposal.title}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {isOpen
              ? `Voting closes in ${getTimeRemaining(proposal.closingDate)}`
              : `Voting closed ${formatDate(proposal.closingDate)}`}
          </DialogDescription>
        </DialogHeader>

        {/* Proposal Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {proposal.fullText}
          </div>
        </div>

        {/* Voting Section */}
        {isOpen && voteState === "idle" && (
          <div className="border-t border-border pt-6 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-4">
              Cast Your Vote
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14"
                onClick={() => handleVote("approve")}
              >
                <Check className="w-5 h-5 mr-2" />
                Approve
              </Button>
              <Button
                size="lg"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14"
                onClick={() => handleVote("reject")}
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-14"
                onClick={() => handleVote("abstain")}
              >
                <Minus className="w-5 h-5 mr-2" />
                Abstain
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isOpen && voteState === "loading" && (
          <div className="border-t border-border pt-6 mt-4">
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner className="w-8 h-8 text-primary mb-4" />
              <p className="text-sm text-muted-foreground text-center animate-pulse">
                Encrypting vote and anchoring to Constitutional CI/CD protocol...
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {isOpen && voteState === "complete" && (
          <div className="border-t border-border pt-6 mt-4 space-y-4">
            <Alert className="border-primary/50 bg-primary/10">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <AlertTitle className="text-primary">Vote Successfully Recorded</AlertTitle>
              <AlertDescription className="text-primary/80">
                Your {selectedVote} vote has been cryptographically sealed and anchored to the Constitutional Ledger.
              </AlertDescription>
            </Alert>

            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Verifiable Vote Receipt (Save this)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background rounded px-3 py-2 font-mono text-sm text-foreground border border-border">
                  {receipt}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyReceipt}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results for Closed Proposals */}
        {!isOpen && proposal.results && (
          <div className="border-t border-border pt-6 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-4">
              Voting Results
            </h4>

            <div className="space-y-4">
              {/* Stacked Bar */}
              <div className="h-8 rounded-md overflow-hidden flex">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${proposal.results.approve}%` }}
                />
                <div
                  className="bg-destructive h-full transition-all"
                  style={{ width: `${proposal.results.reject}%` }}
                />
                <div
                  className="bg-muted h-full transition-all"
                  style={{ width: `${proposal.results.abstain}%` }}
                />
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span className="text-xs text-muted-foreground">Approve</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {proposal.results.approve}%
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-destructive" />
                    <span className="text-xs text-muted-foreground">Reject</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {proposal.results.reject}%
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Abstain</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {proposal.results.abstain}%
                  </p>
                </div>
              </div>

              {/* Verification Badge */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Result mathematically certified by the Pangean Protocol
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
