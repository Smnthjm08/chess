"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  accountLabel,
  authClient,
  MIN_PASSWORD_LENGTH,
  useSession,
  validateUsername,
} from "@/lib/auth-client";

export type AuthMode = "signin" | "signup";

/**
 * The heading copy lives outside the form because its container supplies the
 * chrome: `CardHeader` on the auth routes, `DialogHeader` in the dialog.
 */
export function useAuthCopy() {
  const { data: session } = useSession();
  const user = session?.user ?? null;

  if (user && !user.isAnonymous) {
    return {
      title: "Already signed in",
      description: `You are signed in as ${accountLabel(user)}.`,
    };
  }

  if (user) {
    return {
      title: "Keep your games",
      description: `You are playing as ${accountLabel(user)}. Create an account and the games you have already played come with you.`,
    };
  }

  return {
    title: "Sign in",
    description:
      "A guest account is enough to play — pick a username only if you want the games to stay yours.",
  };
}

/** A link when the caller has somewhere to send the user, a button otherwise. */
function ContinueButton({
  href,
  onClick,
  variant,
  className,
  children,
}: {
  href?: string;
  onClick: () => void;
  variant?: "outline";
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Button
        variant={variant}
        className={className}
        nativeButton={false}
        render={<Link href={href} />}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button variant={variant} className={className} onClick={onClick}>
      {children}
    </Button>
  );
}

export function AuthForm({
  defaultMode = "signin",
  continueHref,
  onSuccess,
  onDismiss,
}: {
  defaultMode?: AuthMode;
  /** Where "continue" goes on the auth routes; omitted in the dialog, which
   * leaves the user where they already are. */
  continueHref?: string;
  onSuccess: () => void;
  onDismiss: () => void;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  // The header dialog and the auth route can both be mounted at once, so the
  // field ids have to be unique per instance for the labels to stay correct.
  const uid = useId();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [pending, setPending] = useState<null | "guest" | "signout" | AuthMode>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const user = session?.user ?? null;
  const guest = user?.isAnonymous ? user : null;

  async function playAsGuest() {
    setError(null);
    setPending("guest");

    const { error: signInError } = await authClient.signIn.anonymous();

    setPending(null);
    if (signInError) {
      setError(signInError.message ?? "Could not start a guest session.");
      return;
    }

    onSuccess();
  }

  async function onSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const handle = identifier.trim();
    if (!handle || !signInPassword) {
      setError("Enter your username or email and your password.");
      return;
    }

    setPending("signin");

    // The username plugin adds its own endpoint; email sign-in stays on the
    // core one, so the field is routed on whether it looks like an address.
    const { error: signInError } = handle.includes("@")
      ? await authClient.signIn.email({
          email: handle,
          password: signInPassword,
        })
      : await authClient.signIn.username({
          username: handle,
          password: signInPassword,
        });

    setPending(null);
    if (signInError) {
      setError(signInError.message ?? "Could not sign you in.");
      return;
    }

    onSuccess();
  }

  async function onSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const handle = username.trim();
    const address = email.trim();

    const usernameError = validateUsername(handle);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!address.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (signUpPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setPending("signup");

    // With a guest session in the cookie, Better Auth links the two accounts
    // and `onLinkAccount` moves the guest's games onto this one.
    const { error: signUpError } = await authClient.signUp.email({
      email: address,
      password: signUpPassword,
      username: handle,
      name: handle,
    });

    setPending(null);
    if (signUpError) {
      setError(signUpError.message ?? "Could not create the account.");
      return;
    }

    onSuccess();
  }

  // The signed-in cases only settle once the session resolves on the client;
  // the form is what renders on the server, which is the common case anyway.
  if (user && !guest) {
    return (
      <div className="flex gap-2">
        <ContinueButton href={continueHref} onClick={onDismiss}>
          Continue
        </ContinueButton>
        <Button
          variant="outline"
          onClick={async () => {
            setError(null);
            setPending("signout");

            // Better Auth reports failures as a value, not an exception, so
            // its callbacks are what actually catch a failed sign-out.
            await authClient.signOut({
              fetchOptions: {
                onError: ({ error }) => {
                  setError(error.message ?? "Could not sign you out.");
                },
                onSuccess: () => onSuccess(),
              },
            });

            setPending(null);
          }}
          disabled={pending !== null}
        >
          {pending === "signout" ? "Signing out…" : "Sign out"}
        </Button>
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guest ? (
        <ContinueButton
          href={continueHref}
          onClick={onDismiss}
          variant="outline"
          className="w-full"
        >
          Keep playing as {accountLabel(guest)}
        </ContinueButton>
      ) : (
        <Button
          className="w-full"
          onClick={playAsGuest}
          disabled={pending !== null || sessionPending}
        >
          {pending === "guest" ? "Starting…" : "Play as guest"}
        </Button>
      )}

      <FieldSeparator>or</FieldSeparator>

      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as AuthMode);
          setError(null);
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="pt-4">
          <form className="space-y-4" onSubmit={onSignIn}>
            <Field>
              <FieldLabel htmlFor={`identifier-${uid}`}>
                Username or email
              </FieldLabel>
              <Input
                id={`identifier-${uid}`}
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`signin-password-${uid}`}>
                Password
              </FieldLabel>
              <Input
                id={`signin-password-${uid}`}
                name="password"
                type="password"
                autoComplete="current-password"
                value={signInPassword}
                onChange={(event) => setSignInPassword(event.target.value)}
              />
            </Field>

            {mode === "signin" && error && <FieldError>{error}</FieldError>}

            <Button
              type="submit"
              className="w-full"
              disabled={pending !== null}
            >
              {pending === "signin" ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="pt-4">
          <form className="space-y-4" onSubmit={onSignUp}>
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
                Letters, numbers, underscores and dots. This is the name at the
                board.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor={`email-${uid}`}>Email</FieldLabel>
              <Input
                id={`email-${uid}`}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`signup-password-${uid}`}>
                Password
              </FieldLabel>
              <Input
                id={`signup-password-${uid}`}
                name="password"
                type="password"
                autoComplete="new-password"
                value={signUpPassword}
                onChange={(event) => setSignUpPassword(event.target.value)}
              />
              <FieldDescription>
                At least {MIN_PASSWORD_LENGTH} characters.
              </FieldDescription>
            </Field>

            {mode === "signup" && error && <FieldError>{error}</FieldError>}

            <Button
              type="submit"
              className="w-full"
              disabled={pending !== null}
            >
              {pending === "signup"
                ? "Creating…"
                : guest
                  ? "Create account and keep my games"
                  : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
