interface Props {
  samples: { tool: string; text: string }[];
}

function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // The generator clips long results, so a sample may be cut off mid-record: show it as it is.
    return text;
  }
}

/** The records the game was written from. Ids and values a requirement needs can be found here. */
export function SamplesPanel({ samples }: Props) {
  if (samples.length === 0) return null;
  return (
    <details className="samples">
      <summary>Sample records ({samples.length})</summary>
      <p className="field-help">These come from the system you are working with. Use them to find real ids, names and values.</p>
      {samples.map((s, i) => (
        <section key={`${s.tool}-${i}`} aria-label={`Sample from ${s.tool}`}>
          <p className="flow-kicker">{s.tool}</p>
          <pre className="raw">{pretty(s.text)}</pre>
        </section>
      ))}
    </details>
  );
}
