'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  GraduationCap,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  getStudents,
  getPaidAmount,
  getRemainingAmount,
  formatCurrency,
  getMonthlyPayments,
  getUniqueAcademicYears,
  getBrand,
  type PaymentStatus,
} from '@/lib/store'
import StatusBadge from './status-badge'
import ImportExportMenu from './import-export-menu'
import { cn } from '@/lib/utils'

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const STATUS_TABS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'cicilan', label: 'Cicilan' },
  { value: 'telat', label: 'Telat' },
  { value: 'belum_bayar', label: 'Belum Bayar' },
]

export default function LaporanContent() {
  const allStudents = useMemo(() => getStudents(), [])
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [activeStatus, setActiveStatus] = useState<PaymentStatus | 'all'>('all')
  const academicYears = useMemo(() => getUniqueAcademicYears(allStudents), [allStudents])
  const students = useMemo(
    () => yearFilter === 'all' ? allStudents : allStudents.filter((s) => s.academicYear === yearFilter),
    [allStudents, yearFilter]
  )

  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalReceivable = 0
    let totalForm = 0
    let totalFormReceivable = 0

    for (const s of students) {
      const paid = getPaidAmount(s.payment)
      const remaining = getRemainingAmount(s.payment)
      const formPaid = s.payment.formStatus === 'lunas' ? s.payment.formFee : 0
      totalRevenue += paid
      totalReceivable += remaining
      totalForm += formPaid
      if (s.payment.formStatus === 'belum_bayar') totalFormReceivable += s.payment.formFee
    }

    return { totalRevenue, totalReceivable, totalForm, totalFormReceivable }
  }, [students])

  // Monthly data last 6 months
  const monthlyData = useMemo(() => {
    const raw = getMonthlyPayments(students, yearFilter === 'all' ? undefined : yearFilter)
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = raw[key]
      return {
        month: MONTHS_ID[d.getMonth()],
        uangBelajar: entry?.tuition || 0,
        formulir: entry?.form || 0,
        total: entry?.total || 0,
      }
    })
  }, [students, yearFilter])

  // Forecast: pending installments per month
  const forecastData = useMemo(() => {
    const forecast: Record<string, number> = {}
    for (const s of students) {
      for (const inst of s.payment.installments) {
        if (inst.status === 'pending' || inst.status === 'telat') {
          const month = inst.dueDate.slice(0, 7)
          forecast[month] = (forecast[month] || 0) + inst.amount
        }
      }
    }
    const sorted = Object.entries(forecast).sort(([a], [b]) => a.localeCompare(b)).slice(0, 6)
    return sorted.map(([key, val]) => ({
      month: MONTHS_ID[parseInt(key.slice(5, 7)) - 1] + ' ' + key.slice(0, 4),
      forecast: val,
    }))
  }, [students])

  // Program breakdown
  const programData = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; receivable: number }> = {}
    for (const s of students) {
      if (!map[s.program]) map[s.program] = { count: 0, revenue: 0, receivable: 0 }
      map[s.program].count++
      map[s.program].revenue += getPaidAmount(s.payment)
      map[s.program].receivable += getRemainingAmount(s.payment)
    }
    return Object.entries(map).map(([program, data]) => ({ program, ...data }))
  }, [students])

  const filtered = useMemo(() => {
    if (activeStatus === 'all') return students
    return students.filter((s) => s.payment.tuitionStatus === activeStatus)
  }, [students, activeStatus])

  const handleExportExcel = useCallback(async () => {
    const { exportLaporanToExcel } = await import('@/lib/excel-utils')
    await exportLaporanToExcel(students, monthlyData)
  }, [students, monthlyData])

  const handleExportPDF = useCallback(async () => {
    const { exportLaporanToPDF } = await import('@/lib/excel-utils')
    const brand = getBrand()
    await exportLaporanToPDF(students, monthlyData, brand.appName)
  }, [students, monthlyData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Laporan Keuangan</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Analitik pembayaran dan forecast cashflow</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <ImportExportMenu
            mode="laporan"
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pemasukan', value: formatCurrency(stats.totalRevenue), icon: <TrendingUp className="w-4 h-4" />, color: 'success' },
          { label: 'Total Piutang', value: formatCurrency(stats.totalReceivable), icon: <TrendingDown className="w-4 h-4" />, color: 'warning' },
          { label: 'Penerimaan Formulir', value: formatCurrency(stats.totalForm), icon: <TrendingUp className="w-4 h-4" />, color: 'primary' },
          { label: 'Piutang Formulir', value: formatCurrency(stats.totalFormReceivable), icon: <TrendingDown className="w-4 h-4" />, color: 'default' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className={cn(
              'text-lg font-bold',
              s.color === 'success' && 'text-success',
              s.color === 'warning' && 'text-warning-foreground',
              s.color === 'primary' && 'text-primary',
              s.color === 'default' && 'text-foreground',
            )}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Pemasukan per Bulan</h3>
          <p className="text-xs text-muted-foreground mb-4">Uang belajar + formulir — 6 bulan terakhir</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name === 'uangBelajar' ? 'Uang Belajar' : 'Formulir']}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend formatter={(v) => v === 'uangBelajar' ? 'Uang Belajar' : 'Formulir'} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="uangBelajar" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="formulir" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Forecast Pemasukan</h3>
          <p className="text-xs text-muted-foreground mb-4">Estimasi cicilan yang akan masuk</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Estimasi']}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Program breakdown */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground text-sm mb-4">Breakdown per Program</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Program', 'Jumlah Siswa', 'Pemasukan', 'Piutang'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {programData.map((p) => (
                <tr key={p.program} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3 font-medium text-foreground">{p.program}</td>
                  <td className="px-3 py-3 text-muted-foreground">{p.count} siswa</td>
                  <td className="px-3 py-3 text-success font-semibold">{formatCurrency(p.revenue)}</td>
                  <td className="px-3 py-3 text-warning-foreground font-semibold">{formatCurrency(p.receivable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student table with filter */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <h3 className="font-semibold text-foreground text-sm">Detail per Siswa</h3>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                  activeStatus === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {tab.value !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({students.filter((s) => s.payment.tuitionStatus === tab.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Siswa', 'Program', 'Total Biaya', 'Dibayar', 'Sisa', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const paid = getPaidAmount(s.payment)
                const remaining = getRemainingAmount(s.payment)
                const overdueInst = s.payment.installments.find((i) => i.status === 'telat')
                const nextInst = s.payment.installments.find((i) => i.status === 'pending') ?? overdueInst
                const waMsg = encodeURIComponent(
                  `Halo ${s.name},\n\nKami mengingatkan cicilan ke-${nextInst?.number ?? '?'} Anda jatuh tempo.\n\nSisa pembayaran: ${formatCurrency(remaining)}\n\nSilakan lakukan pembayaran ya 🙏`
                )
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground leading-tight">{s.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.nim}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{s.program}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground">{formatCurrency(s.payment.tuitionTotal)}</td>
                    <td className="px-4 py-3.5 text-success font-semibold">{formatCurrency(paid)}</td>
                    <td className="px-4 py-3.5 text-warning-foreground font-semibold">{formatCurrency(remaining)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={s.payment.tuitionStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {(s.payment.tuitionStatus === 'telat' || s.payment.tuitionStatus === 'cicilan') && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/^0/, '62')}?text=${waMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-success/10 hover:bg-success/20 flex items-center justify-center text-success transition-colors"
                            title="Kirim Reminder WA"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          href={`/dashboard/siswa/${s.id}`}
                          className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                          title="Detail Siswa"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {students.length} siswa
          </p>
        </div>
      </div>
    </div>
  )
}
