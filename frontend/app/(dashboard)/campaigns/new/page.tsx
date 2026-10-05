'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calculator, 
  Users, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface SegmentRule {
  field: string;
  op: string;
  value: string;
}

export default function NewCampaignPage() {
  const router = useRouter();

  // Step 1: Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [offer, setOffer] = useState('3-Month Account Fee Waiver + Concierge Review');
  const [controlPct, setControlPct] = useState(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);

  // Step 2: Segment Rules
  const [rules, setRules] = useState<SegmentRule[]>([
    { field: 'latest_risk_tier', op: 'in', value: 'high,critical' },
    { field: 'geography', op: 'eq', value: 'Germany' }
  ]);

  // Step 3: Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    audience_size: number;
    projected_revenue_at_risk: number;
    sample_customers: any[];
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldOptions = [
    { value: 'latest_risk_tier', label: 'Risk Tier', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
    { value: 'geography', label: 'Geography', type: 'select', options: ['France', 'Germany', 'Spain'] },
    { value: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male'] },
    { value: 'num_of_products', label: 'Number of Products', type: 'number' },
    { value: 'is_active_member', label: 'Active Member (0 or 1)', type: 'number' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'balance', label: 'Account Balance ($)', type: 'number' },
    { value: 'credit_score', label: 'Credit Score', type: 'number' }
  ];

  const handleAddRule = () => {
    setRules([...rules, { field: 'age', op: 'gte', value: '45' }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, key: keyof SegmentRule, val: string) => {
    const updated = [...rules];
    updated[index][key] = val;
    setRules(updated);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      // Format rules for backend
      const formattedRules = rules.map(r => ({
        field: r.field,
        op: r.op,
        value: r.op === 'in' ? r.value.split(',').map(s => s.trim()) : r.value
      }));

      const res = await api.post('/campaigns/preview', {
        segment_rules: formattedRules
      });
      setPreviewResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview segment');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (launchImmediately: boolean = false) => {
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formattedRules = rules.map(r => ({
        field: r.field,
        op: r.op,
        value: r.op === 'in' ? r.value.split(',').map(s => s.trim()) : r.value
      }));

      const res = await api.post('/campaigns', {
        name,
        description,
        segment_rules: formattedRules,
        offer,
        control_pct: Number(controlPct),
        start_date: startDate,
        end_date: endDate
      });

      if (launchImmediately && res.data?.id) {
        await api.post(`/campaigns/${res.data.id}/launch`);
      }

      router.push('/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create campaign');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/campaigns"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Create Retention Campaign
          </h1>
          <p className="text-xs text-slate-500">
            Configure segment rules, personalized retention offer, and A/B control split.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Campaign Details */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            1
          </span>
          Campaign Strategy & Offer
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Campaign Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 High-Value German Churn Intervention"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Description / Objective
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Proactive relationship manager call combined with a 3-month account fee waiver for accounts showing high predicted churn."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Retention Offer
            </label>
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. Waive 3m maintenance fee or 0.5% rate discount"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Holdout / Control Group ({controlPct}%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={controlPct}
                onChange={(e) => setControlPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-12 text-right">
                {controlPct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Random holdout without offer for true causal uplift measurement.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Segment Builder */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              2
            </span>
            Target Segment Criteria
          </h2>
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Filter Rule
          </button>
        </div>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
            >
              <div className="w-full sm:w-1/3">
                <select
                  value={rule.field}
                  onChange={(e) => handleRuleChange(idx, 'field', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  {fieldOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-1/4">
                <select
                  value={rule.op}
                  onChange={(e) => handleRuleChange(idx, 'op', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  <option value="eq">Equals (=)</option>
                  <option value="neq">Not Equals (!=)</option>
                  <option value="gt">Greater Than (&gt;)</option>
                  <option value="gte">Greater Than or Equal (&gt;=)</option>
                  <option value="lt">Less Than (&lt;)</option>
                  <option value="lte">Less Than or Equal (&lt;=)</option>
                  <option value="in">In List (comma separated)</option>
                </select>
              </div>

              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                  placeholder="Filter value..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRule(idx)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Calculator className="w-3.5 h-3.5" />
            {previewLoading ? 'Calculating Audience...' : 'Preview Live Audience & Revenue'}
          </button>
        </div>
      </div>

      {/* Step 3: Audience Economics Preview */}
      {previewResult && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Audience Sizing & Economics
            </h3>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Query verified against database
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">Matching Audience</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {previewResult.audience_size.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(previewResult.audience_size * (1 - controlPct / 100)).toFixed(0)} treatment /{' '}
                {(previewResult.audience_size * (controlPct / 100)).toFixed(0)} control
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">Projected Rev at Risk</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(previewResult.projected_revenue_at_risk)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Annualized exposure</div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">Est. 10% Uplift Value</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(previewResult.projected_revenue_at_risk * 0.1)}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Potential savings</div>
            </div>
          </div>

          {previewResult.sample_customers?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">Sample Matching Customers:</div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {previewResult.sample_customers.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.surname}</div>
                    <div className="text-slate-500 text-[11px]">{c.geography} · Age {c.age}</div>
                    <div className="text-rose-600 font-medium mt-1">
                      {formatPercent(c.latest_probability || 0)} churn
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/campaigns"
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-100 transition-colors"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          {saving ? 'Creating...' : 'Launch Campaign'}
        </button>
      </div>
    </div>
  );
}
