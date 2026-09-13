"use client";

import Link from "next/link";
import { accountLinks } from "@/lib/account-links";
import { useSession } from "@/lib/auth-client";

const LINK = "hover:text-foreground transition-colors";

export function FooterNav() {
  const { data: session, isPending } = useSession();

  // Nothing session-dependent until the session resolves: rendering the
  // signed-out links while it loads would flash "Sign in" at someone who is.
  const links = isPending ? [] : accountLinks(session?.user);

  return (
    <nav className="flex gap-6">
      <Link href="/lobby" className={LINK}>
        Lobby
      </Link>

      {links.map((link) => (
        <Link key={link.href + link.label} href={link.href} className={LINK}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
