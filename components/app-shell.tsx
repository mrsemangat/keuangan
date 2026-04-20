'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileBarChart2,
  LogOut,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Bell,
  Settings,
} from 'lucide-react'
import { getAuth, logout } from '@/lib/store'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/siswa', label: 'Data Siswa', icon: Users },
  { href: '/dashboard/laporan', label: 'Laporan', icon: FileBarChart2 },
  { href: '/dashboard/pengaturan', label: 'Pengaturan', icon: Settings },
]

interface Props {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [auth, setAuth] = useState<{ name: string; role: string } | null>(null)
  const brand = useBrand()

  useEffect(() => {
    const a = getAuth()
    if (!a?.loggedIn) {
      router.replace('/')
    } else {
      setAuth({ name: a.name, role: a.role })
    }
  }, [router])

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  const getPageTitle = () => {
    const item = navItems.find((n) => n.href === pathname)
    return item?.label ?? 'Hitungin'
  }

  if (!auth) return null

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sidebar-foreground text-base leading-tight">{brand.appName}</p>
            <p className="text-sidebar-foreground/50 text-xs">{brand.tagline}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{label}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {auth.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-sm font-semibold truncate">{auth.name}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">{auth.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 h-14 bg-card border-b border-border">
          <button
            className="lg:hidden text-foreground hover:text-primary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-base font-semibold text-foreground">{getPageTitle()}</h1>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
              {auth.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
