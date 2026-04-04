import { Globe, Users, FileText, Vote, TrendingUp } from "lucide-react";

interface PlatformStatsProps {
  totalUsers: number;
  totalProposals: number;
  totalVotes: number;
  activeProposals: number;
  closedProposals: number;
}

export default function PlatformStats({
  totalUsers,
  totalProposals,
  totalVotes,
  activeProposals,
  closedProposals,
}: PlatformStatsProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-fg-primary" />
        <h2 className="text-lg font-semibold text-fg">
          Pangea Global Statistics
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Registered Citizens",
            value: totalUsers,
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-900/20",
          },
          {
            label: "Total Proposals",
            value: totalProposals,
            icon: FileText,
            color: "text-fg-muted",
            bg: "bg-theme-card",
          },
          {
            label: "Active Votes",
            value: activeProposals,
            icon: Vote,
            color: "text-fg-primary",
            bg: "bg-pangea-900/20",
          },
          {
            label: "Concluded",
            value: closedProposals,
            icon: Globe,
            color: "text-fg-success",
            bg: "bg-success-tint",
          },
          {
            label: "Votes Cast",
            value: totalVotes,
            icon: TrendingUp,
            color: "text-amber-400",
            bg: "bg-warning-tint",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-3 ${bg} border border-theme/30`}>
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <p className="text-xl font-bold text-fg">
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
