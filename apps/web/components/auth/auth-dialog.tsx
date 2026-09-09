"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthForm,
  useAuthCopy,
  type AuthMode,
} from "@/components/auth/auth-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Signing in from a dialog keeps the page — and on `/game/[gameId]` the open
 * socket and the board state — instead of unmounting it for a round trip
 * through `/login?next=`. `router.refresh()` is what re-renders the server
 * components that read the session.
 */
export function AuthDialog({
  defaultMode = "signin",
  children,
}: {
  defaultMode?: AuthMode;
  /** The trigger element; rendered by the dialog so it owns the open state. */
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { title, description } = useAuthCopy();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <AuthForm
          defaultMode={defaultMode}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          onDismiss={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
