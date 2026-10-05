import React from "react"
import { motion } from "framer-motion"

interface ProbabilityGaugeProps {
  probability: number // 0.0 to 1.0
  threshold?: number // default 0.14
  size?: number // default 200
  showDetails?: boolean
}

export function ProbabilityGauge({
  probability,
  threshold = 0.14,
  size = 200,
  showDetails = true
}: ProbabilityGaugeProps) {
  const p = Math.min(1.0, Math.max(0.0, probability))
  const pct = Math.round(p * 100)
  
  // Angle for semi-circle from -90 deg to +90 deg
  const angle = -90 + p * 180
  
  // Get color
  let strokeColor = "#10B981" // Low
  let label = "Low Risk"
  if (p >= 0.80) {
    strokeColor = "#EF4444"
    label = "Critical Risk"
  } else if (p >= 0.60) {
    strokeColor = "#F97316"
    label = "High Risk"
  } else if (p >= 0.30) {
    strokeColor = "#F59E0B"
    label = "Medium Risk"
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size * 0.6 }}>
        <svg
          viewBox="0 0 200 120"
          className="w-full h-full overflow-visible"
        >
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Animated Active Colored Arc */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 * (1 - p) }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Center Hub */}
          <circle cx="100" cy="100" r="7" className="fill-slate-700 dark:fill-slate-300" />
          {/* Needle */}
          <motion.line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke="currentColor"
            className="text-slate-800 dark:text-white"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ originX: "100px", originY: "100px" }}
          />
        </svg>
      </div>

      {showDetails && (
        <div className="text-center mt-2">
          <div className="text-3xl font-extrabold tracking-tight tabular-nums" style={{ color: strokeColor }}>
            {pct}%
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
            {label}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Cost Threshold: {(threshold * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  )
}
