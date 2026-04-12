import { Suspense } from "react";
import SearchPageClient from "@/components/social/SearchPageClient";
import { Loader2 } from "lucide-react";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
