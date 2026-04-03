export default function LawsLoading() {
  return (
    <div className="min-h-screen bg-[#0c1220]">
      {/* Navbar placeholder */}
      <div className="h-16 bg-slate-950/80 border-b border-slate-800/50" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse mb-8 space-y-3">
          <div className="skeleton-text w-32 h-4" />
          <div className="skeleton-text w-72 h-8" />
          <div className="skeleton-text w-96 h-4" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 mb-8">
          <div className="flex-1 h-12 skeleton rounded-md" />
          <div className="flex-1 h-12 skeleton rounded-md" />
        </div>

        {/* Law tree skeletons */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="flex items-center gap-3">
                <div className="skeleton w-5 h-5 rounded" />
                <div className="skeleton-text flex-1 h-5" />
              </div>
              <div className="skeleton-text w-2/3 h-4 ml-8" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
