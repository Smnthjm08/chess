import Link from "next/link";
import { Button } from "@/components/ui/button";
import { profileGamesHref, type ProfileFilter } from "@/lib/profile";

export function ProfilePagination({
  handle,
  filter,
  page,
  totalPages,
}: {
  handle: string;
  filter: ProfileFilter;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const previous = page > 1;
  const next = page < totalPages;

  return (
    <nav
      aria-label="Pages"
      className="mt-6 flex items-center justify-between gap-4"
    >
      {previous ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={profileGamesHref(handle, filter, page - 1)} />}
        >
          Previous
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}

      <span className="text-muted-foreground text-xs tabular-nums">
        Page {page} of {totalPages}
      </span>

      {next ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={profileGamesHref(handle, filter, page + 1)} />}
        >
          Next
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}
