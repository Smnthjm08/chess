import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { LiveGame } from "@/components/game/live-game";
import { ApiError, getGame, type GameDetail } from "@/lib/api";
import { getViewerId } from "@/lib/viewer";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const viewerId = await getViewerId();

  let game: GameDetail;

  try {
    game = (await getGame(gameId)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />

      <LiveGame initialGame={game} viewerId={viewerId} />
    </div>
  );
}
