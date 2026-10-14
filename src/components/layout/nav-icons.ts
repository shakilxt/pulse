import { ArrowLeftRight, ChartSpline, FileText, Gauge, Package, Settings2, Users, type LucideIcon } from "lucide-react";
import type { NavKey } from "@/lib/navigation";

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  overview: Gauge,
  analytics: ChartSpline,
  reports: FileText,
  customers: Users,
  transactions: ArrowLeftRight,
  products: Package,
  settings: Settings2,
};
