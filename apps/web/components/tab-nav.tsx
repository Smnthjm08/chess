import Link from "next/link";
import { cn } from "@/lib/utils";

export function TabNav<K extends string>({
  tabs,
  active,
  href,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  href: (key: K) => string;
}) {
  return (
    <nav
      aria-label="Filter games"
      className="border-hairline flex gap-1 border-b"
    >
      {tabs.map(({ key, label }) => {
        const current = key === active;

        return (
          <Link
            key={key}
            href={href(key)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              current
                ? "border-foreground text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
