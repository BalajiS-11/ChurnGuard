import React from "react"
import { motion } from "framer-motion"

interface DriverItem {
  rank: number
  feature: string
  friendly_name?: string
  feature_value?: string
  shap_value: number
  direction: string
  reason_text: string
}

interface ShapWaterfallProps {
  drivers: DriverItem[]
}

export function ShapWaterfall({ drivers }: ShapWaterfallProps) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="text-sm text-text-muted italic py-4 text-center">
        No explainability drivers available.
      </div>
    )
  }

  const maxShap = Math.max(...drivers.map(d => Math.abs(d.shap_value)), 0.1)

  return (
    <div className="space-y-3.5">
      {drivers.map((d, i) => {
        const isPositive = d.shap_value > 0 // increases churn risk
        const barWidth = Math.min(100, Math.max(8, (Math.abs(d.shap_value) / maxShap) * 100))
        
        return (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-text-main flex items-center gap-1.5">
                <span className="text-[10px] text-text-muted font-mono">#{d.rank}</span>
                {d.friendly_name || d.feature}
                {d.feature_value && (
                  <span className="text-text-muted font-normal">({d.feature_value})</span>
                )}
              </span>
              <span
                className={`font-mono font-semibold ${
                  isPositive ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {isPositive ? "+" : ""}
                {d.shap_value.toFixed(3)}
              </span>
            </div>

            {/* Bar */}
            <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden flex">
              <motion.div
                className={`h-full rounded-full ${
                  isPositive ? "bg-red-500" : "bg-emerald-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              />
            </div>

            {/* Plain English Reason Text */}
            <p className="text-[11px] text-text-muted mt-1 leading-snug">
              {d.reason_text}
            </p>
          </div>
        )
      })}
    </div>
  )
}
