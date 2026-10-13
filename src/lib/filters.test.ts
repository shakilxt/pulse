import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeText, paginate, sortRows, tokenize } from "./filters";

describe("search", () => {
  it("normalises case, accents and whitespace", () => {
    expect(normalizeText("  Zoë   Ó'Brien ")).toBe("zoe o'brien");
    expect(tokenize("  Ana   VISA ")).toEqual(["ana", "visa"]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("requires every token to match some field", () => {
    const fields = ["Ana Lindqvist", "ana.lindqvist@example.com", "Visa ending 4821"];
    expect(matchesSearch(fields, tokenize("ana visa"))).toBe(true);
    expect(matchesSearch(fields, tokenize("lindq 4821"))).toBe(true);
    expect(matchesSearch(fields, tokenize("ana paypal"))).toBe(false);
    expect(matchesSearch(["Zoë Hart"], tokenize("zoe"))).toBe(true);
    expect(matchesSearch(fields, [])).toBe(true);
  });
});

describe("sortRows", () => {
  const rows = [
    { id: "C-3", name: "beta", amount: 200 as number | null },
    { id: "C-1", name: "Alpha", amount: 200 },
    { id: "C-10", name: "alpha 10", amount: null },
    { id: "C-2", name: "alpha 2", amount: 50 },
  ];

  it("sorts numbers in both directions with an id tie-breaker", () => {
    const ascending = sortRows(rows, (row) => row.amount, "asc", (row) => row.id);
    expect(ascending.map((row) => row.id)).toEqual(["C-2", "C-1", "C-3", "C-10"]);
    const descending = sortRows(rows, (row) => row.amount, "desc", (row) => row.id);
    expect(descending.map((row) => row.id)).toEqual(["C-1", "C-3", "C-2", "C-10"]);
  });

  it("keeps missing values last in either direction", () => {
    for (const direction of ["asc", "desc"] as const) {
      expect(sortRows(rows, (row) => row.amount, direction, (row) => row.id).at(-1)?.id).toBe("C-10");
    }
  });

  it("compares text case-insensitively with natural number order", () => {
    const byName = sortRows(rows, (row) => row.name, "asc", (row) => row.id);
    expect(byName.map((row) => row.name)).toEqual(["Alpha", "alpha 2", "alpha 10", "beta"]);
  });

  it("is independent of the input order and does not mutate it", () => {
    const shuffled = [rows[2], rows[0], rows[3], rows[1]].filter((row) => row !== undefined);
    const snapshot = [...shuffled];
    expect(sortRows(shuffled, (row) => row.amount, "desc", (row) => row.id)).toEqual(
      sortRows(rows, (row) => row.amount, "desc", (row) => row.id),
    );
    expect(shuffled).toEqual(snapshot);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 23 }, (_, index) => index + 1);

  it("slices the requested page", () => {
    expect(paginate(rows, 2, 10)).toEqual({
      rows: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      pageSize: 10,
      pageCount: 3,
      totalRows: 23,
      firstRow: 11,
      lastRow: 20,
    });
    expect(paginate(rows, 3, 10)).toMatchObject({ rows: [21, 22, 23], firstRow: 21, lastRow: 23 });
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(rows, 99, 10).page).toBe(3);
    expect(paginate(rows, 0, 10).page).toBe(1);
    expect(paginate(rows, -4, 10).page).toBe(1);
    expect(paginate(rows, Number.NaN, 10).page).toBe(1);
  });

  it("describes an empty result as one empty page", () => {
    expect(paginate([], 4, 10)).toEqual({
      rows: [],
      page: 1,
      pageSize: 10,
      pageCount: 1,
      totalRows: 0,
      firstRow: 0,
      lastRow: 0,
    });
  });
});
