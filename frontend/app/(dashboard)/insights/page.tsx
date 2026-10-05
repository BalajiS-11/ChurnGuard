'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  PieChart, 
  Lightbulb, 
  Layers, 
  CheckCircle2, 
  Globe, 
  Users, 
  CreditCard 
} from 'lucide-react';
import { formatPercent } from '@/lib/utils';
import { InsightCaption } from '@/components/ui/InsightCaption';

export default function InsightsPage() {
  const [selectedSegment, setSelectedSegment] = useState<'geography' | 'products' | 'age_group' | 'gender'>('geography');

  // Fetch EDA & Global SHAP data
  const { data: insightsData, isLoading } = useQuery({
    queryKey: ['insights-eda'],
    queryFn: async () => {
      const res = await api.get('/models/eda');
      return res.data;
    }
  });

  // Fetch segment breakdowns
  const { data: segmentData } = useQuery({
    queryKey: ['dashboard-segments', selectedSegment],
    queryFn: async () => {
      const res = await api.get(`/dashboard/segments?by=${selectedSegment}`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-3 text-sm text-slate-500">Loading portfolio insights & SHAP explainability...</p>
      </div>
    );
  }

  const globalShap = insightsData?.global_shap || [];
  const eda = insightsData?.eda || {};
  const segments = eda?.segments || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portfolio Intelligence & Feature Attribution
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Global SHAP (Shapley Additive Explanations) feature importance derived from 10,000 banking customers,
          paired with empirical exploratory data analysis (EDA) segment distributions.
        </p>
      </div>

      {/* Top 3 Strategic Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4" /> German Geography Vulnerability
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">
            32.4% Churn Rate in Germany
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            German accounts churn at more than double the rate of French accounts (16.1%) and Spanish accounts (16.7%), with high mean balances.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs uppercase tracking-wider">
            <CreditCard className="w-4 h-4" /> Multi-Product Paradox
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">
            82.7% Churn for 3+ Products
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Customers with 2 products exhibit optimal retention (7.6% churn). However, holders of 3 or 4 products churn at 82.7% and 100%, signaling product confusion or orphan accounts.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" /> Age & Inactivity Inversion
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">
            56.5% Churn in Ages 50–60
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Churn risk peaks between ages 45–60. Inactive membership amplifies churn risk by 1.89× compared to active digital and branch users.
          </p>
        </div>
      </div>

      {/* Main Grid: SHAP Feature Importance & Segment Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global SHAP Bar Plot */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Global SHAP Feature Importance
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                Mean |SHAP| Value
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Top predictors driving the XGBoost model&apos;s log-odds predictions across the test set.
            </p>

            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={globalShap.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}`, 'Mean |SHAP|']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none'
                    }}
                  />
                  <Bar dataKey="importance" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {globalShap.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#4f46e5' : index < 3 ? '#6366f1' : '#818cf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <InsightCaption text="Age is the single largest global risk contributor, followed by NumOfProducts and IsActiveMember. Engineered features like BalanceToSalaryRatio and AgeGroup provide nonlinear uplift to model discriminative ability." />
        </div>

        {/* Interactive Bivariate Segments */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Empirical Churn by Cohort
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actual historical churn rates across client population segments.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(['geography', 'products', 'age_group', 'gender'] as const).map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setSelectedSegment(seg)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                      selectedSegment === seg
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {seg.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentData || []} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: string) => [
                      name === 'churn_rate' ? `${val}%` : val,
                      name === 'churn_rate' ? 'Churn Rate' : 'Customer Count'
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none'
                    }}
                  />
                  <Bar dataKey="churn_rate" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                    {(segmentData || []).map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.churn_rate > 30 ? '#e11d48' : entry.churn_rate > 20 ? '#f43f5e' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Red bars highlight segments exceeding the 20.37% portfolio baseline.</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {segmentData?.reduce((acc: number, item: any) => acc + item.total, 0).toLocaleString()} customers analyzed
            </span>
          </div>
        </div>
      </div>

      {/* Deep-Dive Breakdown Table */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Detailed Cohort Distribution & Impact Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Cohort Category</th>
                <th className="px-4 py-3">Total Volume</th>
                <th className="px-4 py-3">Portfolio Share</th>
                <th className="px-4 py-3">Churn Count</th>
                <th className="px-4 py-3">Empirical Churn Rate</th>
                <th className="px-4 py-3">Risk Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(segmentData || []).map((row: any, idx: number) => {
                const totalPortfolio = 10000;
                const share = ((row.total / totalPortfolio) * 100).toFixed(1);
                const isElevated = row.churn_rate > 20.37;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {row.category}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {row.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {share}%
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {row.churn_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${isElevated ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.churn_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          row.churn_rate > 50
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : row.churn_rate > 25
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {row.churn_rate > 50 ? 'Extreme Hazard' : row.churn_rate > 25 ? 'High Risk' : 'Low Baseline'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
