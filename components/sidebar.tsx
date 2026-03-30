"use client"

import { cn } from "@/lib/utils"
import {
  Vote,
  Archive,
  GitBranch,
  Fingerprint,
  Hexagon,
} from "lucide-react"

interface SidebarProps {
  activeNav: string
  onNavChange: (nav: string) => void
  currentCitizen?: any
}

const navItems = [
  { id: "active", label: "Active Proposals", icon: Vote },
  { id: "archive", label: "Historical Archive", icon: Archive },
  { id: "delegations", label: "Liquid Delegations", icon: GitBranch },
  { id: "ssid", label: "My SSID", icon: Fingerprint },
]

export function Sidebar({ activeNav, onNavChange, currentCitizen }: SidebarProps) {
  const getInitials = () => {
    if (currentCitizen?.user_name) {
      return currentCitizen.user_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    }
    return "PN"
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo and Title */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Hexagon className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground tracking-tight">
              Agora Pangea
            </h1>
            <p className="text-xs text-muted-foreground">
              Digital Republic
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === "active" && (
                    <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                      4
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Protocol Status</span>
          </div>
          <p className="text-xs text-sidebar-foreground font-mono">
            CI/CD: <span className="text-primary">SYNCED</span>
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Block: #4,821,093
          </p>
        </div>
      </div>
    </aside>
  )
}
