export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-[#0c1220]">
      {/* Navbar skeleton */}
      <div className="h-16 border-b border-slate-700 bg-slate-950/95" />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 skeleton rounded" />
            <div className="w-32 h-7 skeleton" />
          </div>
          <div className="w-36 h-9 skeleton rounded-lg" />
        </div>

        {/* Search skeleton */}
        <div className="w-full h-10 skeleton rounded-lg mb-4" />

        {/* Conversation skeletons */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-11 h-11 skeleton rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 skeleton" />
                <div className="w-48 h-3 skeleton" />
              </div>
              <div className="w-10 h-3 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
