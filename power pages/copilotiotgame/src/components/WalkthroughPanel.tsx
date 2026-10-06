import type { useWalkthrough } from "../hooks/useWalkthrough";

type Engine = ReturnType<typeof useWalkthrough>;

/** Presenter controls and talking point for the shared walkthrough engine. */
export function WalkthroughPanel({ walkthrough: w }: { walkthrough: Engine }) {
  if (!w.step) return <section className="walkthrough" aria-label="Architecture walkthrough"><button type="button" className="walkthrough-start" onClick={w.start}>Start walkthrough</button></section>;
  return <section className="walkthrough is-active" aria-label="Architecture walkthrough">
    <div className="walkthrough-text" role="status" aria-live="polite">
      <span>Step {w.index + 1} of {w.total}</span>
      <h2>{w.step.title}</h2>
      <p>{w.step.description}</p>
    </div>
    <div className="walkthrough-controls">
      <button type="button" onClick={w.previous} disabled={w.index === 0}>Previous</button>
      <button type="button" onClick={w.next} disabled={w.index === w.total - 1}>Next</button>
      <button type="button" onClick={w.togglePlaying} aria-pressed={w.playing} disabled={w.index === w.total - 1 && !w.playing}>{w.playing ? "Pause" : "Auto-play"}</button>
      <button type="button" onClick={w.start}>Restart</button>
      <button type="button" onClick={w.exit}>Exit</button>
    </div>
  </section>;
}
