"use server";

import { auth } from "@repo/shared/auth/server";
import { headers } from "next/headers";

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id ?? null;
}
