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
        <TrendingUp className="w-5 h-5 text-pangea-400" />
        <h2 className="text-lg font-semibold text-slate-200">
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
            color: "text-slate-400",
            bg: "bg-slate-800/50",
          },
          {
            label: "Active Votes",
            value: activeProposals,
            icon: Vote,
            color: "text-pangea-400",
            bg: "bg-pangea-900/20",
          },
          {
            label: "Concluded",
            value: closedProposals,
            icon: Globe,
            color: "text-green-400",
            bg: "bg-green-900/20",
          },
          {
            label: "Votes Cast",
            value: totalVotes,
            icon: TrendingUp,
            color: "text-amber-400",
            bg: "bg-amber-900/20",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-3 ${bg} border border-slate-700/30`}>
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <p className="text-xl font-bold text-white">
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
