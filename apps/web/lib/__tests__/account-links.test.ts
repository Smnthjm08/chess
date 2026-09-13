import { describe, expect, test } from "bun:test";
import { accountLinks } from "../account-links";

const labels = (links: { label: string }[]) => links.map((link) => link.label);

describe("accountLinks", () => {
  test("signed out gets both ways in", () => {
    expect(labels(accountLinks(null))).toEqual(["Sign in", "Create account"]);
    expect(labels(accountLinks(undefined))).toEqual([
      "Sign in",
      "Create account",
    ]);
  });

  // The bug: these used to show to everyone, signed in or not.
  test("an account is never offered sign in or sign up", () => {
    const links = accountLinks({
      id: "u1",
      username: "magnus",
      isAnonymous: false,
    });

    expect(labels(links)).not.toContain("Sign in");
    expect(labels(links)).not.toContain("Create account");
    expect(labels(links)).toEqual(["Profile"]);
  });

  test("a guest is offered the upgrade, not a sign-in", () => {
    const links = accountLinks({ id: "g1", username: null, isAnonymous: true });

    expect(labels(links)).toEqual(["Profile", "Save your games"]);
    expect(labels(links)).not.toContain("Sign in");
  });

  test("the guest upgrade goes to the signup form", () => {
    const links = accountLinks({ id: "g1", isAnonymous: true });

    expect(links.find((link) => link.label === "Save your games")?.href).toBe(
      "/signup",
    );
  });

  test("an account's profile is addressed by username", () => {
    const [profile] = accountLinks({ id: "u1", username: "magnus" });

    expect(profile?.href).toBe("/u/magnus");
  });

  // Guests never get a username, so their profile falls back to the id.
  test("a guest's profile is addressed by id", () => {
    const [profile] = accountLinks({
      id: "g1",
      username: null,
      isAnonymous: true,
    });

    expect(profile?.href).toBe("/u/g1");
  });
});
