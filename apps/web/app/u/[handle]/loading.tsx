import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <Skeleton className="h-28 rounded-xl" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
