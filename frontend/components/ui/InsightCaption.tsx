import React from "react"
import { Sparkles } from "lucide-react"

interface InsightCaptionProps {
  text: string
  className?: string
}

export function InsightCaption({ text, className = "" }: InsightCaptionProps) {
  return (
    <div className={`flex items-start gap-1.5 text-xs text-text-muted mt-2 pt-2 border-t border-border/40 ${className}`}>
      <Sparkles className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
      <span className="leading-snug">{text}</span>
    </div>
  )
}
