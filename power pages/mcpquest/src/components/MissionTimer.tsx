import { formatDuration } from "../format";

interface Props {
  title: string;
  secondsLeft: number;
  maxSeconds: number;
}

/** Time left in this run, rather than an invented health or XP metric. */
export function MissionTimer({ title, secondsLeft, maxSeconds }: Props) {
  const percent = maxSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / maxSeconds) * 100)) : 0;
  const state = percent <= 25 ? "urgent" : percent <= 50 ? "warning" : "normal";
  const message = secondsLeft === 0 ? "Time is up" : state === "urgent" ? "Time running low" : state === "warning" ? "Time getting short" : "Time remaining";

  return (
    <div className={`mission-hud is-${state}`} aria-label="Mission timer">
      <span>Time left</span>
      <strong title={title}>{title}</strong>
      <span>{formatDuration(secondsLeft)}</span>
      <div className="mission-health" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Time remaining" aria-valuetext={`${formatDuration(secondsLeft)} remaining`}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <p className="timer-status" role="status">{message}</p>
    </div>
  );
}
