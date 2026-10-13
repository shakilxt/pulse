# PULSE

PULSE is a fictional SaaS analytics dashboard, built as a self-initiated portfolio concept. Every metric,
customer and transaction is illustrative demo data. There is no backend, authentication or live integration.

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the full specification.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix UI primitives ·
Recharts · Lucide icons · Vitest · Playwright

## Commands

| Command             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the development server                    |
| `npm run build`     | Production build                                |
| `npm run start`     | Serve the production build                      |
| `npm run typecheck` | Generate route types and run `tsc --noEmit`     |
| `npm run lint`      | ESLint                                          |
| `npm run test`      | Unit tests (Vitest)                             |
| `npm run e2e`       | Browser tests (Playwright, against `npm start`) |
| `npm run check`     | Typecheck, lint, unit tests and build           |

Requires Node.js 22 or later.

## Demo data

The dataset is generated on the server from a fixed seed (`src/data/generate.ts`), so every run produces the same
records and nothing depends on the current date. It covers 1 January 2024 to 30 September 2026 for the fictional
Fernhill Studio, and is simulated in the order a real business works: daily traffic per channel converts into new
customers, customers make purchases, and revenue, product performance, expenses and notifications all derive from
that ledger. Names are random combinations and every email uses the reserved `example.com` domain.

Pages read their state (date range, filters, sorting) from the URL and compute everything on the server; the browser
receives only the figures it shows. Charts are the only client-side drawing, and every chart also has a written
summary and a data table.

Money is stored as integer cents. Ratios are fractions, and changes in a ratio are reported in percentage points.
Metric definitions live in `src/lib/metrics.ts`; unit tests check that chart series, KPIs, product and channel
breakdowns all reconcile with the underlying transactions.
