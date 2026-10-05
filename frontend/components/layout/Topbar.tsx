"use client"

import React, { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/store/authStore"
import { api } from "@/lib/api"
import { Search, Bell, Sun, Moon, CheckCircle2, Shield } from "lucide-react"

interface TopbarProps {
  onOpenCommandPalette?: () => void
}

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifMenu, setShowNotifMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications")
      setNotifications(res.data || [])
    } catch (e) {
      // ignore
    }
  }

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all")
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      // ignore
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <header className="h-16 border-b border-border glass-nav sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Search Bar / Command Palette Trigger */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2 rounded-control bg-surface-2/80 hover:bg-surface-2 border border-border text-xs text-text-muted transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <span>Search customer by name, ID or press <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-[10px]">Ctrl+K</kbd></span>
          </div>
          <span className="text-[10px] text-text-muted font-mono hidden sm:inline">⌘K</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Role Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono tracking-wider bg-brand/10 text-brand border border-brand/20">
          <Shield className="w-3 h-3" />
          <span>{user?.role || "RM"} Mode</span>
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-control text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors border border-border/50"
            title="Toggle color theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-control text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors relative border border-border/50"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-surface" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-card shadow-lg py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-bold text-text-main">Notifications ({unreadCount} new)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-brand hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-muted">No notifications today.</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs hover:bg-surface-2 transition-colors ${
                        !n.is_read ? "bg-brand/5 font-medium" : ""
                      }`}
                    >
                      <div className="text-text-main font-semibold leading-tight">{n.title}</div>
                      <div className="text-[11px] text-text-muted mt-1 leading-snug">{n.body}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-violet text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.full_name ? user.full_name[0] : "U"}
          </div>
        </div>
      </div>
    </header>
  )
}
