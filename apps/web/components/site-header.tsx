"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { profileHandle } from "@/lib/api";
import { accountLabel, authClient, useSession } from "@/lib/auth-client";

function AccountMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  if (isPending) return <Skeleton className="size-8 rounded-full" />;

  const user = session?.user;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <AuthDialog defaultMode="signin">
          <Button size="sm" variant="ghost">
            Sign in
          </Button>
        </AuthDialog>
        <AuthDialog defaultMode="signup">
          <Button size="sm">Create account</Button>
        </AuthDialog>
      </div>
    );
  }

  const label = accountLabel(user);
  const handle = profileHandle({
    id: user.id,
    username: user.username ?? null,
  });

  async function runSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    // Better Auth reports failures as a value, not an exception, so a
    // try/catch would treat a failed sign-out as a success. Its own callbacks
    // are the typed way in — the returned `error` is declared as always null.
    await authClient.signOut({
      fetchOptions: {
        onError: ({ error }) => {
          toast.error(error.message ?? "Could not sign you out.");
        },
        onSuccess: () => {
          setConfirmingSignOut(false);
          router.refresh();
        },
      },
    });

    setSigningOut(false);
  }

  return (
    <div className="flex items-center gap-2">
      {user.isAnonymous && (
        <AuthDialog defaultMode="signup">
          <Button size="sm">Save your games</Button>
        </AuthDialog>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={`Account menu for ${label}`}
              disabled={signingOut}
            >
              <Avatar size="sm">
                <AvatarFallback>
                  {label.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span>{label}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {user.isAnonymous ? "Guest account" : `@${user.username}`}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            nativeButton={false}
            render={<Link href={`/u/${handle}`} />}
          >
            <UserIcon />
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              // A guest has no credentials to sign back in with, so signing
              // out strands their games for good — make them confirm it.
              user.isAnonymous ? setConfirmingSignOut(true) : runSignOut()
            }
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmingSignOut} onOpenChange={setConfirmingSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of your guest account?</AlertDialogTitle>
            <AlertDialogDescription>
              Guest accounts have no password, so this one cannot be recovered.
              You will lose access to {label}&apos;s games. Create an account
              instead and they come with you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={runSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-hairline border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="text-title-sm font-semibold tracking-tight">
          Chess
        </Link>

        <nav className="text-muted-foreground flex items-center gap-4 text-sm">
          <Link
            href="/lobby"
            className="hover:text-foreground transition-colors"
          >
            Lobby
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
