/**
 * Domain model for the PULSE demo workspace.
 *
 * Conventions:
 * - Dates are ISO calendar dates (`YYYY-MM-DD`, UTC); timestamps are ISO 8601 UTC.
 * - Money is integer minor units (cents) in the ledger's base currency.
 * - Ratios (conversion rate, share) are fractions between 0 and 1.
 *
 * Everything here is fictional demonstration data. No real business, customer
 * or payment is represented.
 */

import type { IsoDate } from "@/lib/dates";
import type { CurrencyCode } from "@/lib/money";

// ---------------------------------------------------------------------------
// Catalogue

export type ProductCategory = "Templates" | "Courses" | "Memberships" | "Services";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unitPriceMinor: number;
}

export interface AcquisitionChannel {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Ledger and people

export type TransactionStatus = "completed" | "pending" | "refunded" | "failed";

export interface Transaction {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  date: IsoDate;
  /** unitPriceMinor × quantity, in `currency`. */
  amountMinor: number;
  currency: CurrencyCode;
  paymentMethodLabel: string;
  status: TransactionStatus;
}

/** "Active" means a purchase (any charge that did not fail) in the 90 days up to the data's end date. */
export type CustomerStatus = "active" | "inactive";

export interface Customer {
  id: string;
  name: string;
  email: string;
  status: CustomerStatus;
  /** Date of the customer's first purchase. */
  joinedAt: IsoDate;
  /** Sum of completed transactions; refunded, failed and pending ones are excluded. */
  totalSpendMinor: number;
  /** Number of completed transactions. */
  orderCount: number;
  lastOrderAt: IsoDate | null;
  acquisitionSourceId: string;
}

// ---------------------------------------------------------------------------
// Traffic and costs

export interface DailyTraffic {
  date: IsoDate;
  sourceId: string;
  visitors: number;
}

export interface DailyProductViews {
  date: IsoDate;
  productId: string;
  views: number;
}

export interface DailyExpense {
  date: IsoDate;
  amountMinor: number;
}

// ---------------------------------------------------------------------------
// Notifications

export type NotificationCategory = "payments" | "customers" | "reports";

export interface Notification {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 UTC timestamp. */
  createdAt: string;
  read: boolean;
  category: NotificationCategory;
  /** In-app destination with more detail, when there is one. */
  href: string | null;
}

// ---------------------------------------------------------------------------
// Derived views

export type MetricFormat = "currency" | "integer" | "percentage";

export interface DashboardMetric {
  id: string;
  label: string;
  /** Minor units for currency, a count for integer, a fraction for percentage; null when undefined (no visitors, no orders). */
  value: number | null;
  /** The same measure for the comparison period; null when that period has no data. */
  previousValue: number | null;
  format: MetricFormat;
  comparisonLabel: string;
}

export interface RevenueDataPoint {
  /** First day of the bucket (day, week or month). */
  date: IsoDate;
  revenueMinor: number;
  expensesMinor: number;
  orders: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  category: ProductCategory;
  unitsSold: number;
  orders: number;
  revenueMinor: number;
  /** Completed orders ÷ product page views; null without views. */
  conversionRate: number | null;
}

export interface AcquisitionSource {
  id: string;
  name: string;
  visitors: number;
  /** New customers acquired through this source. */
  conversions: number;
  /** This source's fraction of all conversions in the period. */
  share: number;
}

// ---------------------------------------------------------------------------
// Dataset

export interface Dataset {
  /** Inclusive span the data covers. */
  span: { from: IsoDate; to: IsoDate };
  /** The demo's fixed "now", used for relative times. */
  now: string;
  baseCurrency: CurrencyCode;
  products: Product[];
  channels: AcquisitionChannel[];
  /** Ordered by join date. */
  customers: Customer[];
  /** Ordered by date, then id. */
  transactions: Transaction[];
  traffic: DailyTraffic[];
  productViews: DailyProductViews[];
  expenses: DailyExpense[];
  /** Newest first. */
  notifications: Notification[];
}
