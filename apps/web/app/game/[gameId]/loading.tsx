import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors `LiveGame`'s grid so the board does not jump when it arrives. */
export default function GameLoading() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:py-12">
        <div className="mx-auto w-full max-w-[max(18rem,calc(100svh-15rem))] space-y-3 lg:max-w-none lg:space-y-0">
          <Skeleton className="h-10 lg:hidden" />
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-10 lg:hidden" />
        </div>

        <aside className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-40 rounded-xl max-lg:hidden" />
          <Skeleton className="h-64 rounded-xl max-lg:hidden" />
        </aside>
      </main>
    </div>
  );
}
