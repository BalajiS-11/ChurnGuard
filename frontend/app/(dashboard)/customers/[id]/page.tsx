"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { ProbabilityGauge } from "@/components/ui/ProbabilityGauge"
import { RiskBadge } from "@/components/ui/RiskBadge"
import { ShapWaterfall } from "@/components/charts/ShapWaterfall"
import {
  ArrowLeft,
  PhoneCall,
  Sparkles,
  Sliders,
  CheckCircle2,
  PlusCircle
} from "lucide-react"

export default function Customer360Page() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [customer, setCustomer] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "actions">("profile")

  // What-If State
  const [simProducts, setSimProducts] = useState(1)
  const [simActive, setSimActive] = useState(true)
  const [simBalance, setSimBalance] = useState(0)
  const [simTenure, setSimTenure] = useState(2)
  const [whatIfResult, setWhatIfResult] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)
  const [actionSaved, setActionSaved] = useState(false)

  useEffect(() => {
    if (id) {
      fetchCustomerData()
    }
  }, [id])

  const fetchCustomerData = async () => {
    setLoading(true)
    try {
      const [cRes, hRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/predictions`)
      ])
      const c = cRes.data
      setCustomer(c)
      setHistory(hRes.data || [])

      setSimProducts(c.num_of_products)
      setSimActive(c.is_active_member)
      setSimBalance(c.balance)
      setSimTenure(c.tenure)
    } catch (e) {
      console.error("Error loading customer 360:", e)
    } finally {
      setLoading(false)
    }
  }

  // Debounced What-If simulation
  useEffect(() => {
    if (!customer) return
    const timer = setTimeout(async () => {
      setSimulating(true)
      try {
        const base = {
          credit_score: customer.credit_score,
          geography: customer.geography,
          gender: customer.gender,
          age: customer.age,
          tenure: customer.tenure,
          balance: customer.balance,
          num_of_products: customer.num_of_products,
          has_cr_card: customer.has_cr_card,
          is_active_member: customer.is_active_member,
          estimated_salary: customer.estimated_salary
        }
        const modified = {
          ...base,
          num_of_products: simProducts,
          is_active_member: simActive,
          balance: simBalance,
          tenure: simTenure
        }
        const res = await api.post("/predict/whatif", {
          customer_id: customer.id,
          base_features: base,
          modified_features: modified
        })
        setWhatIfResult(res.data)
      } catch (e) {
        console.error("What-if error:", e)
      } finally {
        setSimulating(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [simProducts, simActive, simBalance, simTenure, customer])

  const handleCreateTask = async (title: string, type: string) => {
    try {
      await api.post("/actions", {
        customer_id: customer.id,
        title,
        type,
        notes: `Created from Customer 360 recommended action.`
      })
      setActionSaved(true)
      setTimeout(() => setActionSaved(false), 3000)
      fetchCustomerData()
    } catch (e) {
      // ignore
    }
  }

  if (loading || !customer) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface-2 rounded-control" />
        <div className="h-40 bg-surface rounded-card border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-surface rounded-card border border-border" />
          <div className="h-80 bg-surface rounded-card border border-border" />
        </div>
      </div>
    )
  }

  const p = customer.latest_probability || 0.2
  const portfolioAvg = 0.2037

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-violet text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {customer.surname ? customer.surname[0] : "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">
                {customer.surname || "Customer"}
              </h1>
              <RiskBadge tier={customer.latest_risk_tier} />
            </div>
            <div className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono bg-surface-2 px-2 py-0.5 rounded text-[11px]">
                ID: {customer.external_id}
              </span>
              <span>{customer.geography} Market</span>
              <span>{customer.age} years old</span>
              <span>{customer.tenure} yrs tenure</span>
              <span>Assigned RM: <strong>{customer.assigned_rm_name}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateTask("Urgent Customer Outreach Call", "call")}
            className="px-4 py-2 rounded-control text-xs font-semibold bg-brand text-white hover:opacity-95 transition-opacity shadow-sm flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Log Action
          </button>
        </div>
      </div>

      {actionSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-control flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Retention task successfully scheduled and assigned to Relationship Manager.</span>
        </div>
      )}

      {/* Hero 2-Column: Gauge vs SHAP Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Gauge & Risk Metrics */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text-main uppercase tracking-wider text-[11px] text-text-muted">
                Calibrated Attrition Risk
              </h2>
              <span className="text-[10px] font-mono text-text-muted bg-surface-2 px-2 py-0.5 rounded">
                Model v1.0.0
              </span>
            </div>

            <ProbabilityGauge
              probability={p}
              threshold={0.14}
              size={220}
              showDetails={true}
            />

            <div className="mt-6 pt-4 border-t border-border/60 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 rounded-control bg-surface-2">
                <div className="text-[10px] text-text-muted uppercase">vs Portfolio Avg</div>
                <div className="text-base font-bold text-text-main tabular-nums">
                  {p > portfolioAvg ? `+${((p - portfolioAvg) * 100).toFixed(1)}%` : `${((p - portfolioAvg) * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="p-2.5 rounded-control bg-surface-2">
                <div className="text-[10px] text-text-muted uppercase">Annual Value at Risk</div>
                <div className="text-base font-bold text-red-500 tabular-nums font-mono">
                  {formatCurrency(p * (customer.balance * 0.02 + customer.estimated_salary * 0.01 + customer.num_of_products * 150))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-control bg-brand/5 border border-brand/10 text-xs text-text-muted leading-relaxed">
            <span className="font-semibold text-text-main">Advisor Summary: </span>
            This account exhibits elevated flight risk primarily driven by {customer.num_of_products >= 3 ? "multiple product fatigue" : "dormant engagement"} and age profile.
          </div>
        </div>

        {/* Right Column (7 cols): SHAP Waterfall Top Drivers */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-text-main">
                Why is this customer at risk?
              </h2>
              <p className="text-xs text-text-muted">
                Local SHAP TreeExplainer breakdown showing primary risk contributors.
              </p>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Red (+ raises) · Green (- lowers)
            </span>
          </div>

          <ShapWaterfall drivers={customer.drivers || []} />
        </div>
      </div>

      {/* Row: Recommended Actions (1/2) + Live What-If Simulator (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Actions */}
        <div className="bg-surface border border-border rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                Recommended Next-Best-Actions
              </h3>
              <span className="text-[10px] uppercase font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                Rule + SHAP
              </span>
            </div>

            <div className="space-y-3">
              {(customer.recommendations || []).map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-control border border-border bg-surface-2/40 hover:bg-surface-2 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-main">{rec.title}</span>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                        rec.priority === "Critical" ? "bg-red-500/10 text-red-500" : "bg-brand/10 text-brand"
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateTask(rec.title, rec.action_type || "offer")}
                    className="p-2 rounded bg-surface hover:bg-brand hover:text-white border border-border transition-colors text-text-muted shrink-0"
                    title="Create task"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-text-muted mt-4 pt-3 border-t border-border/50">
            Clicking <PlusCircle className="w-3 h-3 inline mx-1" /> schedules a task directly onto the Relationship Manager watchlist.
          </div>
        </div>

        {/* What-If Simulator */}
        <div className="bg-surface border border-border rounded-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand" />
              What-If Retention Simulator
            </h3>
            {simulating && (
              <span className="text-[10px] text-brand font-mono animate-pulse">
                Recalculating...
              </span>
            )}
          </div>

          {/* Delta Banner */}
          {whatIfResult && (
            <div className={`p-3 rounded-control border text-xs mb-4 flex items-center justify-between ${
              whatIfResult.delta_points < 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-surface-2 border-border text-text-muted"
            }`}>
              <div>
                <span className="font-semibold">Simulated Churn Probability: </span>
                <span className="font-mono font-bold">
                  {(whatIfResult.scenario_probability * 100).toFixed(1)}%
                </span>
                <span className="ml-1 text-[11px]">({whatIfResult.scenario_risk_tier.toUpperCase()})</span>
              </div>
              <div className="font-mono font-bold text-sm tabular-nums">
                {whatIfResult.delta_points > 0 ? "+" : ""}{whatIfResult.delta_points.toFixed(1)} pts
              </div>
            </div>
          )}

          {/* Sliders */}
          <div className="space-y-4 text-xs">
            {/* Products */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Number of Products: {simProducts}</span>
                <span className="text-text-muted text-[11px]">Original: {customer.num_of_products}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={simProducts}
                onChange={(e) => setSimProducts(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between py-2 border-y border-border/50">
              <div>
                <div className="font-semibold">Member Activity Status</div>
                <div className="text-[11px] text-text-muted">Simulate mobile app / card engagement</div>
              </div>
              <button
                type="button"
                onClick={() => setSimActive(!simActive)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  simActive ? "bg-emerald-500 text-white" : "bg-surface-2 text-text-muted"
                }`}
              >
                {simActive ? "Active" : "Inactive"}
              </button>
            </div>

            {/* Balance */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Account Balance: €{simBalance.toLocaleString()}</span>
                <span className="text-text-muted text-[11px]">Original: €{customer.balance.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="250000"
                step="5000"
                value={simBalance}
                onChange={(e) => setSimBalance(parseFloat(e.target.value))}
                className="w-full accent-brand"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                setSimProducts(customer.num_of_products)
                setSimActive(customer.is_active_member)
                setSimBalance(customer.balance)
                setSimTenure(customer.tenure)
              }}
              className="text-text-muted hover:text-text-main underline"
            >
              Reset to baseline
            </button>
            <button
              onClick={() => handleCreateTask(`Implement Scenario Plan: ${simProducts} prods, active=${simActive}`, "offer")}
              className="px-3 py-1.5 rounded-control bg-brand text-white font-semibold text-xs hover:opacity-90"
            >
              Save as Retention Action Plan
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-sm">
        <div className="flex items-center gap-6 border-b border-border pb-3 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("profile")}
            className={`transition-colors pb-1 border-b-2 ${
              activeTab === "profile"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            Full Profile & Ratios
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`transition-colors pb-1 border-b-2 ${
              activeTab === "history"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            Prediction History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`transition-colors pb-1 border-b-2 ${
              activeTab === "actions"
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            Actions Timeline ({customer.actions?.length || 0})
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-control bg-surface-2/60">
              <span className="text-text-muted text-[11px] block">Credit Score</span>
              <span className="font-bold text-text-main text-sm tabular-nums">{customer.credit_score}</span>
            </div>
            <div className="p-3 rounded-control bg-surface-2/60">
              <span className="text-text-muted text-[11px] block">Estimated Salary</span>
              <span className="font-bold text-text-main text-sm font-mono">{formatCurrency(customer.estimated_salary)}</span>
            </div>
            <div className="p-3 rounded-control bg-surface-2/60">
              <span className="text-text-muted text-[11px] block">Has Credit Card</span>
              <span className="font-bold text-text-main text-sm">{customer.has_cr_card ? "Yes" : "No"}</span>
            </div>
            <div className="p-3 rounded-control bg-surface-2/60">
              <span className="text-text-muted text-[11px] block">Active Member</span>
              <span className="font-bold text-text-main text-sm">{customer.is_active_member ? "Yes" : "No"}</span>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2 text-xs">
            {history.length === 0 ? (
              <div className="py-6 text-center text-text-muted">No historical predictions logged yet.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-2.5 rounded bg-surface-2/50 flex items-center justify-between">
                  <span className="font-mono text-text-muted">{h.created_at}</span>
                  <span className="font-bold text-text-main font-mono">{(h.probability * 100).toFixed(1)}%</span>
                  <RiskBadge tier={h.risk_tier} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <div className="space-y-3 text-xs">
            {(customer.actions || []).length === 0 ? (
              <div className="py-6 text-center text-text-muted">No actions recorded for this customer yet.</div>
            ) : (
              (customer.actions || []).map((a: any) => (
                <div key={a.id} className="p-3 rounded border border-border bg-surface-2/30 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-main">{a.title}</div>
                    <div className="text-[11px] text-text-muted">{a.notes}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-2 text-text-muted">
                      {a.status}
                    </span>
                    <div className="text-[10px] text-text-muted mt-1">{a.due_date || a.created_at}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
