import type { LeaderboardEntry } from "@mcpquest/types";
import { formatDuration } from "../format";

interface Props {
  entries: LeaderboardEntry[] | null;
  /** Highlights the row matching this nickname + score, if present. */
  highlight?: { nickname: string; score: number };
  error?: string | null;
}

export function Leaderboard({ entries, highlight, error }: Props) {
  if (error) return <p className="muted">Leaderboard unavailable right now.</p>;
  if (!entries) return <p className="muted">Loading leaderboard…</p>;
  if (entries.length === 0) return <p className="muted">No scores yet. Be the first.</p>;

  return (
    <table className="board">
      <caption className="visually-hidden">High scores</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Player</th>
          <th scope="col" className="num">
            Score
          </th>
          <th scope="col" className="num">
            Time
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const mine = highlight && entry.nickname === highlight.nickname && entry.score === highlight.score;
          return (
            <tr key={`${entry.rank}-${entry.nickname}`} className={mine ? "mine" : undefined}>
              <td>{entry.rank}</td>
              <td>{entry.nickname}</td>
              <td className="num">{entry.score}</td>
              <td className="num">{formatDuration(entry.durationSeconds)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
