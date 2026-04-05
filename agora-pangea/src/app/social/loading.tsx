export default function ForumLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="h-16 bg-[var(--card)] border-b border-[var(--border)]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse mb-8 space-y-3">
          <div className="skeleton-text w-56 h-8" />
          <div className="skeleton-text w-72 h-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar skeleton */}
          <div className="lg:col-span-1 space-y-4">
            <div className="skeleton h-12 rounded-lg" />
            <div className="skeleton-card space-y-3">
              <div className="skeleton-text w-20 h-4" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-text w-full h-8 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="lg:col-span-3 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-text w-3/4 h-5" />
                <div className="skeleton-text w-full h-4" />
                <div className="skeleton-text w-1/2 h-4" />
                <div className="flex justify-between pt-4 border-t border-[var(--border)]">
                  <div className="skeleton-text w-24 h-4" />
                  <div className="skeleton-text w-16 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
