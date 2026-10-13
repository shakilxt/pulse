# PULSE

PULSE is a fictional SaaS analytics dashboard, built as a self-initiated portfolio concept. Every metric,
customer and transaction is illustrative demo data. There is no backend, authentication or live integration.

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the full specification.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix UI primitives ·
Lucide icons · Vitest · Playwright

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
