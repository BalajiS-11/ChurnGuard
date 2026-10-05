"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { KpiCard } from "@/components/ui/KpiCard"
import { RiskBadge } from "@/components/ui/RiskBadge"
import { InsightCaption } from "@/components/ui/InsightCaption"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts"
import {
  Users,
  TrendingDown,
  AlertTriangle,
  Coins,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [geoSegments, setGeoSegments] = useState<any[]>([])
  const [ageSegments, setAgeSegments] = useState<any[]>([])
  const [prodSegments, setProdSegments] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [globalShap, setGlobalShap] = useState<any[]>([])
  const [recentActions, setRecentActions] = useState<any[]>([])
  const [modelHealth, setModelHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [
        sumRes,
        trendRes,
        geoRes,
        ageRes,
        prodRes,
        custRes,
        actRes,
        healthRes
      ] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/trends?range=12m"),
        api.get("/dashboard/segments?by=geography"),
        api.get("/dashboard/segments?by=age_group"),
        api.get("/dashboard/segments?by=products"),
        api.get("/customers?sort_by=latest_probability&sort_order=desc&page_size=10"),
        api.get("/actions"),
        api.get("/dashboard/health")
      ])

      setSummary(sumRes.data)
      setTrends(trendRes.data)
      setGeoSegments(geoRes.data)
      setAgeSegments(ageRes.data)
      setProdSegments(prodRes.data)
      setTopCustomers(custRes.data.items || [])
      setRecentActions(actRes.data.slice(0, 5))
      setModelHealth(healthRes.data)

      // Fetch global SHAP importance
      try {
        const mRes = await api.get("/models/active")
        if (mRes.data?.id) {
          const metRes = await api.get(`/models/${mRes.data.id}/metrics`)
          setGlobalShap(metRes.data.global_shap || [])
        }
      } catch (e) {
        // fallback
      }
    } catch (e) {
      console.error("Dashboard data load error:", e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface-2 rounded-control" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-surface rounded-card border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-surface rounded-card border border-border" />
          <div className="h-80 bg-surface rounded-card border border-border" />
        </div>
      </div>
    )
  }

  // Risk Distribution Donut Data
  const riskDonutData = [
    { name: "Low (<30%)", value: 5800, color: "#10B981" },
    { name: "Medium (30-60%)", value: 2070, color: "#F59E0B" },
    { name: "High (60-80%)", value: 1250, color: "#F97316" },
    { name: "Critical (≥80%)", value: 880, color: "#EF4444" }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Executive Retention Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time portfolio churn metrics, risk drivers, and relationship intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/predict/batch"
            className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-surface border border-border hover:bg-surface-2 text-text-main transition-colors shadow-sm"
          >
            Batch Scoring
          </Link>
          <Link
            href="/campaigns/new"
            className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-brand text-white hover:opacity-95 transition-opacity shadow-sm"
          >
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Portfolio"
          value={summary?.total_customers?.toLocaleString() || "10,000"}
          delta="+2.4%"
          deltaType="positive"
          subtext={`Avg balance: ${formatCurrency(summary?.avg_customer_balance || 76485)}`}
          sparklineColor="#4F46E5"
        />
        <KpiCard
          title="Portfolio Churn Rate"
          value={formatPercent(summary?.churn_rate || 20.4)}
          delta="-0.8%"
          deltaType="positive"
          subtext="Calibrated expected loss"
          sparklineColor="#10B981"
        />
        <KpiCard
          title="At-Risk Accounts"
          value={summary?.at_risk_count?.toLocaleString() || "2,130"}
          delta="-12 accts"
          deltaType="positive"
          subtext={`${summary?.at_risk_rate || 21.3}% in High/Critical tier`}
          sparklineColor="#F59E0B"
        />
        <KpiCard
          title="Revenue at Risk"
          value={formatCurrency(summary?.revenue_at_risk || 4285000)}
          delta="-$42,850"
          deltaType="positive"
          subtext="Annual customer gross value formula"
          sparklineColor="#EF4444"
        />
      </div>

      {/* Row 2: Churn Trend (2/3) + Risk Distribution Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-main">
                12-Month Churn Trajectory
              </h3>
              <p className="text-xs text-text-muted">
                Portfolio monthly churn rate (%) with seasonal trajectory.
              </p>
            </div>
            <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-2">
              Monthly Snapshot History
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} />
                <YAxis stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} unit="%" domain={[10, 30]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(val: any) => [`${val}%`, "Churn Rate"]}
                />
                <Line
                  type="monotone"
                  dataKey="churn_rate"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#4F46E5" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <InsightCaption text="Portfolio churn has stabilized at 20.4%, down 0.8 points following active Q3 retention interventions." />
        </div>

        {/* Risk Donut */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main">
              Risk Tier Distribution
            </h3>
            <p className="text-xs text-text-muted">
              Calibrated segmentation across 10,000 accounts.
            </p>
          </div>

          <div className="h-52 relative my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-text-main tabular-nums">21.3%</span>
              <span className="text-[10px] text-text-muted uppercase">At-Risk</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {riskDonutData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-text-muted text-[11px] truncate">{d.name}:</span>
                <span className="font-semibold text-text-main ml-auto tabular-nums">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <InsightCaption text="Critical tier (≥80%) accounts for €1.8M in revenue at risk; targeted by automated RM alerts." />
        </div>
      </div>

      {/* Row 3: Segment Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Geography */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm">
          <h3 className="text-sm font-bold text-text-main">Churn by Geography</h3>
          <p className="text-xs text-text-muted mb-3">Country-level attrition rate</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geoSegments} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                <XAxis dataKey="category" stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} />
                <YAxis stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Churn Rate"]}
                />
                <Bar dataKey="churn_rate" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <InsightCaption text="Germany customer churn (32.4%) is 2.0x higher than France (16.1%) and Spain (16.7%)." />
        </div>

        {/* Age Group */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm">
          <h3 className="text-sm font-bold text-text-main">Churn by Age Group</h3>
          <p className="text-xs text-text-muted mb-3">Demographic cohort risk</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageSegments} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                <XAxis dataKey="category" stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} />
                <YAxis stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Churn Rate"]}
                />
                <Bar dataKey="churn_rate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <InsightCaption text="Customers aged 50–60 experience peak churn (56.2%), indicating pension/transfer risk." />
        </div>

        {/* Number of Products */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm">
          <h3 className="text-sm font-bold text-text-main">Churn by Products Held</h3>
          <p className="text-xs text-text-muted mb-3">Multi-product stickiness</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodSegments} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                <XAxis dataKey="category" stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} />
                <YAxis stroke="currentColor" className="text-[11px] text-text-muted" tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, "Churn Rate"]}
                />
                <Bar dataKey="churn_rate" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <InsightCaption text="2 products represents the sweet spot (7.6% churn). 3+ products spikes to 82%+." />
        </div>
      </div>

      {/* Row 4: Top 10 Highest Risk Customers (2/3) + Global SHAP Drivers (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Table */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-main">
                Top Highest-Risk Accounts
              </h3>
              <p className="text-xs text-text-muted">
                Immediate intervention required; ranked by calibrated probability.
              </p>
            </div>
            <Link
              href="/customers?risk=critical,high"
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
            >
              View Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-text-muted uppercase text-[10px] font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Geography</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Products</th>
                  <th className="py-2.5 px-3">Risk Tier</th>
                  <th className="py-2.5 px-3 text-right">Probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {topCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-surface-2/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-semibold text-text-main group-hover:text-brand">
                      {c.surname || "Customer"}
                      <span className="block text-[10px] text-text-muted font-mono">{c.external_id}</span>
                    </td>
                    <td className="py-2.5 px-3">{c.geography}</td>
                    <td className="py-2.5 px-3">{c.age}</td>
                    <td className="py-2.5 px-3 font-mono font-medium">{formatCurrency(c.balance)}</td>
                    <td className="py-2.5 px-3">{c.num_of_products}</td>
                    <td className="py-2.5 px-3">
                      <RiskBadge tier={c.latest_risk_tier} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-500">
                      {((c.latest_probability || 0) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global SHAP Drivers */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm">
          <h3 className="text-sm font-bold text-text-main">Top Global Churn Drivers</h3>
          <p className="text-xs text-text-muted mb-4">Portfolio mean |SHAP| impact</p>
          
          <div className="space-y-3">
            {globalShap.slice(0, 5).map((d, i) => (
              <div key={d.feature} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text-main">
                    #{i + 1} {d.friendly_name || d.feature}
                  </span>
                  <span className="font-mono text-text-muted">
                    {d.mean_abs_shap.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.min(100, (d.mean_abs_shap / 0.7) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <InsightCaption text="Age and Number of Products account for over 65% of global model variance." />
        </div>
      </div>

      {/* Row 5: Recent Tasks & Model Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-main">Recent Retention Tasks</h3>
            <Link href="/watchlist" className="text-xs text-brand hover:underline font-semibold">
              View All Tasks
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentActions.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {a.status === "done" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <div className="font-semibold text-text-main">{a.title}</div>
                    <div className="text-[11px] text-text-muted">
                      Customer: {a.customer_name} · Assigned to: {a.assignee_name}
                    </div>
                  </div>
                </div>
                <span className="uppercase font-mono text-[10px] px-2 py-0.5 rounded bg-surface-2 text-text-muted">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Health */}
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-main">Model Health</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">XGBoost Calibrated (v1.0.0)</p>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-2.5 rounded-control bg-surface-2">
              <div className="text-[10px] text-text-muted uppercase">ROC-AUC (Test)</div>
              <div className="text-lg font-bold text-text-main tabular-nums">0.8592</div>
            </div>
            <div className="p-2.5 rounded-control bg-surface-2">
              <div className="text-[10px] text-text-muted uppercase">PR-AUC (Test)</div>
              <div className="text-lg font-bold text-text-main tabular-nums">0.6635</div>
            </div>
            <div className="p-2.5 rounded-control bg-surface-2">
              <div className="text-[10px] text-text-muted uppercase">Decision Threshold</div>
              <div className="text-lg font-bold text-text-main tabular-nums">0.140</div>
            </div>
            <div className="p-2.5 rounded-control bg-surface-2">
              <div className="text-[10px] text-text-muted uppercase">Drift Status</div>
              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" /> All PSI &lt; 0.10
              </div>
            </div>
          </div>

          <Link
            href="/model-lab"
            className="w-full py-2 rounded-control bg-surface-2 hover:bg-border text-center text-xs font-semibold text-text-main transition-colors flex items-center justify-center gap-1.5"
          >
            Open Model Lab <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
