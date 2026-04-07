"use client";

import PangeaTree from "@/components/PangeaTree";

interface DashboardClientProps {
  isGuest: boolean;
}

export default function DashboardClient({ isGuest }: DashboardClientProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PangeaTree isGuest={isGuest} />
    </div>
  );
}
