'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  MessageCircle,
  GraduationCap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  getStudents,
  getPaidAmount,
  getRemainingAmount,
  formatCurrency,
  getMonthlyPayments,
  getUniqueAcademicYears,
} from '@/lib/store'
import { cn } from '@/lib/utils'
import StatusBadge from './status-badge'

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function DashboardContent() {
  const allStudents = useMemo(() => getStudents(), [])
  const [yearFilter, setYearFilter] = useState<string>('all')
  const academicYears = useMemo(() => getUniqueAcademicYears(allStudents), [allStudents])
  const students = useMemo(
    () => yearFilter === 'all' ? allStudents : allStudents.filter((s) => s.academicYear === yearFilter),
    [allStudents, yearFilter]
  )

  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalReceivable = 0
    let totalFormRevenue = 0
    let totalTuitionRevenue = 0
    let paid = 0
    let cicilan = 0
    let telat = 0
    let belumBayar = 0

    for (const s of students) {
      const paidAmt = getPaidAmount(s.payment)
      const remaining = getRemainingAmount(s.payment)
      const formPaid = s.payment.formStatus === 'lunas' ? s.payment.formFee : 0
      totalFormRevenue += formPaid
      totalTuitionRevenue += paidAmt
      totalRevenue += paidAmt + formPaid
      totalReceivable += remaining

      if (s.payment.tuitionStatus === 'lunas') paid++
      else if (s.payment.tuitionStatus === 'cicilan') cicilan++
      else if (s.payment.tuitionStatus === 'telat') telat++
      else belumBayar++
    }

    return { totalRevenue, totalReceivable, totalFormRevenue, totalTuitionRevenue, paid, cicilan, telat, belumBayar }
  }, [students])

  const monthlyData = useMemo(() => {
    const raw = getMonthlyPayments(students, yearFilter === 'all' ? undefined : yearFilter)
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = raw[key]
      return {
        month: MONTHS_ID[d.getMonth()],
        pemasukan: entry?.tuition || 0,
        formulir: entry?.form || 0,
        total: entry?.total || 0,
      }
    })
  }, [students, yearFilter])

  const pieData = [
    { name: 'Lunas', value: stats.paid, color: '#22c55e' },
    { name: 'Cicilan', value: stats.cicilan, color: '#3b82f6' },
    { name: 'Telat', value: stats.telat, color: '#ef4444' },
    { name: 'Belum Bayar', value: stats.belumBayar, color: '#f59e0b' },
  ].filter((d) => d.value > 0)

  const recentStudents = students.slice(-5).reverse()

  const forecastNext = useMemo(() => {
    let forecast = 0
    for (const s of students) {
      for (const inst of s.payment.installments) {
        if (inst.status === 'pending' || inst.status === 'telat') {
          forecast += inst.amount
        }
      }
    }
    return forecast
  }, [students])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Ringkasan keuangan & status pembayaran siswa</p>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-card border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">Semua Tahun Ajaran</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>TA {y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="primary"
          sub={`Formulir: ${formatCurrency(stats.totalFormRevenue)}`}
        />
        <StatCard
          title="Total Piutang"
          value={formatCurrency(stats.totalReceivable)}
          icon={<CreditCard className="w-5 h-5" />}
          color="warning"
          sub="Belum terbayar"
        />
        <StatCard
          title="Siswa Aktif"
          value={students.length.toString()}
          icon={<Users className="w-5 h-5" />}
          color="accent"
          sub={`${stats.paid} sudah lunas`}
        />
        <StatCard
          title="Forecast Bulan Ini"
          value={formatCurrency(forecastNext)}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="info"
          sub="Estimasi cicilan masuk"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Grafik Pemasukan</h3>
              <p className="text-muted-foreground text-xs mt-0.5">6 bulan terakhir</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTuition" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip
                formatter={(v, name) => [formatCurrency(Number(v)), name === 'pemasukan' ? 'Uang Belajar' : 'Formulir']}

                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend formatter={(v) => v === 'pemasukan' ? 'Uang Belajar' : 'Formulir'} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="pemasukan" stroke="#3b82f6" strokeWidth={2} fill="url(#colorTuition)" stackId="1" />
              <Area type="monotone" dataKey="formulir" stroke="#22c55e" strokeWidth={2} fill="url(#colorForm)" stackId="1" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Status Pembayaran</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Distribusi siswa</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
formatter={(v, name) => [Number(v) + ' siswa', name]}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
                <span className="text-xs font-semibold text-foreground ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat icon={<CheckCircle className="w-4 h-4 text-success" />} label="Lunas" value={stats.paid} bg="bg-success/10" />
        <MiniStat icon={<Clock className="w-4 h-4 text-primary" />} label="Masih Cicilan" value={stats.cicilan} bg="bg-primary/10" />
        <MiniStat icon={<AlertTriangle className="w-4 h-4 text-destructive" />} label="Telat Bayar" value={stats.telat} bg="bg-destructive/10" />
      </div>

      {/* Recent students */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Siswa Terbaru</h3>
          <Link href="/dashboard/siswa" className="text-primary text-xs font-medium hover:underline flex items-center gap-1">
            Lihat semua <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentStudents.map((s) => {
            const paid = getPaidAmount(s.payment)
            const total = s.payment.tuitionTotal
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.nim} &bull; {s.program}</p>
                </div>
                <div className="hidden sm:block text-right min-w-[100px]">
                  <p className="text-xs font-medium text-foreground">{pct}% terbayar</p>
                  <div className="w-24 h-1.5 bg-muted rounded-full mt-1 ml-auto">
                    <div className="h-1.5 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <StatusBadge status={s.payment.tuitionStatus} />
                <Link
                  href={`/dashboard/siswa/${s.id}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline ml-2 shrink-0"
                >
                  Detail <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Telat reminder section */}
      {students.filter((s) => s.payment.tuitionStatus === 'telat').length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-foreground text-sm">Siswa Telat Bayar</h3>
            <span className="ml-auto bg-destructive/10 text-destructive text-xs font-semibold px-2 py-0.5 rounded-full">
              {students.filter((s) => s.payment.tuitionStatus === 'telat').length} siswa
            </span>
          </div>
          <div className="divide-y divide-border">
            {students.filter((s) => s.payment.tuitionStatus === 'telat').map((s) => {
              const remaining = getRemainingAmount(s.payment)
              const overdueInst = s.payment.installments.find((i) => i.status === 'telat')
              const waMsg = encodeURIComponent(
                `Halo ${s.name},\n\nKami mengingatkan bahwa cicilan ke-${overdueInst?.number ?? '?'} Anda sudah jatuh tempo.\n\nSisa pembayaran: ${formatCurrency(remaining)}\n\nSilakan lakukan pembayaran ya 🙏`
              )
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-sm shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.phone}</p>
                  </div>
                  <p className="hidden sm:block text-sm font-semibold text-destructive">{formatCurrency(remaining)}</p>
                  <a
                    href={`https://wa.me/${s.phone.replace(/^0/, '62')}?text=${waMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Kirim WA
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  sub,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'primary' | 'warning' | 'accent' | 'info'
  sub: string
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning-foreground',
    accent: 'bg-accent/10 text-accent',
    info: 'bg-info/10 text-info',
  }
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colorMap[color])}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground border-t border-border pt-3">{sub}</p>
    </div>
  )
}

function MiniStat({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl p-4 border border-border bg-card')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
