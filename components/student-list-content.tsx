'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Filter,
  ArrowUpRight,
  MessageCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  getStudents,
  deleteStudent,
  addStudent,
  getPaidAmount,
  getRemainingAmount,
  formatCurrency,
  getUniqueAcademicYears,
  getPrograms,
  getBrand,
  type PaymentStatus,
} from '@/lib/store'
import StatusBadge from './status-badge'
import AddStudentModal from './add-student-modal'
import ImportExportMenu from './import-export-menu'
import { cn } from '@/lib/utils'
import type { ImportedStudentRow } from '@/lib/excel-utils'

const STATUS_OPTIONS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'cicilan', label: 'Cicilan' },
  { value: 'telat', label: 'Telat' },
  { value: 'belum_bayar', label: 'Belum Bayar' },
]

const PAGE_SIZE = 50

type SortKey = 'name' | 'nim' | 'program' | 'status' | 'academicYear'

export default function StudentListContent() {
  const [students, setStudents] = useState(() => getStudents())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const refresh = useCallback(() => setStudents(getStudents()), [])
  const academicYears = useMemo(() => getUniqueAcademicYears(students), [students])
  const programs = useMemo(() => getPrograms(), [])

  // filtered must be declared before the export handlers that depend on it
  const filtered = useMemo(() => {
    // Reset to page 1 whenever filters/sort change
    setPage(1)
    let list = students
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nim.toLowerCase().includes(q) ||
          s.phone.includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.payment.tuitionStatus === statusFilter)
    }
    if (yearFilter !== 'all') {
      list = list.filter((s) => s.academicYear === yearFilter)
    }
    if (programFilter !== 'all') {
      list = list.filter((s) => s.program === programFilter)
    }
    list = [...list].sort((a, b) => {
      let va = '', vb = ''
      if (sortKey === 'name') { va = a.name; vb = b.name }
      else if (sortKey === 'nim') { va = a.nim; vb = b.nim }
      else if (sortKey === 'program') { va = a.program; vb = b.program }
      else if (sortKey === 'status') { va = a.payment.tuitionStatus; vb = b.payment.tuitionStatus }
      else if (sortKey === 'academicYear') { va = a.academicYear || ''; vb = b.academicYear || '' }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [students, search, statusFilter, yearFilter, programFilter, sortKey, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const handleExportExcel = useCallback(async () => {
    const { exportStudentsToExcel } = await import('@/lib/excel-utils')
    await exportStudentsToExcel(filtered)
  }, [filtered])

  const handleExportPDF = useCallback(async () => {
    const { exportStudentsToPDF } = await import('@/lib/excel-utils')
    const brand = getBrand()
    await exportStudentsToPDF(filtered, brand.appName)
  }, [filtered])

  const handleImport = useCallback((rows: ImportedStudentRow[]) => {
    for (const r of rows) {
      const installments = r.tuitionMethod === 'cicilan'
        ? Array.from({ length: r.installmentCount }, (_, i) => {
            const due = new Date()
            due.setMonth(due.getMonth() + i + 1)
            const perInst = Math.round(r.tuitionTotal / r.installmentCount)
            return {
              id: crypto.randomUUID(),
              number: i + 1,
              amount: i === r.installmentCount - 1 ? r.tuitionTotal - perInst * (r.installmentCount - 1) : perInst,
              dueDate: due.toISOString().split('T')[0],
              status: 'pending' as const,
            }
          })
        : []
      addStudent({
        nim: r.nim,
        name: r.name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        program: r.program,
        academicYear: r.academicYear,
        documents: [],
        payment: {
          id: crypto.randomUUID(),
          formFee: r.formFee,
          formStatus: r.formStatus,
          formPaidDate: r.formStatus === 'lunas' ? new Date().toISOString().split('T')[0] : undefined,
          dpAmount: r.dpAmount,
          dpStatus: r.dpStatus,
          dpPaidDate: r.dpStatus === 'lunas' ? new Date().toISOString().split('T')[0] : undefined,
          tuitionTotal: r.tuitionTotal,
          tuitionMethod: r.tuitionMethod,
          tuitionStatus: r.tuitionStatus,
          tuitionPaidDate: r.tuitionStatus === 'lunas' && r.tuitionMethod === 'cash'
            ? new Date().toISOString().split('T')[0]
            : undefined,
          installments,
        },
      })
    }
    refresh()
  }, [refresh])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const handleDelete = (id: string) => {
    deleteStudent(id)
    refresh()
    setDeleteId(null)
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Data Siswa</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} siswa terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportMenu
            mode="students"
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onImport={handleImport}
          />
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, NIM, atau nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="bg-card border border-border rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-card border border-border rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">Semua TA</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>TA {y}</option>
            ))}
          </select>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="bg-card border border-border rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">Semua Program</option>
            {programs.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {[
                  { key: 'name', label: 'Siswa' },
                  { key: 'nim', label: 'NIM' },
                  { key: 'program', label: 'Program' },
                  { key: 'academicYear', label: 'Tahun Ajaran' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort(key as SortKey)}
                  >
                    <span className="flex items-center gap-1">
                      {label} <SortIcon k={key as SortKey} />
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pembayaran</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort('status')}
                >
                  <span className="flex items-center gap-1">Status <SortIcon k="status" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    Tidak ada data siswa yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => {
                  const paid = getPaidAmount(s.payment)
                  const total = s.payment.tuitionTotal
                  const remaining = getRemainingAmount(s.payment)
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0
                  const overdueInst = s.payment.installments.find((i) => i.status === 'telat')
                  const nextInst = s.payment.installments.find((i) => i.status === 'pending') ?? overdueInst
                  const waMsg = encodeURIComponent(
                    `Halo ${s.name},\n\nKami mengingatkan bahwa cicilan ke-${nextInst?.number ?? '?'} Anda jatuh tempo.\n\nSisa pembayaran: ${formatCurrency(remaining)}\n\nSilakan lakukan pembayaran ya 🙏`
                  )
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">{s.nim}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{s.program}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">{s.academicYear ? `TA ${s.academicYear}` : '-'}</td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4 min-w-[140px]">
                            <span className="text-xs text-muted-foreground">Terbayar</span>
                            <span className="text-xs font-medium text-foreground">{pct}%</span>
                          </div>
                          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-1.5 rounded-full', pct >= 100 ? 'bg-success' : pct > 50 ? 'bg-primary' : 'bg-warning')}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{formatCurrency(remaining)} sisa</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={s.payment.tuitionStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {(s.payment.tuitionStatus === 'telat' || s.payment.tuitionStatus === 'cicilan') && (
                            <a
                              href={`https://wa.me/${s.phone.replace(/^0/, '62')}?text=${waMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Kirim Reminder WA"
                              className="w-7 h-7 rounded-lg bg-success/10 hover:bg-success/20 flex items-center justify-center text-success transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            href={`/dashboard/siswa/${s.id}`}
                            title="Lihat Detail"
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            title="Hapus Siswa"
                            className="w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? 'Tidak ada data'
              : `Menampilkan ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} dari ${filtered.length} siswa`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                title="Halaman pertama"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {/* Page number buttons — show at most 5 around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                  acc.push(p)
                  return acc
                }, [])
                .map((item, i) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-muted-foreground text-xs">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={cn(
                        'w-7 h-7 rounded-lg border text-xs font-medium transition-colors',
                        page === item
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                title="Halaman terakhir"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { refresh(); setShowAdd(false) }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-foreground">Hapus Siswa?</h3>
            <p className="text-sm text-muted-foreground">
              Data siswa dan riwayat pembayaran akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
