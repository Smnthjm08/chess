import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PageNav({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Rendered as a disabled button rather than omitted, so the row does not
  // reflow between the first page and the rest.
  const step = (target: number, label: string) =>
    target >= 1 && target <= totalPages ? (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={href(target)} />}
      >
        {label}
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled>
        {label}
      </Button>
    );

  return (
    <nav
      aria-label="Pages"
      className="mt-6 flex items-center justify-between gap-4"
    >
      {step(page - 1, "Previous")}
      <span className="text-muted-foreground text-xs tabular-nums">
        Page {page} of {totalPages}
      </span>
      {step(page + 1, "Next")}
    </nav>
  );
}
