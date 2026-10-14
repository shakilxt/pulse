/**
 * Static inputs for the generator: what the fictional studio sells, where its
 * visitors come from and what it costs to run. Behavioural weights live next
 * to each item so the simulation reads as a description of the business.
 */

import type { IsoDate } from "@/lib/dates";
import type { AcquisitionChannel, Product } from "@/types/domain";

export interface ProductSpec extends Product {
  /** Relative likelihood of being a customer's first purchase. */
  firstWeight: number;
  /** Relative likelihood of being a repeat purchase. */
  repeatWeight: number;
  /** Highest quantity in one order (team licences); 1 for single-seat items. */
  maxQuantity: number;
  /** Probability that a completed order is later refunded. */
  refundRate: number;
  /** Long-run completed orders per product page view, used to calibrate views. */
  targetConversion: number;
}

export const PRODUCTS: readonly ProductSpec[] = [
  { id: "PR-01", name: "Field Notes Planner", category: "Templates", unitPriceMinor: 2_900, firstWeight: 14, repeatWeight: 6, maxQuantity: 3, refundRate: 0.015, targetConversion: 0.064 },
  { id: "PR-02", name: "Canopy UI Kit", category: "Templates", unitPriceMinor: 8_900, firstWeight: 10, repeatWeight: 5, maxQuantity: 3, refundRate: 0.02, targetConversion: 0.043 },
  { id: "PR-03", name: "Botanical Icon Set", category: "Templates", unitPriceMinor: 3_900, firstWeight: 9, repeatWeight: 5, maxQuantity: 2, refundRate: 0.015, targetConversion: 0.057 },
  { id: "PR-04", name: "Moodboard Toolkit", category: "Templates", unitPriceMinor: 2_400, firstWeight: 8, repeatWeight: 4, maxQuantity: 1, refundRate: 0.02, targetConversion: 0.071 },
  { id: "PR-05", name: "Typography Masterclass", category: "Courses", unitPriceMinor: 14_900, firstWeight: 7, repeatWeight: 3, maxQuantity: 1, refundRate: 0.04, targetConversion: 0.034 },
  { id: "PR-06", name: "Design Systems Course", category: "Courses", unitPriceMinor: 24_900, firstWeight: 5, repeatWeight: 3, maxQuantity: 1, refundRate: 0.045, targetConversion: 0.026 },
  { id: "PR-07", name: "Colour Theory Workshop", category: "Courses", unitPriceMinor: 7_900, firstWeight: 6, repeatWeight: 2, maxQuantity: 1, refundRate: 0.035, targetConversion: 0.039 },
  { id: "PR-08", name: "Studio Membership", category: "Memberships", unitPriceMinor: 19_000, firstWeight: 6, repeatWeight: 4, maxQuantity: 1, refundRate: 0.03, targetConversion: 0.031 },
  { id: "PR-09", name: "Portfolio Review", category: "Services", unitPriceMinor: 18_000, firstWeight: 4, repeatWeight: 4, maxQuantity: 1, refundRate: 0.02, targetConversion: 0.022 },
  { id: "PR-10", name: "Analytics Setup Session", category: "Services", unitPriceMinor: 45_000, firstWeight: 2, repeatWeight: 3, maxQuantity: 1, refundRate: 0.02, targetConversion: 0.016 },
  { id: "PR-11", name: "Strategy Workshop", category: "Services", unitPriceMinor: 95_000, firstWeight: 1, repeatWeight: 1.5, maxQuantity: 1, refundRate: 0.025, targetConversion: 0.011 },
  { id: "PR-12", name: "Brand Identity Sprint", category: "Services", unitPriceMinor: 180_000, firstWeight: 0.6, repeatWeight: 1, maxQuantity: 1, refundRate: 0.02, targetConversion: 0.008 },
];

/** Studio Membership is an annual plan that customers can renew. */
export const MEMBERSHIP_PRODUCT_ID = "PR-08";
export const MEMBERSHIP_RENEWAL_DAYS = 365;
export const MEMBERSHIP_RENEWAL_RATE = 0.72;

export interface ChannelSpec extends AcquisitionChannel {
  /** Average daily visitors on the first day of data. */
  baseVisitors: number;
  /** Year-on-year traffic growth as a fraction. */
  annualGrowth: number;
  /** Probability that one visitor becomes a new customer. */
  conversion: number;
  /** First day the channel sends traffic. */
  launchedOn: IsoDate;
}

export const CHANNELS: readonly ChannelSpec[] = [
  { id: "organic", name: "Organic search", baseVisitors: 102, annualGrowth: 0.34, conversion: 0.0085, launchedOn: "2024-01-01" },
  { id: "direct", name: "Direct", baseVisitors: 52, annualGrowth: 0.22, conversion: 0.011, launchedOn: "2024-01-01" },
  { id: "referral", name: "Referrals", baseVisitors: 29, annualGrowth: 0.28, conversion: 0.016, launchedOn: "2024-01-01" },
  { id: "newsletter", name: "Newsletter", baseVisitors: 18, annualGrowth: 0.4, conversion: 0.019, launchedOn: "2024-01-01" },
  { id: "social", name: "Paid social", baseVisitors: 44, annualGrowth: 0.18, conversion: 0.0055, launchedOn: "2024-06-03" },
];

/** Traffic by day of week, Sunday first. */
export const WEEKDAY_FACTORS = [0.72, 1.08, 1.12, 1.1, 1.05, 0.95, 0.7] as const;

export const PAYMENT_METHODS = [
  { brand: "Visa", weight: 45, card: true },
  { brand: "Mastercard", weight: 28, card: true },
  { brand: "Amex", weight: 9, card: true },
  { brand: "PayPal", weight: 12, card: false },
] as const;

export const BANK_TRANSFER_LABEL = "Bank transfer";
/** Orders at or above this price are often paid by bank transfer. */
export const BANK_TRANSFER_THRESHOLD_MINOR = 90_000;

/** Monthly fixed operating costs (rent, salaries, software), stepping up as the studio grows. */
export const FIXED_COST_SCHEDULE: ReadonlyArray<{ from: IsoDate; monthlyMinor: number }> = [
  { from: "2024-01-01", monthlyMinor: 820_000 },
  { from: "2024-09-01", monthlyMinor: 1_240_000 },
  { from: "2025-04-01", monthlyMinor: 1_780_000 },
  { from: "2026-03-01", monthlyMinor: 2_380_000 },
];

/** Card processing: 2.9% + 30¢ per charge, not returned on refunds. */
export const PROCESSING_FEE_BPS = 290;
export const PROCESSING_FEE_FIXED_MINOR = 30;
/** Cost per paid-social visitor. */
export const PAID_SOCIAL_CPC_MINOR = 115;
/** Share of services revenue paid to contractors who help deliver them. */
export const SERVICES_DELIVERY_BPS = 3_000;
