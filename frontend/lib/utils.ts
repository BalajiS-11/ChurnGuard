import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(val).replace('EUR', '€')
}

export function formatPercent(val: number): string {
  return `${(val).toFixed(1)}%`
}

export function getRiskTierBadge(tier?: string) {
  const t = (tier || "low").toLowerCase()
  switch (t) {
    case "critical":
      return {
        bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        label: "Critical",
        dot: "bg-red-500",
        bar: "bg-[#EF4444]"
      }
    case "high":
      return {
        bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        label: "High",
        dot: "bg-orange-500",
        bar: "bg-[#F97316]"
      }
    case "medium":
      return {
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        label: "Medium",
        dot: "bg-amber-500",
        bar: "bg-[#F59E0B]"
      }
    default:
      return {
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        label: "Low",
        dot: "bg-emerald-500",
        bar: "bg-[#10B981]"
      }
  }
}
