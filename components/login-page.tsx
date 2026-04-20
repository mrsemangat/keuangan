'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, BookOpen, ShieldCheck, Lock } from 'lucide-react'
import { login, getLoginLockoutSeconds, getRemainingLoginAttempts } from '@/lib/store'
import { useBrand } from '@/hooks/use-brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const brand = useBrand()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockoutSecs, setLockoutSecs] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState(5)

  // Poll lockout countdown every second
  useEffect(() => {
    const tick = () => {
      const secs = getLoginLockoutSeconds()
      const rem  = getRemainingLoginAttempts()
      setLockoutSecs(secs)
      setRemainingAttempts(rem)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const isLocked = lockoutSecs > 0

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return
    setError('')
    setLoading(true)
    // Small artificial delay to prevent timing attacks
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
    const ok = login(email, password)
    setLoading(false)
    if (ok) {
      router.push('/dashboard')
    } else {
      const rem = getRemainingLoginAttempts()
      setRemainingAttempts(rem)
      if (rem <= 0) {
        setError('Terlalu banyak percobaan gagal. Akun dikunci selama 15 menit.')
      } else {
        setError(`Email atau password tidak valid. Sisa percobaan: ${rem}`)
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-sidebar px-12 py-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground tracking-tight">{brand.appName}</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-sidebar-foreground leading-tight text-balance">
              {brand.tagline}
            </h1>
            <p className="text-sidebar-foreground/60 leading-relaxed">
              Platform terintegrasi untuk tracking cicilan, analitik keuangan, dan reminder WhatsApp otomatis.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '📊', text: 'Dashboard keuangan real-time' },
              { icon: '💳', text: 'Tracking cicilan otomatis' },
              { icon: '📱', text: 'Reminder WhatsApp satu klik' },
              { icon: '📈', text: 'Forecast cashflow bulanan' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center text-sm">
                  {item.icon}
                </div>
                <span className="text-sidebar-foreground/80 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-foreground/40 text-sm">
          &copy; {new Date().getFullYear()} {brand.appName}. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">{brand.appName}</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Selamat Datang</h2>
            <p className="text-muted-foreground text-sm">Masuk ke akun admin Anda untuk melanjutkan.</p>
          </div>

          {isLocked ? (
            /* ── Lockout notice ── */
            <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
              <Lock className="w-10 h-10 text-destructive" />
              <div>
                <p className="font-bold text-destructive">Akun Sementara Dikunci</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Terlalu banyak percobaan gagal. Coba lagi dalam:
                </p>
                <p className="text-3xl font-bold text-destructive mt-3 tabular-nums">
                  {String(Math.floor(lockoutSecs / 60)).padStart(2, '0')}:{String(lockoutSecs % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-card border-border focus-visible:ring-primary"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-card border-border focus-visible:ring-primary pr-11"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <ShieldCheck className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {remainingAttempts <= 3 && remainingAttempts > 0 && !error && (
                <p className="text-xs text-warning-foreground text-center">
                  Peringatan: {remainingAttempts} percobaan tersisa sebelum akun dikunci.
                </p>
              )}

              <Button
                type="submit"
                className={cn(
                  'w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold',
                  loading && 'opacity-80 cursor-not-allowed'
                )}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Masuk...
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
