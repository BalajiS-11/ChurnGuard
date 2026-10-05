"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Search, User, ArrowRight, X, BrainCircuit, LayoutDashboard, Megaphone } from "lucide-react"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        isOpen ? onClose() : null
      }
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/customers?search=${encodeURIComponent(query)}&page_size=5`)
        setResults(res.data.items || [])
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  if (!isOpen) return null

  const handleSelect = (href: string) => {
    router.push(href)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-surface border border-border rounded-card shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type customer ID, surname, or jump to page..."
            className="flex-1 bg-transparent border-none text-sm text-text-main placeholder-text-muted focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-main">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results / Navigation */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="py-6 text-center text-xs text-text-muted">Searching customer database...</div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Customers
              </div>
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/customers/${c.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-control text-xs text-left hover:bg-surface-2 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[10px]">
                      <User className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-main">
                        {c.surname || "Customer"} · <span className="font-mono text-text-muted">{c.external_id}</span>
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {c.geography} · €{c.balance.toLocaleString()} · Churn Risk: {(c.latest_probability * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
                </button>
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-6 text-center text-xs text-text-muted">
              No matching customers found for "{query}".
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Quick Shortcuts
            </div>
            <button
              onClick={() => handleSelect("/dashboard")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-xs text-text-main hover:bg-surface-2 text-left"
            >
              <LayoutDashboard className="w-4 h-4 text-brand" />
              <span>Go to Executive Dashboard</span>
            </button>
            <button
              onClick={() => handleSelect("/predict/single")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-xs text-text-main hover:bg-surface-2 text-left"
            >
              <BrainCircuit className="w-4 h-4 text-brand" />
              <span>Run Single Prediction</span>
            </button>
            <button
              onClick={() => handleSelect("/campaigns")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-xs text-text-main hover:bg-surface-2 text-left"
            >
              <Megaphone className="w-4 h-4 text-brand" />
              <span>Manage Retention Campaigns</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
