/**
 * Generic search, sort and pagination for the record tables. They run on the
 * server against the full dataset; the browser only receives the visible page.
 */

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | null;

/** Lower-cases, strips accents and collapses whitespace, so "  Zoë " matches "zoe". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(query: string): string[] {
  const normalized = normalizeText(query);
  return normalized === "" ? [] : normalized.split(" ");
}

/**
 * True when every search token appears in at least one field. An empty query
 * matches everything. Tokens can match different fields ("ana visa").
 */
export function matchesSearch(fields: readonly string[], tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = fields.map(normalizeText);
  return tokens.every((token) => haystack.some((field) => field.includes(token)));
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Ascending comparison of two sort values. Nulls are handled by `sortRows`. */
function compareDefined(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Returns a sorted copy. Missing values always sort last, whichever the
 * direction, and ties fall back to `getId` ascending, so the order is fully
 * determined by the data and pagination never shuffles equal rows.
 */
export function sortRows<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection,
  getId: (row: T) => string,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((rowA, rowB) => {
    const a = getValue(rowA);
    const b = getValue(rowB);
    if (a === null || b === null) {
      if (a !== b) return a === null ? 1 : -1;
    } else {
      const order = compareDefined(a, b);
      if (order !== 0) return order * sign;
    }
    return collator.compare(getId(rowA), getId(rowB));
  });
}

export interface PageResult<T> {
  rows: T[];
  /** The page actually shown, clamped into the available pages. */
  page: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  /** 1-based position of the first and last visible rows; both 0 when empty. */
  firstRow: number;
  lastRow: number;
}

/** Slices one page, clamping out-of-range page numbers to the nearest real page. */
export function paginate<T>(rows: readonly T[], requestedPage: number, pageSize: number): PageResult<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / size));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.floor(requestedPage)), pageCount)
    : 1;
  const startIndex = (page - 1) * size;
  const pageRows = rows.slice(startIndex, startIndex + size);
  return {
    rows: pageRows,
    page,
    pageSize: size,
    pageCount,
    totalRows,
    firstRow: pageRows.length > 0 ? startIndex + 1 : 0,
    lastRow: startIndex + pageRows.length,
  };
}

export type PaginationItem = number | "gap";

/**
 * Page numbers to show around the current page: always the first and last,
 * the current page with one neighbour each side, and a gap marker wherever
 * pages are skipped. A gap never stands in for a single page, so the list
 * keeps a stable length (at most seven items) as the current page moves.
 */
export function paginationItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) return Array.from({ length: Math.max(1, pageCount) }, (_, index) => index + 1);
  const current = Math.min(Math.max(1, page), pageCount);
  let start = Math.max(2, current - 1);
  let end = Math.min(pageCount - 1, current + 1);
  // Near either edge, extend the window instead of showing a gap for one page.
  if (current <= 4) {
    start = 2;
    end = 5;
  } else if (current >= pageCount - 3) {
    start = pageCount - 4;
    end = pageCount - 1;
  }
  const items: PaginationItem[] = [1];
  if (start > 2) items.push("gap");
  for (let value = start; value <= end; value++) items.push(value);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}
