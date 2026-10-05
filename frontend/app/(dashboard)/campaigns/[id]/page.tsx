'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { useAuthStore } from '@/store/authStore';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'analytics' | 'audience'>('analytics');

  // Fetch campaign info
  const { data: campaign, isLoading: campLoading, refetch: refetchCamp } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await api.get(`/campaigns/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch results / uplift
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['campaign-results', id],
    queryFn: async () => {
      const res = await api.get(`/campaigns/${id}/results`);
      return res.data;
    },
    enabled: !!id
  });

  // Fetch enrolled audience
  const { data: audience, isLoading: audLoading } = useQuery({
    queryKey: ['campaign-audience', id],
    queryFn: async () => {
      const res = await api.get(`/campaigns/${id}/customers`);
      return res.data;
    },
    enabled: !!id
  });

  const handleLaunch = async () => {
    try {
      await api.post(`/campaigns/${id}/launch`);
      refetchCamp();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to launch campaign');
    }
  };

  const handleExportAudience = () => {
    if (!audience || audience.length === 0) return;
    const headers = ['CustomerId', 'Surname', 'Geography', 'Balance', 'RiskTier', 'Group', 'Outcome'];
    const rows = audience.map((c: any) => [
      c.external_id,
      c.surname,
      c.geography,
      c.balance,
      c.latest_risk_tier,
      c.is_control ? 'Control' : 'Treatment',
      c.outcome
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campaign_${id}_audience.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (campLoading || resultsLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-3 text-sm text-slate-500">Loading campaign intelligence...</p>
      </div>
    );
  }

  const treatmentRate = results?.treatment_group?.retention_rate || 0;
  const controlRate = results?.control_group?.retention_rate || 0;
  const uplift = results?.uplift_percentage_points || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {campaign?.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  campaign?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : campaign?.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                }`}
              >
                {campaign?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {campaign?.description || 'Randomized holdout intervention campaign.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {campaign?.status === 'draft' && user?.role !== 'analyst' && user?.role !== 'rm' && (
            <button
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Launch Experiment
            </button>
          )}
          <button
            onClick={handleExportAudience}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audience CSV
          </button>
        </div>
      </div>

      {/* Campaign Summary & Details bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="text-xs text-slate-500">Intervention Offer</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {campaign?.offer || 'Standard Concierge Call'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="text-xs text-slate-500">Control Holdout</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {campaign?.control_pct}% ({results?.control_group?.size || 0} customers)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="text-xs text-slate-500">Target Audience</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            {results?.total_audience?.toLocaleString() || campaign?.audience_size?.toLocaleString()} accounts
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="text-xs text-slate-500">Projected Rev at Risk</div>
          <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(campaign?.projected_revenue_at_risk || 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Causal Uplift Analytics
        </button>
        <button
          onClick={() => setActiveTab('audience')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'audience'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Enrolled Audience ({audience?.length || 0})
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Uplift Hero Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                A/B Randomized Holdout Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing customer retention rates between targeted treatment group and uncontacted control holdout.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Treatment Group */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Treatment Group (Offer Sent)
                    </span>
                    <span className="text-xs text-slate-400">
                      n = {results?.treatment_group?.size || 0}
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {treatmentRate}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {results?.treatment_group?.retained || 0} retained · {results?.treatment_group?.churned || 0} churned
                  </div>
                </div>

                {/* Control Group */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Control Holdout (No Offer)
                    </span>
                    <span className="text-xs text-slate-400">
                      n = {results?.control_group?.size || 0}
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-slate-700 dark:text-slate-300">
                    {controlRate}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {results?.control_group?.retained || 0} retained · {results?.control_group?.churned || 0} churned
                  </div>
                </div>
              </div>

              {/* Visual Uplift comparison bars */}
              <div className="mt-6 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>Treatment Retention</span>
                    <span>{treatmentRate}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${treatmentRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>Control Retention</span>
                    <span>{controlRate}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 dark:bg-slate-600 rounded-full transition-all duration-500"
                      style={{ width: `${controlRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metric Card */}
            <div className="p-6 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Causal Uplift & ROI
                </span>
                <div className="mt-4">
                  <div className="text-xs text-slate-500">Incremental Retention Uplift</div>
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-1 flex items-baseline gap-1">
                    {uplift >= 0 ? `+${uplift}` : uplift}%
                    <span className="text-xs font-normal text-slate-500">points</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-100 dark:border-indigo-900/60">
                  <div className="text-xs text-slate-500">Projected Revenue Saved</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(results?.projected_revenue_saved || 0)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Calculated from net retained balance delta
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-indigo-100 dark:border-indigo-900 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-indigo-600 inline mr-1" />
                Statistically valid A/B methodology prevents attributing baseline organic retention to the intervention.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === 'audience' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Geography</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Churn Prob</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {audience && audience.length > 0 ? (
                  audience.map((c: any) => (
                    <tr key={c.link_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${c.customer_id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 transition-colors"
                        >
                          {c.surname}
                        </Link>
                        <div className="text-xs text-slate-400">{c.external_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.geography}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {formatCurrency(c.balance)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {formatPercent(c.latest_probability || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge tier={c.latest_risk_tier || 'medium'} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            c.is_control
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {c.is_control ? 'Control' : 'Treatment'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold capitalize ${
                            c.outcome === 'retained'
                              ? 'text-emerald-600'
                              : c.outcome === 'churned'
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.outcome === 'retained'
                                ? 'bg-emerald-500'
                                : c.outcome === 'churned'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {c.outcome}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No customer audience enrolled yet. Launch campaign to enroll cohort.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
