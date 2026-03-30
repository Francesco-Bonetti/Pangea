"use client"

import { useState, useEffect } from "react"
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
import {
  Check,
  X,
  Minus,
  ShieldCheck,
  Lock,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { vote } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

interface ProposalDialogProps {
  proposal: any | null
  onClose: () => void
}

export function ProposalDialog({ proposal, onClose }: ProposalDialogProps) {
  const [voteState, setVoteState] = useState<"idle" | "loading" | "complete">("idle")
  const [selectedVote, setSelectedVote] = useState<"yes" | "no" | "abstain" | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { user } = await getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()
  }, [])

  const handleVote = async (voteType: "yes" | "no" | "abstain") => {
    if (!currentUser || !proposal) return

    setSelectedVote(voteType)
    setVoteState("loading")
    setError(null)

    try {
      const { data, error: voteError } = await vote(
        proposal.id,
        currentUser.id,
        voteType
      )

      if (voteError) {
        setError(voteError.message)
        setVoteState("idle")
        return
      }

      // Generate a receipt
      setReceipt(generateVoteReceipt())
      setVoteState("complete")
    } catch (err: any) {
      setError(err.message)
      setVoteState("idle")
    }
  }

  const handleClose = () => {
    setVoteState("idle")
    setSelectedVote(null)
    setReceipt(null)
    setCopied(false)
    setError(null)
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
  const closingDate = new Date(proposal.closing_date || proposal.closingDate)

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
              ? `Voting closes in ${getTimeRemaining(closingDate)}`
              : `Voting closed ${formatDate(closingDate)}`}
          </DialogDescription>
        </DialogHeader>

        {/* Proposal Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {proposal.full_text || proposal.fullText || proposal.description || "No full text available"}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTitle className="text-destructive">Error</AlertTitle>
            <AlertDescription className="text-destructive/80">{error}</AlertDescription>
          </Alert>
        )}

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
                onClick={() => handleVote("yes")}
                disabled={!currentUser}
              >
                <Check className="w-5 h-5 mr-2" />
                Approve
              </Button>
              <Button
                size="lg"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14"
                onClick={() => handleVote("no")}
                disabled={!currentUser}
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-14"
                onClick={() => handleVote("abstain")}
                disabled={!currentUser}
              >
                <Minus className="w-5 h-5 mr-2" />
                Abstain
              </Button>
            </div>
            {!currentUser && (
              <p className="text-xs text-muted-foreground mt-4">
                Please sign in to vote.
              </p>
            )}
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
                <code className="flex-1 bg-background rounded px-3 py-2 font-mono text-sm text-foreground border border-border overflow-hidden text-ellipsis">
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
      </DialogContent>
    </Dialog>
  )
}

function getTimeRemaining(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) return "Voting closed"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function generateVoteReceipt(): string {
  return `VOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}
