'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  Megaphone, 
  Plus, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface CampaignItem {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  offer?: string;
  control_pct: number;
  audience_size: number;
  projected_revenue_at_risk: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export default function CampaignsPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: campaigns, isLoading, refetch } = useQuery<CampaignItem[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data;
    }
  });

  const handleLaunch = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await api.post(`/campaigns/${id}/launch`);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to launch campaign');
    }
  };

  const filteredCampaigns = campaigns?.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  }) || [];

  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
  const totalAudience = campaigns?.reduce((acc, c) => acc + (c.audience_size || 0), 0) || 0;
  const totalRevenueAtRisk = campaigns?.reduce((acc, c) => acc + (c.projected_revenue_at_risk || 0), 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Retention Campaigns
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Design targeted intervention playbooks, run randomized control tests, and measure revenue uplift.
          </p>
        </div>
        {user?.role !== 'analyst' && user?.role !== 'rm' && (
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Campaigns</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{totalCampaigns}</div>
          <div className="mt-1 text-xs text-slate-500">{activeCampaigns} currently running</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Interventions</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{activeCampaigns}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">Delivering targeted offers</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Targeted Audience</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{totalAudience.toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-500">Customers across all programs</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Revenue at Risk</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenueAtRisk)}</div>
          <div className="mt-1 text-xs text-slate-500">Under active protection</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['all', 'active', 'draft', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-slate-500">Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <Megaphone className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No campaigns found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {statusFilter !== 'all' 
              ? `There are currently no campaigns with status "${statusFilter}".` 
              : 'Create your first automated retention playbook to engage at-risk customers.'}
          </p>
          {user?.role !== 'analyst' && user?.role !== 'rm' && (
            <Link
              href="/campaigns/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      camp.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                        : camp.status === 'completed'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      camp.status === 'active' ? 'bg-emerald-500 animate-pulse' : camp.status === 'completed' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                    {camp.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Control: {camp.control_pct}%
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {camp.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {camp.description || 'Targeted retention intervention based on machine learning churn scores.'}
                </p>

                {camp.offer && (
                  <div className="mt-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intervention Offer</div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">{camp.offer}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <div className="text-xs text-slate-500">Audience</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {camp.audience_size?.toLocaleString()} customers
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Rev at Risk</div>
                    <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      {formatCurrency(camp.projected_revenue_at_risk || 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                {camp.status === 'draft' && user?.role !== 'analyst' && user?.role !== 'rm' ? (
                  <button
                    onClick={(e) => handleLaunch(camp.id, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Launch
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {camp.start_date || 'Ongoing'}
                  </span>
                )}

                <Link
                  href={`/campaigns/${camp.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline ml-auto"
                >
                  View Analytics <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
