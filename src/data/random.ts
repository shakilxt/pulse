/**
 * Seeded pseudo-random numbers for the mock data generator.
 *
 * sfc32 seeded through cyrb128: small, fast and fully deterministic, so the
 * same seed always produces the same dataset. Named streams (`fork`) keep the
 * parts of the generator independent, so tuning one part does not reshuffle
 * the others.
 */

function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(seedA: number, seedB: number, seedC: number, seedD: number): () => number {
  let a = seedA;
  let b = seedB;
  let c = seedC;
  let d = seedD;
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Random {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Picks an item with probability proportional to its weight. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Standard normal variate (Box–Muller). */
  normal(): number;
  /** Multiplicative noise with mean 1: exp(σ·z − σ²/2). */
  noise(sigma: number): number;
  /** Poisson-distributed count with mean `lambda`. */
  poisson(lambda: number): number;
  /** Exponentially distributed value with the given mean. */
  exponential(mean: number): number;
  /** An independent stream derived from this seed and a label. */
  fork(label: string): Random;
}

export function createRandom(seed: string): Random {
  const [a, b, c, d] = cyrb128(seed);
  const generate = sfc32(a, b, c, d);
  // Discard the first outputs, which correlate with the seed.
  for (let i = 0; i < 12; i++) generate();

  const random: Random = {
    next: generate,
    int(min, max) {
      return min + Math.floor(generate() * (max - min + 1));
    },
    chance(probability) {
      return generate() < probability;
    },
    pick(items) {
      const item = items[Math.floor(generate() * items.length)];
      if (item === undefined) throw new RangeError("Cannot pick from an empty list");
      return item;
    },
    weighted(items, weight) {
      const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
      let target = generate() * total;
      for (const item of items) {
        target -= Math.max(0, weight(item));
        if (target < 0) return item;
      }
      const last = items.at(-1);
      if (last === undefined) throw new RangeError("Cannot pick from an empty list");
      return last;
    },
    normal() {
      const u = 1 - generate(); // (0, 1], keeps log finite
      const v = generate();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    noise(sigma) {
      return Math.exp(sigma * random.normal() - (sigma * sigma) / 2);
    },
    poisson(lambda) {
      if (lambda <= 0) return 0;
      if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * random.normal()));
      const limit = Math.exp(-lambda);
      let count = 0;
      let product = generate();
      while (product > limit) {
        count += 1;
        product *= generate();
      }
      return count;
    },
    exponential(mean) {
      return -Math.log(1 - generate()) * mean;
    },
    fork(label) {
      return createRandom(`${seed}/${label}`);
    },
  };
  return random;
}
