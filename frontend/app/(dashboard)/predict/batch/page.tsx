"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { RiskBadge } from "@/components/ui/RiskBadge"
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  Megaphone,
  RefreshCw
} from "lucide-react"

export default function BatchPredictPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])

  const downloadTemplate = () => {
    const csvContent = "CreditScore,Geography,Gender,Age,Tenure,Balance,NumOfProducts,HasCrCard,IsActiveMember,EstimatedSalary,CustomerId,Surname\n650,France,Female,45,3,95000.00,2,1,1,75000.00,15800001,Dupont\n720,Germany,Male,52,4,130000.00,3,1,0,85000.00,15800002,Schmidt\n"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "churnguard_batch_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      setError(null)
      
      // Parse preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split("\n").filter(l => l.trim())
        if (lines.length > 1) {
          const headers = lines[0].split(",")
          const sample = lines.slice(1, 4).map(l => {
            const vals = l.split(",")
            const obj: any = {}
            headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim())
            return obj
          })
          setPreviewRows(sample)
          setStep(2) // Move to validation
        }
      }
      reader.readAsText(selected)
    }
  }

  const startBatchScoring = async () => {
    if (!file) return
    setStep(3)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await api.post("/predict/batch", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      const job = res.data
      setJobId(job.id)
      setJobStatus(job)

      // Poll status
      pollStatus(job.id)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Batch submission failed.")
      setStep(1)
    }
  }

  const pollStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/predict/batch/${id}`)
        setJobStatus(res.data)
        if (res.data.status === "completed") {
          clearInterval(interval)
          setStep(4) // Results
        } else if (res.data.status === "failed") {
          clearInterval(interval)
          setError(res.data.error_report?.summary || "Batch scoring failed.")
          setStep(1)
        }
      } catch (e) {
        clearInterval(interval)
      }
    }, 1000)
  }

  const downloadResults = () => {
    if (!jobId) return
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/predict/batch/${jobId}/download`, "_blank")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-main">
          Batch Prediction Engine
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Upload bulk customer CSV files to execute high-throughput chunked model inference.
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="bg-surface border border-border rounded-card p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          <div className={`p-2 rounded-control border ${step === 1 ? "bg-brand text-white border-brand" : "bg-surface-2 text-text-muted border-border"}`}>
            1. Upload CSV
          </div>
          <div className={`p-2 rounded-control border ${step === 2 ? "bg-brand text-white border-brand" : "bg-surface-2 text-text-muted border-border"}`}>
            2. Validate Schema
          </div>
          <div className={`p-2 rounded-control border ${step === 3 ? "bg-brand text-white border-brand" : "bg-surface-2 text-text-muted border-border"}`}>
            3. Scoring Progress
          </div>
          <div className={`p-2 rounded-control border ${step === 4 ? "bg-brand text-white border-brand" : "bg-surface-2 text-text-muted border-border"}`}>
            4. Scored Results
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-control flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-surface border border-border rounded-card p-10 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Upload Customer File</h3>
            <p className="text-xs text-text-muted mt-1">
              Supports CSV files with banking attributes (CreditScore, Age, Balance, etc.).
            </p>
          </div>

          <label className="inline-block cursor-pointer px-5 py-2.5 rounded-control bg-brand hover:opacity-95 text-white font-semibold text-xs shadow transition-all">
            <span>Select CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div className="pt-4 border-t border-border/50">
            <button
              onClick={downloadTemplate}
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1.5 mx-auto"
            >
              <Download className="w-3.5 h-3.5" /> Download Standard Template CSV
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Validate Schema */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-main">Schema Verification Preview</h3>
              <p className="text-xs text-text-muted">File: {file?.name} ({previewRows.length} sample rows)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1.5 rounded-control text-xs border border-border text-text-muted hover:text-text-main"
              >
                Change File
              </button>
              <button
                onClick={startBatchScoring}
                className="px-4 py-1.5 rounded-control text-xs font-semibold bg-brand text-white hover:opacity-95 flex items-center gap-1"
              >
                <span>Confirm & Score File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-control">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-text-muted text-[10px] uppercase font-semibold">
                <tr>
                  {previewRows[0] && Object.keys(previewRows[0]).map(k => (
                    <th key={k} className="p-2.5">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {previewRows.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-2/40 font-mono text-[11px]">
                    {Object.values(r).map((v: any, j) => (
                      <td key={j} className="p-2.5">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Scoring Progress */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-card p-12 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <RefreshCw className="w-10 h-10 text-brand animate-spin mx-auto" />
          <h3 className="text-base font-bold text-text-main">Scoring Customer Batch...</h3>
          <p className="text-xs text-text-muted">
            Executing vectorized XGBoost inference and calculating calibrated risk tiers.
          </p>

          <div className="w-full bg-surface-2 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{
                width: jobStatus?.total_rows
                  ? `${(jobStatus.processed_rows / jobStatus.total_rows) * 100}%`
                  : "60%"
              }}
            />
          </div>

          <div className="text-xs font-mono text-text-muted">
            Status: {jobStatus?.status || "processing"} · Scored {jobStatus?.processed_rows || 0} rows
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && (
        <div className="bg-surface border border-border rounded-card p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Batch Scoring Completed</h3>
                <p className="text-xs text-text-muted">
                  Scored {jobStatus?.processed_rows || 0} customer records successfully.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={downloadResults}
                className="px-4 py-2 rounded-control text-xs font-semibold bg-brand text-white hover:opacity-95 shadow flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Scored CSV
              </button>
              <button
                onClick={() => router.push("/campaigns/new")}
                className="px-4 py-2 rounded-control text-xs font-semibold bg-surface border border-border hover:bg-surface-2 text-text-main flex items-center gap-1.5"
              >
                <Megaphone className="w-3.5 h-3.5" /> Create Campaign from High Risk
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-control bg-surface-2/60">
              <div className="text-xs text-text-muted uppercase">Total Rows Scored</div>
              <div className="text-2xl font-bold text-text-main mt-1 tabular-nums">
                {jobStatus?.processed_rows?.toLocaleString() || "0"}
              </div>
            </div>
            <div className="p-4 rounded-control bg-surface-2/60">
              <div className="text-xs text-text-muted uppercase">Failed / Corrupt Rows</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
                {jobStatus?.failed_rows || 0}
              </div>
            </div>
            <div className="p-4 rounded-control bg-surface-2/60">
              <div className="text-xs text-text-muted uppercase">Status</div>
              <div className="text-2xl font-bold text-brand mt-1 capitalize">
                {jobStatus?.status || "Done"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
