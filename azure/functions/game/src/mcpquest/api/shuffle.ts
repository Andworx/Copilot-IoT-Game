/**
 * Randomness for building a play.
 *
 * In the browser every play is random. On the server a play must be reproducible from its
 * seed, because the judge rebuilds the same cases on every request instead of storing them.
 * `withSeed` swaps in a deterministic source for the duration of a synchronous build.
 */

type Source = () => number;

function cryptoSource(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

let source: Source = cryptoSource;

/** FNV-1a over the seed text, then mulberry32. Not secure; it only needs to be stable. */
function seeded(seed: string): Source {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/** Runs a synchronous builder with a deterministic random source. Do not await inside `fn`. */
export function withSeed<T>(seed: string, fn: () => T): T {
  const previous = source;
  source = seeded(seed);
  try {
    return fn();
  } finally {
    source = previous;
  }
}

/** Fisher-Yates shuffle returning a new array. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(source() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A random id for sessions and claim tokens (always cryptographic). */
export function randomHex(bytes = 12): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
