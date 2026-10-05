"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { api } from "@/lib/api"
import { Shield, Sparkles, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [email, setEmail] = useState("manager@churnguard.io")
  const [password, setPassword] = useState("Manager@123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await api.post("/auth/login", { email, password })
      const { access_token, refresh_token, user } = res.data
      login(access_token, refresh_token, user)
      router.push("/dashboard")
    } catch (err: any) {
      if (!err.response) {
        setError("Backend server is not responding (http://localhost:8000). Please ensure the backend is running.")
      } else {
        setError(err.response?.data?.detail || "Invalid email or password.")
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-bg">
      {/* Left Hero Brand Pane */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-8 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Subtle decorative grid/glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">ChurnGuard</div>
              <div className="text-xs text-indigo-200">Retention Intelligence Platform</div>
            </div>
          </div>
        </div>

        <div className="my-auto py-12 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur border border-white/20 text-indigo-100 mb-6">
            <Shield className="w-3.5 h-3.5" /> Calibrated ML & Real-Time Explainability
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Know who's leaving <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-indigo-100">
              before they do.
            </span>
          </h1>
          <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
            Enterprise retention system for modern banking. Predict churn with 0.85+ ROC-AUC, understand drivers with SHAP waterfall explanations, and automate relationship actions.
          </p>
        </div>

        <div className="relative z-10 text-xs text-indigo-300 flex items-center justify-between border-t border-white/10 pt-4">
          <span>Production Release v1.0.0</span>
          <span>Bank-Grade Privacy & RBAC</span>
        </div>
      </div>

      {/* Right Login Pane */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-surface">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-main">
              Sign in to your account
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Select a persona credential below to test role permissions.
            </p>
          </div>

          {/* Demo Credential Quick-Fill Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Quick Demo Personas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("manager@churnguard.io", "Manager@123")}
                className={`p-2.5 text-left rounded-control border transition-all text-xs flex flex-col gap-0.5 ${
                  email === "manager@churnguard.io"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="font-bold text-text-main flex items-center justify-between">
                  Priya (Manager)
                  {email === "manager@churnguard.io" && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                </div>
                <div className="text-[11px] text-text-muted">Portfolio & Campaigns</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("rm@churnguard.io", "Rm@12345")}
                className={`p-2.5 text-left rounded-control border transition-all text-xs flex flex-col gap-0.5 ${
                  email === "rm@churnguard.io"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="font-bold text-text-main flex items-center justify-between">
                  Arjun (RM)
                  {email === "rm@churnguard.io" && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                </div>
                <div className="text-[11px] text-text-muted">Watchlist & Customer 360</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("analyst@churnguard.io", "Analyst@123")}
                className={`p-2.5 text-left rounded-control border transition-all text-xs flex flex-col gap-0.5 ${
                  email === "analyst@churnguard.io"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="font-bold text-text-main flex items-center justify-between">
                  Dr. Meera (Analyst)
                  {email === "analyst@churnguard.io" && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                </div>
                <div className="text-[11px] text-text-muted">Model Lab & Masked PII</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("admin@churnguard.io", "Admin@123")}
                className={`p-2.5 text-left rounded-control border transition-all text-xs flex flex-col gap-0.5 ${
                  email === "admin@churnguard.io"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="font-bold text-text-main flex items-center justify-between">
                  Sam (Admin)
                  {email === "admin@churnguard.io" && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                </div>
                <div className="text-[11px] text-text-muted">Users, Retrain & Audit</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-control bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-control bg-surface-2 border border-border text-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-control bg-gradient-to-r from-brand-indigo to-brand-violet hover:opacity-95 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
