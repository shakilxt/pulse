import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";
import { Pagination } from "./pagination";
import { STATUS_META, StatusBadge, type BadgeStatus } from "./status-badge";

/** Server-rendered markup checks: the table pieces work as plain HTML before any JavaScript loads. */

describe("StatusBadge", () => {
  it("always pairs the colour with an icon and a word", () => {
    for (const status of Object.keys(STATUS_META) as BadgeStatus[]) {
      const html = renderToStaticMarkup(<StatusBadge status={status} />);
      expect(html).toContain(`</svg>${STATUS_META[status].label}</span>`);
      expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    }
  });
});

describe("Pagination", () => {
  const pageHref = (page: number) => (page === 1 ? "/t?q=ana" : `/t?q=ana&page=${page}`);

  it("links every page with the filters kept and marks the current one", () => {
    const html = renderToStaticMarkup(
      <Pagination
        page={{ page: 2, pageCount: 3, totalRows: 25, firstRow: 11, lastRow: 20 }}
        pageHref={pageHref}
        noun="transactions"
      />,
    );
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("11–20 of 25 transactions");
    const current = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0];
    expect(current).toContain('href="/t?q=ana&amp;page=2"');
    expect(html).toContain('href="/t?q=ana"');
    expect(html).toContain('aria-label="Next page"');
  });

  it("disables the edges without dead links", () => {
    const html = renderToStaticMarkup(
      <Pagination page={{ page: 1, pageCount: 2, totalRows: 12, firstRow: 1, lastRow: 10 }} pageHref={pageHref} noun="rows" />,
    );
    expect(html).toMatch(/<a aria-disabled="true" aria-label="Previous page" role="link"/);
    expect(html).not.toMatch(/<a[^>]*href="[^"]*"[^>]*aria-label="Previous page"/);
  });

  it("hides the page links when everything fits on one page", () => {
    const html = renderToStaticMarkup(
      <Pagination page={{ page: 1, pageCount: 1, totalRows: 0, firstRow: 0, lastRow: 0 }} pageHref={pageHref} noun="customers" />,
    );
    expect(html).toContain("No customers");
    expect(html).not.toContain("Pagination");
  });
});

describe("DataTable", () => {
  interface Row {
    id: string;
    name: string;
    amount: number;
  }
  const columns: DataTableColumn<Row, "name" | "amount">[] = [
    { id: "name", header: "Name", sortKey: "name", rowHeader: true, cell: (row) => row.name },
    {
      id: "amount",
      header: "Amount",
      sortKey: "amount",
      initialDirection: "desc",
      align: "end",
      hideBelow: "md",
      cell: (row) => row.amount,
    },
    { id: "id", header: "ID", cell: (row) => row.id },
  ];
  const rows: Row[] = [
    { id: "R-1", name: "Ana", amount: 10 },
    { id: "R-2", name: "Bo", amount: 20 },
  ];

  it("captions the table, marks row headers and announces the active sort", () => {
    const html = renderToStaticMarkup(
      <DataTable
        caption="Demo rows"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        sort={{ key: "amount", direction: "desc" }}
        sortHref={(key, direction) => `/t?sort=${key}.${direction}`}
      />,
    );
    expect(html).toContain('<caption class="sr-only">Demo rows</caption>');
    expect(html.match(/<th scope="row"/g)).toHaveLength(2);
    expect(html.match(/aria-sort=/g)).toHaveLength(1);
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('href="/t?sort=name.asc"');
    expect(html).toContain(", sort ascending");
    expect(html).toContain("hidden md:table-cell");
  });

  it("asks for each column's natural first direction", () => {
    const calls: Array<[string, string]> = [];
    renderToStaticMarkup(
      <DataTable
        caption="Demo rows"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        sort={{ key: "name", direction: "asc" }}
        sortHref={(key, direction) => {
          calls.push([key, direction]);
          return "#";
        }}
      />,
    );
    expect(calls).toEqual([
      ["name", "asc"],
      ["amount", "desc"],
    ]);
  });

  it("renders the empty state across all columns", () => {
    const html = renderToStaticMarkup(
      <DataTable caption="Demo rows" columns={columns} rows={[]} getRowId={(row) => row.id} empty={<p>Nothing here</p>} />,
    );
    expect(html).toContain('<td colSpan="3"><p>Nothing here</p></td>');
  });
});
