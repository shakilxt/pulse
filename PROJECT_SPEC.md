# PULSE — Premium SaaS Analytics Dashboard

## 1. Project Overview

**Project name:** PULSE  
**Product category:** SaaS business analytics and intelligence  
**Purpose:** Fiverr portfolio showcase  
**Project type:** Interactive frontend demonstration  
**Target audience:** Startups, SaaS companies, e-commerce businesses, and clients looking for custom dashboards or full-stack web applications.

### Objective

Build a visually distinctive, responsive analytics dashboard using Next.js, React, TypeScript and Tailwind CSS.

PULSE should resemble a thoughtfully designed commercial software product, combining a premium visual identity with useful analytics, interactive charts, searchable tables, date filters and consistent navigation.

The product must not look like a generic admin template or a standard AI-generated dashboard.

This is a fictional portfolio concept. It does not represent a real analytics company or provide actual business analytics.

### Success priorities

1. Distinctive visual identity and excellent design quality.
2. Intuitive dashboard UX and information hierarchy.
3. Functional data visualizations and filters.
4. Consistent and realistic mock data.
5. Responsive desktop, tablet and mobile experiences.
6. Maintainable, strongly typed architecture.
7. Accessibility and performance.
8. Reliable interactions and production-build readiness.
9. Strong screenshots and a polished live portfolio demo.

## 2. Project Scope

### Included

- Analytics overview dashboard.
- Detailed revenue analytics.
- Customer analytics.
- Transaction history.
- Customer directory.
- Product and service performance.
- Date-range filters.
- Chart period selectors.
- Search, sorting and filtering.
- Pagination.
- Interactive sidebar and navigation.
- Notification dropdown with demo content.
- Profile and settings interfaces.
- Light and dark themes.
- Loading, empty and error states where appropriate.
- Responsive desktop, tablet and mobile layouts.
- Local typed mock data.
- Functional local CSV export.
- README and deployment preparation.

### Explicitly excluded

- Production authentication.
- Real user accounts or multi-tenancy.
- PostgreSQL, Supabase or Prisma integration.
- Real payment processing.
- Live analytics integrations.
- External business APIs.
- Production role-based authorization.
- Real email or notification delivery.
- Backend infrastructure.
- Claims that displayed metrics belong to a real business.

Do not implement excluded features unless the scope is explicitly changed.

## 3. Technology Stack

Use:

- Next.js with App Router.
- React.
- TypeScript with strict type checking.
- Tailwind CSS, following the installed version's conventions.
- Lucide icons through `lucide-react`.
- Recharts for appropriate data visualizations.
- Local typed TypeScript data.
- React state for interactive controls.
- URL search parameters where useful for shareable filter states.

Use Server Components by default. Use Client Components only when state, event handlers, browser APIs or interactive libraries require them.

Inspect the existing repository, package manager, dependency versions and configuration before making changes.

Do not blindly upgrade packages, replace working configuration or install unnecessary dependencies.

Explain any additional dependencies before introducing them.

## 4. Brand Identity and Visual Direction

### 4.1 Brand concept

PULSE is a premium business intelligence product that helps business owners understand performance and make better decisions.

Brand personality:
- Intelligent.
- Calm.
- Precise.
- Sophisticated.
- Nature-inspired.
- Confident without being flashy.

The design should feel like a premium independent SaaS brand, not a template purchased from an admin-dashboard marketplace.

### 4.2 Signature visual direction

Combine editorial website art direction with professional analytics UI.

The design language should use:
- Deep botanical-green navigation.
- Warm ivory content surfaces.
- Refined serif typography for selected editorial headings.
- Clean sans-serif typography for analytics and interface controls.
- Muted gold details used sparingly.
- Sage-green chart accents.
- Subtle natural imagery as a brand signature.
- Carefully balanced asymmetrical layouts.
- Generous whitespace.
- Fine borders and restrained shadows.

Use the supplied PULSE visual reference as inspiration for the atmosphere and palette, not as a pixel-perfect template.

Create an original composition that fits the actual content and data.

