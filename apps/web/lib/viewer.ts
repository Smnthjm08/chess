import { headers } from "next/headers";
import { serverUrl } from "./env";

/**
 * The viewer's id, resolved during the server render by forwarding the request
 * cookie to Better Auth. `credentials: "include"` does nothing on the server,
 * so without this a server component cannot tell who is looking — and the seat
 * controls would have to wait for a client round-trip before rendering.
 */
export async function getViewerId(): Promise<string | null> {
  const cookie = (await headers()).get("cookie");

  if (!cookie) return null;

  try {
    // Every game page render blocks on this, so it fails open rather than
    // hanging: on a timeout the page renders as signed-out and `useSession`
    // corrects it on the client a moment later.
    const response = await fetch(`${serverUrl}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return null;

    const session = (await response.json()) as {
      user?: { id?: string };
    } | null;

    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
