import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`card p-5 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <Icon
          className="w-5 h-5 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--primary)" }}
        >
          {value.toLocaleString()}
        </p>
        {trend && (
          <p
            className="text-xs font-medium mt-1"
            style={{ color: "var(--success)" }}
          >
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
