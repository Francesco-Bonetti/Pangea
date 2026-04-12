import LoadingSkeleton from "@/components/core/LoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navbar placeholder */}
      <div className="h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse mb-8">
          <div className="skeleton-text w-40 h-7 mb-2" />
          <div className="skeleton-text w-64 h-4" />
        </div>

        <div className="space-y-10">
          <LoadingSkeleton cards={3} showHeader />
          <LoadingSkeleton cards={2} showHeader />
        </div>
      </main>
    </div>
  );
}
