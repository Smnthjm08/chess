"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient, validateUsername } from "@/lib/auth-client";
import type { ProfileUser } from "@/lib/api";

export function EditProfileDialog({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialName = user.name;
  const initialUsername = user.displayUsername ?? user.username ?? "";
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);

  function onOpenChange(next: boolean) {
    setOpen(next);

    // Reopening after a cancel should not show the abandoned edits.
    if (next) {
      setName(initialName);
      setUsername(initialUsername);
      setError(null);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const handle = username.trim();
    const display = name.trim();

    const usernameError = validateUsername(handle);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!display) {
      setError("Display name cannot be empty.");
      return;
    }

    setPending(true);

    // `username` is what the plugin normalizes and enforces uniqueness on;
    // `displayUsername` keeps the casing as typed.
    const { error: updateError } = await authClient.updateUser({
      name: display,
      username: handle,
      displayUsername: handle,
    });

    setPending(false);

    if (updateError) {
      setError(updateError.message ?? "Could not save your profile.");
      return;
    }

    setOpen(false);
    toast.success("Profile updated.");

    // The profile URL carries the username, so a rename moves the page out
    // from under us — replace rather than refresh in place.
    router.replace(`/u/${handle.toLowerCase()}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Edit profile
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            This is how you appear at the board and in the lobby.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor={`name-${uid}`}>Display name</FieldLabel>
            <Input
              id={`name-${uid}`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`username-${uid}`}>Username</FieldLabel>
            <Input
              id={`username-${uid}`}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <FieldDescription>
              Letters, numbers, underscores and dots. Changing it changes your
              profile link.
            </FieldDescription>
          </Field>

          {error && <FieldError>{error}</FieldError>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
