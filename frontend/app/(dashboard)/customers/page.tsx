"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { RiskBadge } from "@/components/ui/RiskBadge"
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  PlusCircle,
  Megaphone
} from "lucide-react"

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedRisk, setSelectedRisk] = useState<string>("")
  const [selectedGeo, setSelectedGeo] = useState<string>("")
  const [selectedActive, setSelectedActive] = useState<string>("")
  const [sortBy, setSortBy] = useState("latest_probability")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchCustomers()
  }, [page, pageSize, selectedRisk, selectedGeo, selectedActive, sortBy, sortOrder])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      let url = `/customers?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      if (selectedRisk) url += `&risk=${selectedRisk}`
      if (selectedGeo) url += `&geography=${selectedGeo}`
      if (selectedActive !== "") url += `&is_active=${selectedActive}`

      const res = await api.get(url)
      setCustomers(res.data.items || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    } catch (e) {
      console.error("Customers fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(customers.map(c => c.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Customer Directory
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {total.toLocaleString()} banking customers with calibrated churn predictions and risk scores.
          </p>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-brand/10 border border-brand/20 px-3 py-1.5 rounded-control text-xs font-semibold text-brand">
            <span>{selectedIds.length} accounts selected</span>
            <button
              onClick={() => router.push(`/campaigns/new`)}
              className="px-2 py-0.5 rounded bg-brand text-white text-[11px] hover:opacity-90 flex items-center gap-1"
            >
              <Megaphone className="w-3 h-3" /> Add to Campaign
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer ID or surname..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-control bg-surface-2 border border-border text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </form>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Risk filter */}
            <select
              value={selectedRisk}
              onChange={(e) => { setSelectedRisk(e.target.value); setPage(1) }}
              className="text-xs px-2.5 py-1.5 rounded-control bg-surface-2 border border-border text-text-main focus:outline-none"
            >
              <option value="">All Risk Tiers</option>
              <option value="critical">Critical (≥80%)</option>
              <option value="high">High (60–80%)</option>
              <option value="medium">Medium (30–60%)</option>
              <option value="low">Low (&lt;30%)</option>
            </select>

            {/* Geography filter */}
            <select
              value={selectedGeo}
              onChange={(e) => { setSelectedGeo(e.target.value); setPage(1) }}
              className="text-xs px-2.5 py-1.5 rounded-control bg-surface-2 border border-border text-text-main focus:outline-none"
            >
              <option value="">All Geographies</option>
              <option value="France">France</option>
              <option value="Germany">Germany</option>
              <option value="Spain">Spain</option>
            </select>

            {/* Active status */}
            <select
              value={selectedActive}
              onChange={(e) => { setSelectedActive(e.target.value); setPage(1) }}
              className="text-xs px-2.5 py-1.5 rounded-control bg-surface-2 border border-border text-text-main focus:outline-none"
            >
              <option value="">All Members</option>
              <option value="true">Active Members</option>
              <option value="false">Inactive Members</option>
            </select>

            {/* Sort order */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-")
                setSortBy(sb)
                setSortOrder(so)
              }}
              className="text-xs px-2.5 py-1.5 rounded-control bg-surface-2 border border-border text-text-main focus:outline-none"
            >
              <option value="latest_probability-desc">Highest Churn Risk</option>
              <option value="latest_probability-asc">Lowest Churn Risk</option>
              <option value="balance-desc">Highest Balance</option>
              <option value="age-desc">Oldest Age</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2/70 text-text-muted uppercase text-[10px] font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="py-3 px-3">Customer ID / Surname</th>
                <th className="py-3 px-3">Market</th>
                <th className="py-3 px-3">Age</th>
                <th className="py-3 px-3">Balance</th>
                <th className="py-3 px-3">Products</th>
                <th className="py-3 px-3">Active</th>
                <th className="py-3 px-3">Risk Tier</th>
                <th className="py-3 px-3 w-40">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-3 px-3">
                      <div className="h-4 bg-surface-2 rounded" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const p = c.latest_probability || 0.0
                  const isChecked = selectedIds.includes(c.id)

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className={`hover:bg-surface-2/60 cursor-pointer transition-colors group ${
                        isChecked ? "bg-brand/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(c.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-main group-hover:text-brand">
                          {c.surname || "Customer"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">{c.external_id}</div>
                      </td>
                      <td className="py-3 px-3">{c.geography}</td>
                      <td className="py-3 px-3">{c.age}</td>
                      <td className="py-3 px-3 font-mono font-medium">{formatCurrency(c.balance)}</td>
                      <td className="py-3 px-3">{c.num_of_products}</td>
                      <td className="py-3 px-3">
                        {c.is_active_member ? (
                          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-1 text-[11px]">
                            <UserCheck className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-text-muted gap-1 text-[11px]">
                            <UserX className="w-3.5 h-3.5" /> No
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge tier={c.latest_risk_tier} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-2 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                p >= 0.8
                                  ? "bg-red-500"
                                  : p >= 0.6
                                  ? "bg-orange-500"
                                  : p >= 0.3
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${p * 100}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-text-main tabular-nums w-10 text-right">
                            {(p * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} accounts
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-control border border-border hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text-main px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-control border border-border hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