### 4.3 Color tokens

Start with these colors:

- Deep botanical green: `#123D32`
- Dark forest: `#0B2923`
- Warm ivory: `#F7F4EC`
- Pale sage: `#DCE7D8`
- Muted gold: `#B89A62`
- Charcoal: `#242923`
- Secondary text: `#74796F`
- Soft border: `#E5E1D7`
- White: `#FFFFFF`
- Positive status: `#277A54`
- Warning status: `#A96E25`
- Error status: `#B5443D`

Dark-theme starting tokens:
- Background: `#101C18`
- Surface: `#172821`
- Elevated surface: `#20372E`
- Primary text: `#F7F4EC`
- Secondary text: `#BAC7BE`
- Border: `#30473C`

Centralize the tokens in the existing styling system. Adjust them where necessary for readable text, clear states and sufficient contrast.

Use green as the primary interface and chart color. Use sage for secondary series and gold for selected highlights.

Do not make every element green or introduce too many competing colors.

### 4.4 Typography

Use a refined, restrained typography system.

Suggested pairing:
- Editorial headings: Cormorant Garamond or a similar elegant serif.
- Interface and body: DM Sans or a comparable readable sans-serif.

Use serif typography selectively for the dashboard greeting, major page introductions and occasional editorial details.

Keep tables, labels, chart axes, numerical values and controls highly readable with sans-serif typography.

Use tabular numerals for KPI values where appropriate.

Do not apply decorative serif typography to every element.

### 4.5 Photography and atmospheric visuals

Use restrained natural imagery to distinguish the brand from ordinary SaaS templates.

Possible imagery:
- A misty tropical mountain coastline.
- Forest silhouettes.
- A calm ocean horizon.
- Subtle botanical foliage.
- Abstract natural textures.

The main dashboard may feature a compact editorial greeting panel with a panoramic landscape image, a warm ivory overlay and a concise headline.

Use images sparingly. Analytics and data remain the primary focus.

Do not place large photographs behind charts or tables where they reduce readability.

Prefer reliable, optimized local image assets. If remote imagery is used, verify its reliability and configure image hosts appropriately.

Do not depend on broken or unverified external image URLs.

### 4.6 Layout principles

- Use a consistent desktop sidebar and main content canvas.
- Create deliberate asymmetry without sacrificing alignment.
- Let the primary revenue visualization receive the most attention.
- Use KPI cards as a supporting summary rather than the entire design.
- Combine charts and tables in purposeful groupings.
- Avoid identical card grids repeated throughout every page.
- Use consistent spacing, typography and component styling.
- Keep animation restrained and functional.
- Avoid excessive gradients, glassmorphism and decorative effects.

### 4.7 Visual restrictions

Do not:
- Reproduce the reference image pixel for pixel.
- Use the generic purple-gradient SaaS aesthetic.
- Make every section a uniform four-column grid.
- Give every card the same visual weight.
- Add excessive rounded containers and shadows.
- Decorate the interface with irrelevant illustrations.
- Sacrifice readability for visual novelty.
- Add fake functionality or misleading business claims.

The final design should have a recognizable identity that can be improved independently of the reference.

## 5. Information Architecture and Pages

Implement the following routes.

### `/` — Dashboard overview

This is the primary showcase screen and must receive the most design attention.

Include:

1. Sidebar navigation with PULSE branding.
2. Header with global search, notifications and profile menu.
3. Editorial dashboard greeting.
4. Date-range selector.
5. Four KPI summaries.
6. Main revenue growth chart.
7. Revenue breakdown visualization.
8. Revenue-versus-expenses comparison.
9. Customer acquisition trends.
10. Recent transactions table.
11. Top-performing products or services.
12. Responsive layouts.

Suggested KPI cards:
- Total revenue.
- Total orders.
- Active customers.
- Conversion rate.

Each KPI should display a value, comparison period and appropriate change indicator.

All metrics must derive from coherent mock data and calculation utilities wherever practical.

Label the environment as a demo analytics workspace without making the interface visually intrusive.

