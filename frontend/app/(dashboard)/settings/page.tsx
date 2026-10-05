'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { 
  Settings, 
  User, 
  Sun, 
  Moon, 
  Monitor, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  Sliders, 
  Save 
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number>(0.70);
  const [emailDigest, setEmailDigest] = useState<boolean>(true);
  const [driftAlerts, setDriftAlerts] = useState<boolean>(true);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Settings className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Preferences & Interface Settings
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize display themes, alert thresholds, and notification delivery options.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Preferences updated and persisted successfully.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          Identity & Staff Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              readOnly
              value={user?.full_name || 'Balaji S'}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Corporate Email
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || 'admin@churnguard.io'}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Security Clearance & Role
            </label>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {user?.role || 'admin'}
              </span>
              <span className="text-xs text-slate-400">
                Managed via Admin Role-Based Access Control (RBAC)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-indigo-600" />
          Appearance & Contrast Theme
        </h2>
        <p className="text-xs text-slate-500">
          Select your visual theme. High contrast and fine-tuned dark palette engineered for trading desks and financial analysts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span className="text-xs font-bold">Light Mode</span>
            <span className="text-[11px] text-slate-400">Clean institutional white</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-xs font-bold">Dark Slate</span>
            <span className="text-[11px] text-slate-400">Deep obsidian background</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'system'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="text-xs font-bold">System Sync</span>
            <span className="text-[11px] text-slate-400">Auto match OS settings</span>
          </button>
        </div>
      </div>

      {/* Notifications & Thresholds */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          Alert Thresholds & Subscriptions
        </h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <span>RM Urgent Alert Threshold</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {(alertThreshold * 100).toFixed(0)}% Probability
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Trigger high-priority toast alerts and watchlist escalation whenever customer churn probability exceeds this level.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Weekly Executive Retention Digest</div>
                <div className="text-xs text-slate-500">Receive Monday morning portfolio snapshot summary via email.</div>
              </div>
              <input
                type="checkbox"
                checked={emailDigest}
                onChange={(e) => setEmailDigest(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Model Drift & PSI Alerts</div>
                <div className="text-xs text-slate-500">Instant notification if any feature PSI exceeds the 0.10 threshold.</div>
              </div>
              <input
                type="checkbox"
                checked={driftAlerts}
                onChange={(e) => setDriftAlerts(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 accent-indigo-600"
              />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
