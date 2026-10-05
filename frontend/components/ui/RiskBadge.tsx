import React from "react"
import { getRiskTierBadge } from "@/lib/utils"
import { ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react"

interface RiskBadgeProps {
  tier?: string
  className?: string
  showIcon?: boolean
}

export function RiskBadge({ tier = "low", className = "", showIcon = true }: RiskBadgeProps) {
  const badge = getRiskTierBadge(tier)
  
  const renderIcon = () => {
    switch (tier.toLowerCase()) {
      case "critical":
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
      case "high":
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
      case "medium":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${className}`}
    >
      {showIcon && renderIcon()}
      <span>{badge.label}</span>
    </span>
  )
}