### `/analytics` — Detailed analytics

Include:
- Revenue trends.
- Orders and transaction volume.
- Customer acquisition.
- Conversion metrics.
- Comparison periods.
- Chart metric selectors.
- Date-range filters.
- Summary statistics.
- Revenue and expense comparison.
- Acquisition-source breakdown.
- Useful empty states.

Filters and selectors must actually update relevant displayed data.

### `/customers` — Customer directory

Include:
- Searchable customer table.
- Name and email.
- Customer status.
- Registration or first-purchase date.
- Total spend.
- Order count.
- Sorting by relevant columns.
- Status filters.
- Pagination.
- Customer detail drawer or panel.

Use clearly fictional names and reserved example email addresses such as `example.com`.

Do not imply that the customer data belongs to a real company.

### `/transactions` — Transaction history

Include:
- Search.
- Status filters.
- Date filters.
- Transaction identifier.
- Customer.
- Date.
- Amount.
- Payment method label.
- Status badge.
- Sorting and pagination.
- Transaction detail dialog or drawer.

All records are fictional demonstration data. No payment provider is connected.

### `/products` — Product performance

Include:
- Product or service list.
- Category.
- Revenue.
- Units sold.
- Conversion or performance indicator where relevant.
- Search and sorting.
- Top performers.
- Performance comparison visualization.

Products are demonstration data, not live inventory.

### `/reports` — Reports

Include:
- Revenue summary.
- Customer summary.
- Performance metrics.
- Period selection.
- Report preview.
- Export controls.
- CSV download generated locally from the relevant mock data.

If an export button is displayed, implement the actual download. Include accurate headers and correctly escape commas, quotes and line breaks.

Do not claim that a report has been exported unless the operation occurs.

PDF export is optional and should not be added unless it can be implemented reliably within scope.

### `/settings` — Demo settings

Include a polished settings interface with:
- Workspace preferences.
- Appearance and theme.
- Display currency.
- Notification preferences.
- Relevant display options.

Persist only harmless interface preferences where appropriate.

Do not imply that these settings update a real account or remote service.

### Route behavior

- Provide a branded not-found page.
- Ensure direct navigation and browser refresh work.
- Keep navigation active states synchronized with the current route.
- Use appropriate page titles.
- Ensure every visible navigation link has a valid destination.
- Use meaningful page-specific layouts rather than repeating the dashboard overview on every route.

## 6. Data Models and Mock Data

Use TypeScript types and local mock data. Do not create a database.

### 6.1 DashboardMetric

- `id: string`
- `label: string`
- `value: number`
- `previousValue: number`
- `format: "currency" | "integer" | "percentage"`
- `comparisonLabel: string`

Calculate percentage changes from the underlying values.

Handle zero-value baselines without producing invalid numbers. Distinguish relative percentage changes from percentage-point changes.

### 6.2 RevenueDataPoint

- `date: string`
- `revenue: number`
- `expenses: number`
- `orders: number`

Use a consistent time period and date format.

### 6.3 Customer

- `id: string`
- `name: string`
- `email: string`
- `status: "active" | "inactive"`
- `joinedAt: string`
- `totalSpendMinor: number`
- `orderCount: number`

### 6.4 Transaction

- `id: string`
- `customerId: string`
- `date: string`
- `amountMinor: number`
- `currency: string`
- `paymentMethodLabel: string`
- `status: "completed" | "pending" | "refunded" | "failed`

These statuses are illustrative. No actual transactions or payments are processed.

### 6.5 ProductPerformance

- `id: string`
- `name: string`
- `category: string`
- `unitsSold: number`
- `revenueMinor: number`
- `conversionRate: number`

### 6.6 AcquisitionSource

- `id: string`
- `name: string`
- `visitors: number`
- `conversions: number`
- `share: number`

### 6.7 Notification

- `id: string`
- `title: string`
- `description: string`
- `createdAt: string`
- `read: boolean`

### 6.8 Data consistency rules

