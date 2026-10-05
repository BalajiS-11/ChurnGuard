"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import {
  LayoutDashboard,
  Eye,
  Users,
  BrainCircuit,
  Megaphone,
  Lightbulb,
  FlaskConical,
  Activity,
  FileText,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const role = user?.role || "admin"

  const navItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "rm", "analyst"] },
    { title: "Watchlist", href: "/watchlist", icon: Eye, roles: ["admin", "manager", "rm"] },
    { title: "Customers", href: "/customers", icon: Users, roles: ["admin", "manager", "rm", "analyst"] },
    { title: "Predict", href: "/predict/single", icon: BrainCircuit, roles: ["admin", "manager", "rm", "analyst"] },
    { title: "Campaigns", href: "/campaigns", icon: Megaphone, roles: ["admin", "manager"] },
    { title: "Insights", href: "/insights", icon: Lightbulb, roles: ["admin", "manager", "rm", "analyst"] },
    { title: "Model Lab", href: "/model-lab", icon: FlaskConical, roles: ["admin", "analyst"] },
    { title: "Monitoring", href: "/monitoring", icon: Activity, roles: ["admin", "analyst"] },
    { title: "Reports", href: "/reports", icon: FileText, roles: ["admin", "manager", "analyst"] },
    { title: "Admin", href: "/admin", icon: Shield, roles: ["admin"] },
    { title: "Settings", href: "/settings", icon: Settings, roles: ["admin", "manager", "rm", "analyst"] }
  ]

  const filteredNav = navItems.filter(item => item.roles.includes(role))

  return (
    <aside
      className={`h-screen bg-surface border-r border-border flex flex-col transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-text-main leading-tight flex items-center gap-1.5">
                ChurnGuard
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-brand/10 text-brand rounded">
                  v1.0
                </span>
              </div>
              <div className="text-[10px] text-text-muted">Retention Intelligence</div>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-indigo to-brand-violet flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors hidden lg:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-all group ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-muted hover:text-text-main hover:bg-surface-2"
              }`}
              title={collapsed ? item.title : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-text-muted group-hover:text-text-main"}`} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          )
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-border">
        {!collapsed ? (
          <div className="flex items-center justify-between p-2 rounded-control bg-surface-2/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {user?.full_name ? user.full_name[0] : "U"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text-main truncate">
                  {user?.full_name || "Demo User"}
                </div>
                <div className="text-[10px] text-text-muted uppercase font-mono tracking-wider">
                  {user?.role || "RM"}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-text-muted hover:text-red-500 rounded-md hover:bg-surface transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center p-2 text-text-muted hover:text-red-500 hover:bg-surface-2 rounded-control"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
