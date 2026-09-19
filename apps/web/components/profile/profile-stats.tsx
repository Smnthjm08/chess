import { Card, CardContent } from "@/components/ui/card";
import type { ProfileStats, Record3 } from "@/lib/api";
import { cn } from "@/lib/utils";

const TOP_STATS: [
  key: "played" | "wins" | "losses" | "draws",
  label: string,
][] = [
  ["played", "Played"],
  ["wins", "Wins"],
  ["losses", "Losses"],
  ["draws", "Draws"],
];

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/** A W/L/D record as a proportional three-colour bar, empty record and all. */
function RecordBar({ record }: { record: Record3 }) {
  const total = record.wins + record.losses + record.draws;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="bg-muted flex h-1.5 overflow-hidden rounded-full">
      <div
        className="bg-success h-full"
        style={{ width: `${pct(record.wins)}%` }}
      />
      <div
        className="bg-destructive h-full"
        style={{ width: `${pct(record.losses)}%` }}
      />
      <div
        className="bg-warning h-full"
        style={{ width: `${pct(record.draws)}%` }}
      />
    </div>
  );
}

function RecordRow({ label, record }: { label: string; record: Record3 }) {
  const total = record.wins + record.losses + record.draws;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {total === 0
            ? "No games"
            : `${record.wins}–${record.losses}–${record.draws}`}
        </span>
      </div>
      <RecordBar record={record} />
    </div>
  );
}

const STREAK_LABEL: Record<"win" | "loss" | "draw", string> = {
  win: "win",
  loss: "loss",
  draw: "draw",
};

function StreakNote({ stats }: { stats: ProfileStats }) {
  const { current, bestWin } = stats.streak;

  const parts = [
    current &&
      current.length > 1 &&
      `On a ${current.length}-${STREAK_LABEL[current.outcome]} streak`,
    bestWin > 1 && `best streak ${bestWin} wins`,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return <p className="text-muted-foreground text-sm">{parts.join(" · ")}.</p>;
}

export function ProfileStatsPanel({ stats }: { stats: ProfileStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TOP_STATS.map(([key, label]) => (
          <Card key={key}>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">
                {stats[key]}
              </p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="space-y-1">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                stats.winRate !== null &&
                  stats.winRate >= 0.5 &&
                  "text-success",
              )}
            >
              {formatRate(stats.winRate)}
            </p>
            <p className="text-muted-foreground text-xs">Win rate</p>
          </CardContent>
        </Card>
      </div>

      {stats.played > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <StreakNote stats={stats} />

            <div className="grid gap-4 sm:grid-cols-2">
              <RecordRow label="As White" record={stats.byColour.white} />
              <RecordRow label="As Black" record={stats.byColour.black} />
            </div>

            {stats.byCategory.length > 0 && (
              <div className="space-y-3">
                {stats.byCategory.map((row) => (
                  <RecordRow
                    key={row.category}
                    label={row.category}
                    record={row}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
