# PULSE: case study

PULSE is a self-initiated concept project: a SaaS analytics workspace for a fictional design studio, Fernhill Studio.
It has no real customers, no production integrations and no business behind its numbers. Every figure is generated
demo data, and the interface says so.

## Objective

Build a dashboard that a studio owner could read in a minute and trust. That meant three goals:

1. **A distinctive identity.** It should not look like an admin template. The visual direction is botanical green and
   ivory, with a serif display face against a clean sans.
2. **Numbers that agree with each other.** Every chart, KPI, table and CSV export is derived from the same ledger and
   reconciles to the cent.
3. **Interactions that really work.** Filters, sorting, pagination, drawers, exports and settings work in every theme,
   at every screen size and from the keyboard.

## Design

- **Palette.** A deep botanical green sidebar, ivory work surfaces, and gold for small accents and eyebrows. Dark mode
  is designed in its own right (deep green surfaces with ivory ink), not an inverted copy of light mode.
- **Type.** Cormorant Garamond for page titles and headline figures, DM Sans for interface text, and tabular figures
  wherever numbers line up in columns.
- **Hierarchy.** Each page opens with a sentence that states the headline, for example "Fernhill Studio earned $57,548
  from 350 completed orders…". KPIs come next, then charts, then detail.
- **Charts.**
  - One axis per chart, thin marks, and a dashed line for the comparison period.
  - The peak is labelled directly on the chart.
  - Every chart has a written summary and its data as a table.
  - Status is never shown by colour alone: badges carry an icon and a label.

## Functionality

| Area | What it does |
| --- | --- |
| Overview | Greeting and headline, period picker with comparison, four KPIs with definitions, revenue trend, revenue by category, revenue against expenses, acquisition by channel, recent transactions, top products |
| Analytics | Metric selector (revenue, orders, new customers, conversion), summary statistics, period comparison table, channel breakdown, transaction volume by outcome |
| Reports | Summary, revenue by day/week/month, products and channels; four CSV exports generated in the browser |
| Customers | Search, status filter, sorting, pagination, and a detail drawer with lifetime figures and recent transactions |
| Transactions | Search across ID, customer, product and payment method; status and date filters; sorting; pagination; detail drawer |
| Products | Four leader cards, search, sorting, and a ranked comparison against the previous period by revenue, units or conversion |
| Settings | Workspace name (validated), theme, display currency (USD, EUR or GBP at fixed demo rates), default date range, chart animation, notification categories |
| Shell | Sidebar that narrows to an icon rail on tablets, mobile drawer, workspace search (press `/`), notifications menu, profile menu, light and dark themes with no flash on load |

## Architecture

- **Server-first.** Pages are React Server Components rendered with Next.js Partial Prerendering. The heading and
  frame arrive at once, and the computed content streams in behind Suspense skeletons. Client components are limited
  to charts, menus, drawers, URL-bound controls and the settings form.
- **URL as state.** Date range, comparison, filters, sorting, page and chart metric all live in the query string.
  Every view is linkable and survives a refresh, and the back button behaves as expected.
- **Typed view models.** Each page has a pure `build*` function in `src/lib/`, such as `buildOverview` or
  `buildProductPerformance`. It turns the dataset and the URL state into exactly what the page renders, so the logic
  is unit-tested without a browser.
- **One ledger.** The dataset is generated deterministically from a fixed seed. Daily traffic converts into customers,
  customers place orders, and revenue, refunds, product figures and notifications all derive from those orders.
- **Money as integers.** Amounts are integer cents. Conversion to EUR or GBP happens only at display time, with
  largest-remainder rounding so the parts still add up to the total.
- **Preferences without a backend.** Settings are stored in a first-party cookie, so the server renders the chosen
  currency and period on the first request. No account or remote service is involved.

## Technology

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict, no `any`) · Tailwind CSS 4 · Radix UI
primitives · Recharts · Lucide icons · Vitest · Playwright · axe-core

## Quality

- Unit tests cover calculations, filtering, formatting, CSV escaping, settings parsing, and checks that every view
  reconciles with the ledger.
- Browser tests run every route at desktop size and on a Pixel 7. They cover keyboard use of every menu, drawer and
  dialog, CSV downloads compared row by row with the on-screen preview, and settings persistence.
- An automated WCAG 2.2 A/AA scan (axe-core) runs on every route in light and dark mode, and on each overlay.
- Lighthouse was measured on the production build; the results are in the README.
