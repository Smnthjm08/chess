import { profileHandle } from "./api";

export type AccountLink = { href: string; label: string };

type AccountUser = {
  id: string;
  username?: string | null;
  isAnonymous?: boolean | null;
};

/**
 * The account links for someone whose session has resolved. Follows the same
 * three states as the header's account menu: signed out gets both ways in, a
 * guest is offered the upgrade that keeps their games, and an account needs
 * neither.
 */
export function accountLinks(
  user: AccountUser | null | undefined,
): AccountLink[] {
  if (!user) {
    return [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
    ];
  }

  const profile = {
    href: `/u/${profileHandle({ id: user.id, username: user.username ?? null })}`,
    label: "Profile",
  };

  // `/signup` renders the same form as the header's dialog, so a guest who
  // creates an account there keeps their games too.
  return user.isAnonymous
    ? [profile, { href: "/signup", label: "Save your games" }]
    : [profile];
}
