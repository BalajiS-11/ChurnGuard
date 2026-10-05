"use client"

import React, { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { ProbabilityGauge } from "@/components/ui/ProbabilityGauge"
import { RiskBadge } from "@/components/ui/RiskBadge"
import { ShapWaterfall } from "@/components/charts/ShapWaterfall"
import {
  Sliders,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingDown
} from "lucide-react"

export default function WhatIfPage() {
  const [baseFeatures, setBaseFeatures] = useState({
    credit_score: 619,
    geography: "Germany",
    gender: "Female",
    age: 48,
    tenure: 2,
    balance: 125510.82,
    num_of_products: 3,
    has_cr_card: 1,
    is_active_member: 0,
    estimated_salary: 71725.73
  })

  const [simProducts, setSimProducts] = useState(2)
  const [simActive, setSimActive] = useState(1)
  const [simBalance, setSimBalance] = useState(95000)
  const [simTenure, setSimTenure] = useState(4)

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [savedAction, setSavedAction] = useState(false)

  useEffect(() => {
    runSimulation()
  }, [simProducts, simActive, simBalance, simTenure])

  const runSimulation = async () => {
    setLoading(true)
    try {
      const modified = {
        ...baseFeatures,
        num_of_products: simProducts,
        is_active_member: simActive,
        balance: simBalance,
        tenure: simTenure
      }

      const res = await api.post("/predict/whatif", {
        base_features: baseFeatures,
        modified_features: modified
      })
      setResult(res.data)
    } catch (e) {
      console.error("What-if simulator error:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAction = () => {
    setSavedAction(true)
    setTimeout(() => setSavedAction(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Interactive What-If Scenario Simulator
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Model the causal impact of retention offers, product bundling, and engagement interventions.
          </p>
        </div>
      </div>

      {savedAction && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-control flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Intervention scenario saved to Retention Strategy Roadmap.</span>
        </div>
      )}

      {/* Delta Banner */}
      {result && (
        <div className="bg-surface border border-border rounded-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-semibold">Projected Retention Impact</div>
              <div className="text-2xl font-bold text-text-main tabular-nums">
                {(result.baseline_probability * 100).toFixed(1)}% ? {(result.scenario_probability * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-text-muted">Net Risk Reduction</div>
              <div className="text-xl font-bold text-emerald-500 tabular-nums">
                {result.delta_points.toFixed(1)} percentage pts
              </div>
            </div>
            <button
              onClick={handleSaveAction}
              className="px-4 py-2 rounded-control text-xs font-semibold bg-brand text-white hover:opacity-95 shadow"
            >
              Save as Retention Plan
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-6 bg-surface border border-border rounded-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand" />
              Adjust Account Levers
            </h3>
            <button
              onClick={() => {
                setSimProducts(baseFeatures.num_of_products)
                setSimActive(baseFeatures.is_active_member)
                setSimBalance(baseFeatures.balance)
                setSimTenure(baseFeatures.tenure)
              }}
              className="text-xs text-text-muted hover:text-text-main flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* Products */}
            <div>
              <div className="flex justify-between font-semibold mb-1.5">
                <span>Products Held: {simProducts}</span>
                <span className="text-text-muted font-normal">Baseline: {baseFeatures.num_of_products}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={simProducts}
                onChange={(e) => setSimProducts(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>1 product</span>
                <span>2 (optimal)</span>
                <span>3</span>
                <span>4 products</span>
              </div>
            </div>

            {/* Member Active Status */}
            <div className="flex items-center justify-between p-3 rounded-control bg-surface-2">
              <div>
                <span className="font-semibold block">Active Digital Banking Engagement</span>
                <span className="text-[11px] text-text-muted">Simulate mobile app check-in & card spend</span>
              </div>
              <button
                type="button"
                onClick={() => setSimActive(simActive === 1 ? 0 : 1)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  simActive === 1 ? "bg-emerald-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-text-muted"
                }`}
              >
                {simActive === 1 ? "Active Member" : "Inactive"}
              </button>
            </div>

            {/* Balance */}
            <div>
              <div className="flex justify-between font-semibold mb-1.5">
                <span>Account Balance: €{simBalance.toLocaleString()}</span>
                <span className="text-text-muted font-normal">Baseline: €{baseFeatures.balance.toLocaleString()}</span>
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

            {/* Tenure */}
            <div>
              <div className="flex justify-between font-semibold mb-1.5">
                <span>Relationship Tenure: {simTenure} years</span>
                <span className="text-text-muted font-normal">Baseline: {baseFeatures.tenure} yrs</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={simTenure}
                onChange={(e) => setSimTenure(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Gauges & Drivers Comparison */}
        <div className="lg:col-span-6 bg-surface border border-border rounded-card p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-text-main">Intervention Comparison</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-control bg-surface-2 text-center">
              <span className="text-xs text-text-muted uppercase font-semibold block mb-2">Original Baseline</span>
              <div className="text-3xl font-extrabold text-red-500 tabular-nums">
                {result ? `${(result.baseline_probability * 100).toFixed(0)}%` : "81%"}
              </div>
              <div className="mt-2">
                <RiskBadge tier={result?.baseline_risk_tier || "critical"} />
              </div>
            </div>

            <div className="p-4 rounded-control bg-surface-2 text-center border-2 border-emerald-500/30">
              <span className="text-xs text-text-muted uppercase font-semibold block mb-2">Simulated Scenario</span>
              <div className="text-3xl font-extrabold text-emerald-500 tabular-nums">
                {result ? `${(result.scenario_probability * 100).toFixed(0)}%` : "34%"}
              </div>
              <div className="mt-2">
                <RiskBadge tier={result?.scenario_risk_tier || "low"} />
              </div>
            </div>
          </div>

          {result && (
            <div>
              <h4 className="text-xs font-bold text-text-main mb-2">Scenario Risk Contributors</h4>
              <ShapWaterfall drivers={result.drivers || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
