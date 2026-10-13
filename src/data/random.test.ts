import { describe, expect, it } from "vitest";
import { createRandom } from "./random";

function sample(seed: string, count = 5) {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.next());
}

describe("createRandom", () => {
  it("repeats exactly for the same seed and differs between seeds", () => {
    expect(sample("pulse")).toEqual(sample("pulse"));
    expect(sample("pulse")).not.toEqual(sample("pulse-2"));
  });

  it("keeps forked streams independent of the parent's position", () => {
    const a = createRandom("pulse");
    const b = createRandom("pulse");
    a.next();
    a.next();
    expect(a.fork("traffic").next()).toBe(b.fork("traffic").next());
    expect(a.fork("traffic").next()).not.toBe(a.fork("names").next());
  });

  it("stays inside the requested ranges", () => {
    const random = createRandom("ranges");
    for (let i = 0; i < 2_000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const integer = random.int(3, 7);
      expect(Number.isInteger(integer) && integer >= 3 && integer <= 7).toBe(true);
      expect(random.poisson(4)).toBeGreaterThanOrEqual(0);
    }
  });

  it("produces the expected averages", () => {
    const random = createRandom("averages");
    const n = 20_000;
    let poisson = 0;
    let poissonLarge = 0;
    let noise = 0;
    let heads = 0;
    for (let i = 0; i < n; i++) {
      poisson += random.poisson(3);
      poissonLarge += random.poisson(60);
      noise += random.noise(0.2);
      if (random.chance(0.25)) heads += 1;
    }
    expect(poisson / n).toBeCloseTo(3, 1);
    expect(poissonLarge / n).toBeCloseTo(60, 0);
    expect(noise / n).toBeCloseTo(1, 1);
    expect(heads / n).toBeCloseTo(0.25, 1);
  });

  it("picks by weight and never picks a zero weight", () => {
    const random = createRandom("weights");
    const counts = { a: 0, b: 0, never: 0 };
    const items = [
      { id: "a" as const, weight: 3 },
      { id: "b" as const, weight: 1 },
      { id: "never" as const, weight: 0 },
    ];
    for (let i = 0; i < 8_000; i++) counts[random.weighted(items, (item) => item.weight).id] += 1;
    expect(counts.never).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(2.6);
    expect(counts.a / counts.b).toBeLessThan(3.4);
    expect(() => random.pick([])).toThrow(RangeError);
  });
});
