"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import { formatCurrency } from "@/lib/utils"
import { RiskBadge } from "@/components/ui/RiskBadge"
import {
  PhoneCall,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Plus
} from "lucide-react"

export default function WatchlistPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [customers, setCustomers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    setLoading(true)
    try {
      const [cRes, tRes] = await Promise.all([
        api.get("/customers?risk=critical,high&page_size=20&sort_by=latest_probability&sort_order=desc"),
        api.get("/actions?status=todo")
      ])
      setCustomers(cRes.data.items || [])
      setTasks(tRes.data || [])
    } catch (e) {
      console.error("Watchlist fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  const markTaskDone = async (taskId: string) => {
    try {
      await api.patch(`/actions/${taskId}/status`, {
        status: "done",
        outcome: "retained",
        notes: "Completed via quick watchlist action"
      })
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (e) {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface-2 rounded-control" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface rounded-card border border-border" />
          <div className="h-96 bg-surface rounded-card border border-border" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-main">
          Relationship Manager Watchlist
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Prioritized daily action queue: High & Critical risk accounts requiring proactive outreach.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: High Risk Customers Table */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-main">Priority Customers ({customers.length})</h2>
              <p className="text-xs text-text-muted">Ranked by calibrated churn probability</p>
            </div>
            <Link
              href="/customers"
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
            >
              Full Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-text-muted uppercase text-[10px] font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Geography</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Risk Tier</th>
                  <th className="py-2.5 px-3">Probability</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-surface-2/60 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-main group-hover:text-brand">
                        {c.surname || "Customer"}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">{c.external_id}</div>
                    </td>
                    <td className="py-3 px-3">{c.geography}</td>
                    <td className="py-3 px-3 font-mono font-medium">{formatCurrency(c.balance)}</td>
                    <td className="py-3 px-3">
                      <RiskBadge tier={c.latest_risk_tier} />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-red-500">
                      {((c.latest_probability || 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/customers/${c.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all"
                      >
                        Open 360
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1/3: Pending Tasks & Schedule */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-text-main">Due Actions ({tasks.length})</h2>
              <p className="text-xs text-text-muted">Calls & retention follow-ups</p>
            </div>
            <span className="p-1.5 rounded-full bg-brand/10 text-brand">
              <PhoneCall className="w-4 h-4" />
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {tasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All scheduled retention calls completed for today!
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-control border border-border bg-surface-2/40 hover:bg-surface-2 transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-text-main leading-tight">{t.title}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                      {t.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Client: <span className="font-semibold text-text-main">{t.customer_name}</span>
                  </div>
                  {t.notes && <div className="text-[11px] text-text-muted line-clamp-2">{t.notes}</div>}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due {t.due_date || "Today"}
                    </span>
                    <button
                      onClick={() => markTaskDone(t.id)}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Retained
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
