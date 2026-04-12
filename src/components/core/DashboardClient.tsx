"use client";

import PangeaTree from "@/components/governance/PangeaTree";

interface DashboardClientProps {
  isGuest: boolean;
}

export default function DashboardClient({ isGuest }: DashboardClientProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <PangeaTree isGuest={isGuest} />
    </div>
  );
}