- Derive summaries from consistent datasets wherever practical.
- Avoid unrelated hardcoded values across different widgets.
- Ensure transaction totals reconcile with the intended reporting data.
- Use consistent currency formatting.
- Use integer minor units for monetary calculations where appropriate.
- Use appropriate rounding.
- Distinguish percentage changes from percentage-point changes.
- Provide stable mock IDs.
- Clearly identify illustrative metrics as demo content.

The mock data should be rich enough to demonstrate filtering, sorting, pagination, date ranges and chart behavior.

## 7. Component Architecture

Create reusable components with clear responsibilities.

### Layout components

- `AppShell`
- `Sidebar`
- `MobileSidebar`
- `Topbar`
- `Breadcrumbs`
- `PageHeader`

### Dashboard components

- `MetricCard`
- `RevenueChart`
- `RevenueExpenseChart`
- `CustomerAcquisitionChart`
- `TrafficSourceBreakdown`
- `RecentTransactions`
- `TopProducts`

### Data table components

- `DataTable`
- `TableToolbar`
- `SearchInput`
- `FilterDropdown`
- `SortableTableHeader`
- `Pagination`
- `StatusBadge`
- `DetailDrawer`

### UI components

- `Button`
- `Select`
- `DateRangePicker`
- `DropdownMenu`
- `Tooltip`
- `Dialog`
- `EmptyState`
- `LoadingState`
- `ErrorState`

These names are suggestions, not mandatory files.

Avoid unnecessary abstractions. Create shared components when they provide genuine reuse and consistency.

Keep business calculations and formatting utilities separate from presentation components.

Use typed props and avoid unnecessary TypeScript casts.

## 8. Suggested Directory Structure

Adapt to the existing repository and its conventions.

- `src/app/`
  - `layout.tsx`
  - `page.tsx`
  - `globals.css`
  - `analytics/page.tsx`
  - `customers/page.tsx`
  - `transactions/page.tsx`
  - `products/page.tsx`
  - `reports/page.tsx`
  - `settings/page.tsx`
  - `not-found.tsx`
- `src/components/`
  - `layout/`
  - `dashboard/`
  - `charts/`
  - `tables/`
  - `filters/`
  - `ui/`
- `src/data/`
- `src/types/`
- `src/lib/`
  - `formatters.ts`
  - `calculations.ts`
  - `filters.ts`
- `public/`
- `PROJECT_SPEC.md`
- `README.md`

Use the `@/` import alias if supported by the existing configuration.

Adjust the directory structure when a different organization better fits the repository.

## 9. Functional Requirements

All visible controls must work or be clearly identified as decorative.

### 9.1 Navigation

- Sidebar links navigate to the correct routes.
- The current route has a clear active state.
- Mobile navigation opens and closes reliably.
- Menus close appropriately after selection.
- Keyboard interaction is supported.

### 9.2 Filters

- Date filters update relevant charts and summaries.
- Search filters the correct dataset.
- Status filters update displayed rows.
- Sorting produces the correct order.
- Pagination displays the correct records.
- Reset actions restore default values.
- Empty results show a useful empty state.

### 9.3 Charts

- Use consistent axes, units and labels.
- Provide readable tooltips.
- Use correct currency and number formatting.
- Support responsive layouts.
- Ensure chart data changes when relevant filters change.
- Provide useful text summaries for important visual information.

### 9.4 KPI calculations

- Calculate comparison percentages correctly.
- Handle zero baselines safely.
- Use consistent formatting.
- Avoid presenting percentage-point differences as relative percentage changes.
- Keep the displayed comparison period consistent with the data.

### 9.5 Theme

- Implement coherent light and dark themes.
- Maintain contrast in both modes.
- Persist the theme preference if practical.
- Respect system theme preferences where appropriate.
- Avoid flashes of the wrong theme during initial rendering when possible.

### 9.6 Tables

- Search, filtering and sorting work.
- Pagination uses the filtered dataset.
- Resetting filters restores the default dataset.
- Status badges use consistent meanings.
- Detail dialogs and drawers can be opened and closed accessibly.
- Narrow layouts remain usable.

