import React from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  delta?: string
  deltaType?: "positive" | "negative" | "neutral"
  subtext?: string
  sparklineData?: number[]
  sparklineColor?: string
}

export function KpiCard({
  title,
  value,
  delta,
  deltaType = "neutral",
  subtext,
  sparklineData = [20, 22, 19, 24, 21, 25, 23, 22],
  sparklineColor = "#4F46E5"
}: KpiCardProps) {
  // Generate simple sparkline SVG path
  const minVal = Math.min(...sparklineData)
  const maxVal = Math.max(...sparklineData)
  const range = maxVal - minVal || 1
  const width = 80
  const height = 28
  
  const points = sparklineData
    .map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * width
      const y = height - ((d - minVal) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="bg-surface border border-border rounded-card p-5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between text-xs font-medium text-text-muted">
        <span>{title}</span>
        {delta && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
              deltaType === "positive"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : deltaType === "negative"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
            }`}
          >
            {deltaType === "positive" ? (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            ) : deltaType === "negative" ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : null}
            {delta}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-3">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-text-main tabular-nums">
          {value}
        </div>
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={sparklineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      {subtext && (
        <div className="text-[11px] text-text-muted mt-2 border-t border-border/50 pt-2">
          {subtext}
        </div>
      )}
    </div>
  )
}
