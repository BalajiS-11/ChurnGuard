"use client"

import React, { useState } from "react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { ProbabilityGauge } from "@/components/ui/ProbabilityGauge"
import { RiskBadge } from "@/components/ui/RiskBadge"
import { ShapWaterfall } from "@/components/charts/ShapWaterfall"
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

const PRESETS = [
  {
    name: "Germany High Risk (48yo, €120k balance, 3 products, inactive)",
    data: {
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
    }
  },
  {
    name: "France Loyal Customer (35yo, €85k balance, 2 products, active)",
    data: {
      credit_score: 720,
      geography: "France",
      gender: "Male",
      age: 35,
      tenure: 6,
      balance: 85000.0,
      num_of_products: 2,
      has_cr_card: 1,
      is_active_member: 1,
      estimated_salary: 65000.0
    }
  },
  {
    name: "Dormant Account (42yo, €0 balance, 1 product, inactive)",
    data: {
      credit_score: 590,
      geography: "Spain",
      gender: "Female",
      age: 42,
      tenure: 1,
      balance: 0.0,
      num_of_products: 1,
      has_cr_card: 1,
      is_active_member: 0,
      estimated_salary: 45000.0
    }
  }
]

export default function SinglePredictPage() {
  const [formData, setFormData] = useState(PRESETS[0].data)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await api.post("/predict", formData)
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Prediction request failed.")
    } finally {
      setLoading(false)
    }
  }

  const handlePresetSelect = (presetIndex: number) => {
    setFormData(PRESETS[presetIndex].data)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Real-Time Single Customer Prediction
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Score customer attributes with calibrated ML and instant SHAP driver decomposition.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Load Preset:</span>
          <select
            onChange={(e) => handlePresetSelect(parseInt(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-control bg-surface border border-border text-text-main focus:outline-none shadow-sm"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-card p-6 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Demographics Group */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                1. Demographics & Geography
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-text-main block mb-1">Geography</label>
                  <select
                    value={formData.geography}
                    onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main"
                  >
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Spain">Spain</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Age ({formData.age})</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Financial Profile */}
            <div className="pt-3 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                2. Financial Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-text-main block mb-1">Credit Score (300-900)</label>
                  <input
                    type="number"
                    min="300"
                    max="900"
                    value={formData.credit_score}
                    onChange={(e) => setFormData({ ...formData, credit_score: parseInt(e.target.value) || 300 })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Account Balance (€)</label>
                  <input
                    type="number"
                    step="500"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Estimated Salary (€)</label>
                  <input
                    type="number"
                    step="500"
                    value={formData.estimated_salary}
                    onChange={(e) => setFormData({ ...formData, estimated_salary: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Engagement Profile */}
            <div className="pt-3 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                3. Engagement & Product Relationship
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-text-main block mb-1">Products Held</label>
                  <select
                    value={formData.num_of_products}
                    onChange={(e) => setFormData({ ...formData, num_of_products: parseInt(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main"
                  >
                    <option value="1">1 Product</option>
                    <option value="2">2 Products</option>
                    <option value="3">3 Products</option>
                    <option value="4">4 Products</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Tenure (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.tenure}
                    onChange={(e) => setFormData({ ...formData, tenure: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-main block mb-1">Member Activity</label>
                  <select
                    value={formData.is_active_member}
                    onChange={(e) => setFormData({ ...formData, is_active_member: parseInt(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-control bg-surface-2 border border-border text-text-main"
                  >
                    <option value="1">Active Member</option>
                    <option value="0">Inactive Member</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 text-xs rounded-control flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-control bg-brand hover:opacity-95 text-white font-semibold text-xs shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4" />
                  <span>Run Inference & Explain</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text-main">Inference Results</h2>
              {result && <RiskBadge tier={result.risk_tier} />}
            </div>

            {!result ? (
              <div className="py-20 text-center text-text-muted text-xs space-y-2">
                <BrainCircuit className="w-10 h-10 text-text-muted/40 mx-auto" />
                <div>Fill the form on the left or select a preset to generate calibrated predictions.</div>
              </div>
            ) : (
              <div className="space-y-6">
                <ProbabilityGauge
                  probability={result.probability}
                  threshold={result.threshold}
                  size={200}
                />

                <div className="p-3 rounded-control bg-surface-2 grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted block">Expected Churn</span>
                    <span className="font-bold text-text-main">{result.predicted_churn ? "YES (Churner)" : "NO (Retained)"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Inference Latency</span>
                    <span className="font-mono font-bold text-text-main">{result.latency_ms} ms</span>
                  </div>
                </div>

                {/* Local SHAP Drivers */}
                <div>
                  <h4 className="text-xs font-bold text-text-main mb-2">Key Drivers</h4>
                  <ShapWaterfall drivers={result.drivers || []} />
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xs font-bold text-text-main mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand" /> Next Best Action
                  </h4>
                  {result.recommendations?.length > 0 && (
                    <div className="p-3 rounded-control border border-border bg-brand/5 text-xs space-y-1">
                      <div className="font-bold text-text-main">{result.recommendations[0].title}</div>
                      <div className="text-[11px] text-text-muted">{result.recommendations[0].description}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