### 9.7 CSV export

- Download a real CSV file.
- Export the intended dataset and selected fields.
- Escape commas, quotes and line breaks.
- Use meaningful column names.
- Ensure exported values correspond to the intended reporting state.
- Do not claim success without performing the download.

## 10. Security and Privacy

This is a frontend-only demonstration.

- Do not add fake authentication.
- Do not claim that routes are protected by real authorization.
- Do not store passwords, tokens or sensitive information.
- Do not include secret API keys.
- Do not transmit data to external services.
- Do not use real customer information.
- Do not expose unnecessary internal errors.
- Use safe React rendering.
- Avoid injecting untrusted HTML.
- Treat all displayed metrics as illustrative.
- Clearly identify the product as a demonstration where appropriate.

A future production implementation would require authenticated sessions, server-side authorization, tenant isolation, database access controls, server-side data validation and appropriate privacy practices. Those features are outside the current scope.

## 11. Accessibility Requirements

- Use semantic HTML.
- Provide labels for controls.
- Support keyboard navigation.
- Use visible focus indicators.
- Provide accessible names for icon-only buttons.
- Make dialogs, dropdowns and drawers keyboard-accessible.
- Maintain sufficient text and control contrast.
- Do not communicate status through color alone.
- Respect reduced-motion preferences.
- Ensure tables and navigation remain usable on mobile.
- Provide text alternatives or summaries for important charts.
- Associate validation messages with relevant controls.

## 12. Performance and SEO

- Minimize unnecessary client-side JavaScript.
- Use Server Components where practical.
- Avoid excessive chart re-rendering.
- Keep dependencies focused.
- Optimize any image assets.
- Avoid layout shifts where practical.
- Ensure direct routes and refreshes work.
- Add appropriate page titles and metadata.
- Include consistent branding and a favicon.
- Avoid unnecessary external requests.
- Do not claim performance scores without measuring them.

## 13. Quality Assurance

Verify the following:

- All navigation routes.
- Active sidebar states.
- Direct route navigation and refresh.
- Date filter behavior.
- Search and status filters.
- Sorting and pagination.
- Chart selector behavior.
- KPI calculations.
- Currency and percentage formatting.
- Theme switching.
- CSV export contents.
- Dialog and dropdown behavior.
- Empty states.
- Mobile layouts.
- Keyboard accessibility.
- Image loading.
- TypeScript checks.
- Lint checks supported by the project.
- Production build.

Fix genuine errors instead of suppressing them with broad type casts, ignored checks or disabled lint rules.

Use automated tests where appropriate for calculations and filtering utilities. Verify interactive behavior in the browser at realistic desktop and mobile sizes.

## 14. Definition of Done

The project is complete when:

- All specified pages are implemented.
- The UI has a consistent and distinctive SaaS identity.
- The dashboard makes a strong first impression at normal desktop size.
- The botanical-green and ivory visual direction is applied consistently.
- The interface is not a generic admin-template clone.
- The sidebar and navigation work on desktop and mobile.
- Charts use coherent, interactive mock data.
- Tables support the specified search, filter and sorting behavior.
- KPI calculations are correct.
- Theme switching works reliably.
- CSV export downloads valid data.
- There are no known broken routes or major console errors.
- TypeScript and production-build checks pass.
- The README documents setup, commands and project scope.
- A deployment-ready version can be presented to prospective clients.

## 15. Portfolio Deliverables

Prepare:

1. A live deployed demo.
2. A primary dashboard screenshot.
3. An analytics screenshot.
4. A customer or transaction table screenshot.
5. A mobile screenshot.
6. A concise case study describing the objective, design, functionality, architecture and technology stack.

Present PULSE as a self-initiated concept project. Do not claim real customers, actual business metrics or production integrations.

The final deliverable must demonstrate advanced Next.js frontend development, professional SaaS UI engineering, interactive data visualization and maintainable component architecture.

Keep the implementation focused. Do not add backend infrastructure or unrequested features.
