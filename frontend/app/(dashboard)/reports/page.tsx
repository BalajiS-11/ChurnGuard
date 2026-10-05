'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Users, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);

  // Fetch summary data for report preview
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    }
  });

  // Fetch top at-risk customers for preview table
  const { data: previewCusts } = useQuery({
    queryKey: ['customers-report-preview'],
    queryFn: async () => {
      const res = await api.get('/customers?page=1&limit=5&risk_tier=critical');
      return res.data;
    }
  });

  const handleExport = async (type: 'csv' | 'pdf') => {
    setDownloading(type);
    try {
      const response = await api.get(`/reports/export?type=${type}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: type === 'pdf' ? 'application/pdf' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `churnguard_${type === 'pdf' ? 'executive_report' : 'portfolio_export'}_${new Date().toISOString().slice(0, 10)}.${type}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to export ${type.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Executive Intelligence & Compliance Reports
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Generate formal PDF briefings for executive leadership, compliance auditors, and relationship management field teams.
        </p>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Executive Briefing */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <FileText className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                PDF Document
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">
              Executive Churn & Risk Intelligence Report
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Publication-grade PDF generated directly via ReportLab. Includes executive portfolio summary, revenue exposure, active model telemetry (v1.0.0, ROC-AUC 0.8592), decision threshold economics, and top 20 critical-risk client accounts.
            </p>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Executive portfolio metrics & revenue breakdown
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active model card & calibration governance
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Highest-exposure client dossiers & next-best-actions
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => handleExport('pdf')}
              disabled={downloading === 'pdf'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              {downloading === 'pdf' ? 'Compiling PDF Report...' : 'Download Executive PDF Report'}
            </button>
          </div>
        </div>

        {/* CSV Portfolio Export */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                CSV Spreadsheet
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">
              Scored Portfolio Data Export
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Direct streaming data export containing the top 1,000 evaluated customer accounts with calibrated churn probabilities, risk tiers, account balances, and demographics. Respects RBAC PII data masking automatically.
            </p>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1,000 sorted accounts by risk rank
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Full feature vector & calibrated probability
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Automatic Surname PII masking for Analysts
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => handleExport('csv')}
              disabled={downloading === 'csv'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              {downloading === 'csv' ? 'Generating CSV...' : 'Download Portfolio CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Live In-Browser Report Preview */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Live Report Preview & Governance Proof
            </h2>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Generated: {new Date().toLocaleDateString()}
          </span>
        </div>

        {/* Mock report paper preview */}
        <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/60 font-sans space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              ChurnGuard &middot; Commercial Banking Division
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Customer Retention & Churn Intelligence Briefing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized distribution only &middot; Prepared for {user?.full_name || 'Executive'} ({user?.role?.toUpperCase()})
            </p>
          </div>

          {/* Report Summary Data Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Portfolio</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {summary?.total_customers?.toLocaleString() || '10,000'} clients
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">At-Risk Count</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {summary?.at_risk_count?.toLocaleString() || '2,037'} accounts
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Revenue at Risk</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {formatCurrency(summary?.revenue_at_risk || 378290)}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Model Reliability</div>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                0.8592 ROC-AUC
              </div>
            </div>
          </div>

          {/* Sample Table in Preview */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Critical Risk Client Sample (Included in Briefing Dossier)
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Customer ID</th>
                    <th className="px-3 py-2">Client Name</th>
                    <th className="px-3 py-2">Geography</th>
                    <th className="px-3 py-2">Balance</th>
                    <th className="px-3 py-2">Churn Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewCusts?.customers?.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 font-mono text-slate-500">{c.external_id}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{c.surname}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{c.geography}</td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(c.balance)}</td>
                      <td className="px-3 py-2 font-bold text-rose-600">
                        {formatPercent(c.latest_probability || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
