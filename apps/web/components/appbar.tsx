"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@repo/auth/client";
import { LogoutButton } from "./buttons/logout";

export function Appbar() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <nav className="border-b flex flex-row h-14 justify-between px-8 sm:px-12 py-4 items-center">
        <h3 className="font-extrabold">chess</h3>
        <div className="space-x-2 sm:space-x-4">
          <Link href="/signup">
            <Button size="sm" variant="default" disabled>
              Sign Up
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="sm" variant="default" disabled>
              Sign In
            </Button>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b flex flex-row h-14 justify-between px-8 sm:px-12 py-4 items-center">
      <Link href={"/"}>
        <h3 className="font-extrabold">chess</h3>
      </Link>

      {!data?.user ? (
        <div className="space-x-2 sm:space-x-4">
          <Link href="/signup">
            <Button size="sm" variant="default">
              Sign Up
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="sm" variant="default">
              Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <LogoutButton />
      )}
    </nav>
  );
}
