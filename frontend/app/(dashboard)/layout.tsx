"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { CommandPalette } from "@/components/layout/CommandPalette"
import Link from "next/link"
import { LayoutDashboard, Eye, Users, BrainCircuit } from "lucide-react"

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, fetchCurrentUser } = useAuthStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("churnguard_access_token")
      if (!storedToken) {
        router.push("/login")
        return
      }
      if (!user) {
        await fetchCurrentUser()
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [])

  if (!authChecked && !user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg text-text-muted text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mb-4" />
        <span>Authenticating session...</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation (screens < 768px) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-40 glass-nav">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[10px] text-text-muted hover:text-brand">
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </Link>
          <Link href="/watchlist" className="flex flex-col items-center gap-1 text-[10px] text-text-muted hover:text-brand">
            <Eye className="w-4 h-4" />
            <span>Watchlist</span>
          </Link>
          <Link href="/customers" className="flex flex-col items-center gap-1 text-[10px] text-text-muted hover:text-brand">
            <Users className="w-4 h-4" />
            <span>Customers</span>
          </Link>
          <Link href="/predict/single" className="flex flex-col items-center gap-1 text-[10px] text-text-muted hover:text-brand">
            <BrainCircuit className="w-4 h-4" />
            <span>Predict</span>
          </Link>
        </div>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
