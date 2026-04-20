'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, BookOpen, MessageCircle,
  CheckCircle, Clock, AlertTriangle, Calendar, FileText,
  Image as ImageIcon, Download, GraduationCap, Pencil,
  Save, X, Plus, Trash2, Upload,
} from 'lucide-react'
import {
  getStudentById, updateStudent, getPaidAmount, getRemainingAmount,
  formatCurrency, DOCUMENT_TYPE_LABELS,
  type Student, type Installment, type InstallmentStatus,
  type Document as StudentDoc,
} from '@/lib/store'
import StatusBadge from './status-badge'
import EditStudentModal from './edit-student-modal'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'profil' | 'pembayaran' | 'cicilan' | 'dokumen'
type PaymentField = 'form' | 'dp' | 'tuition'

// ── Main component ────────────────────────────────────────────────────────────

export default function StudentDetailContent({ id }: { id: string }) {
  const [student, setStudent]       = useState<Student | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>('profil')
  const [showEdit, setShowEdit]     = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null)

  // Document upload
  const docFileRef                      = useRef<HTMLInputElement>(null)
  const [docType, setDocType]           = useState<StudentDoc['type']>('ktp')
  const [docUploading, setDocUploading] = useState(false)
  const [docDragOver, setDocDragOver]   = useState(false)

  // Inline installment edit
  const [editingInstId, setEditingInstId]     = useState<string | null>(null)
  const [editInstAmount, setEditInstAmount]   = useState('')
  const [editInstDueDate, setEditInstDueDate] = useState('')
  const [editInstStatus, setEditInstStatus]   = useState<InstallmentStatus>('pending')
  const [editInstPaidDate, setEditInstPaidDate] = useState('')

  // Inline payment edit
  const [editingPayment, setEditingPayment]       = useState<PaymentField | null>(null)
  const [editFormFee, setEditFormFee]             = useState('')
  const [editFormStatus, setEditFormStatus]       = useState<'belum_bayar' | 'lunas'>('belum_bayar')
  const [editFormDate, setEditFormDate]           = useState('')
  const [editDpAmount, setEditDpAmount]           = useState('')
  const [editDpStatus, setEditDpStatus]           = useState<'belum_bayar' | 'lunas'>('belum_bayar')
  const [editDpDate, setEditDpDate]               = useState('')
  const [editTuitionTotal, setEditTuitionTotal]   = useState('')
  const [editTuitionMethod, setEditTuitionMethod] = useState<'cash' | 'cicilan'>('cash')
  const [editTuitionStatus, setEditTuitionStatus] = useState<'lunas' | 'belum_bayar' | 'cicilan' | 'telat'>('belum_bayar')
  const [editTuitionDate, setEditTuitionDate]     = useState('')

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const s = getStudentById(id)
    setStudent(s ?? null)
    setLoading(false)
  }, [id])

  const refresh = useCallback(() => {
    const s = getStudentById(id)
    setStudent(s ?? null)
  }, [id])

  // ── Document handlers ────────────────────────────────────────────────────────

  const handleDocumentUpload = useCallback((file: File, currentStudent: Student | null, currentDocType: StudentDoc['type']) => {
    if (!currentStudent) return
    const valid = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!valid.includes(file.type)) {
      alert('Format tidak valid. Gunakan JPG, PNG, atau PDF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.')
      return
    }
    setDocUploading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      const newDoc: StudentDoc = {
        id: crypto.randomUUID(),
        type: currentDocType,
        name: file.name,
        url,
        uploadedAt: new Date().toLocaleDateString('id-ID'),
      }
      const docs = [...(currentStudent.documents ?? []), newDoc]
      const saved = updateStudent(id, { documents: docs })
      if (saved) setStudent(saved)
      setDocUploading(false)
    }
    reader.onerror = () => setDocUploading(false)
    reader.readAsDataURL(file)
  }, [id])

  const handleDeleteDocument = useCallback((docId: string) => {
    setStudent((prev) => {
      if (!prev) return prev
      const docs = (prev.documents ?? []).filter((d) => d.id !== docId)
      const saved = updateStudent(id, { documents: docs })
      return saved ?? prev
    })
  }, [id])

  // ── Payment handlers ─────────────────────────────────────────────────────────

  const markFormPaid = useCallback(() => {
    setStudent((prev) => {
      if (!prev) return prev
      const saved = updateStudent(id, { payment: { ...prev.payment, formStatus: 'lunas', formPaidDate: new Date().toISOString().split('T')[0] } })
      return saved ?? prev
    })
  }, [id])

  const markDpPaid = useCallback(() => {
    setStudent((prev) => {
      if (!prev) return prev
      const saved = updateStudent(id, { payment: { ...prev.payment, dpStatus: 'lunas', dpPaidDate: new Date().toISOString().split('T')[0] } })
      return saved ?? prev
    })
  }, [id])

  const markInstallmentPaid = useCallback((instId: string) => {
    setStudent((prev) => {
      if (!prev) return prev
      const insts = prev.payment.installments.map((i) =>
        i.id === instId ? { ...i, status: 'lunas' as InstallmentStatus, paidDate: new Date().toISOString().split('T')[0] } : i
      )
      const allPaid = insts.every((i) => i.status === 'lunas')
      const hasTelat = insts.some((i) => i.status === 'telat')
      const tuitionStatus = allPaid ? 'lunas' : hasTelat ? 'telat' : 'cicilan'
      const saved = updateStudent(id, { payment: { ...prev.payment, installments: insts, tuitionStatus: tuitionStatus as Student['payment']['tuitionStatus'] } })
      return saved ?? prev
    })
  }, [id])

  const startEditPayment = (field: PaymentField) => {
    if (!student) return
    const p = student.payment
    if (field === 'form') {
      setEditFormFee(String(p.formFee))
      setEditFormStatus(p.formStatus)
      setEditFormDate(p.formPaidDate ?? '')
    } else if (field === 'dp') {
      setEditDpAmount(String(p.dpAmount))
      setEditDpStatus(p.dpStatus)
      setEditDpDate(p.dpPaidDate ?? '')
    } else {
      setEditTuitionTotal(String(p.tuitionTotal))
      setEditTuitionMethod(p.tuitionMethod)
      setEditTuitionStatus(p.tuitionStatus)
      setEditTuitionDate(p.tuitionPaidDate ?? '')
    }
    setEditingPayment(field)
  }

  const savePaymentEdit = () => {
    if (!student || !editingPayment) return
    const p = student.payment
    let newPayment = { ...p }
    if (editingPayment === 'form') {
      newPayment = { ...newPayment, formFee: parseInt(editFormFee) || p.formFee, formStatus: editFormStatus, formPaidDate: editFormStatus === 'lunas' ? (editFormDate || new Date().toISOString().split('T')[0]) : undefined }
    } else if (editingPayment === 'dp') {
      newPayment = { ...newPayment, dpAmount: parseInt(editDpAmount) || p.dpAmount, dpStatus: editDpStatus, dpPaidDate: editDpStatus === 'lunas' ? (editDpDate || new Date().toISOString().split('T')[0]) : undefined }
    } else {
      newPayment = { ...newPayment, tuitionTotal: parseInt(editTuitionTotal) || p.tuitionTotal, tuitionMethod: editTuitionMethod, tuitionStatus: editTuitionStatus, tuitionPaidDate: editTuitionMethod === 'cash' && editTuitionStatus === 'lunas' ? (editTuitionDate || new Date().toISOString().split('T')[0]) : undefined }
    }
    const saved = updateStudent(id, { payment: newPayment })
    if (saved) setStudent(saved)
    setEditingPayment(null)
  }

  // ── Installment handlers ─────────────────────────────────────────────────────

  const startEditInstallment = (inst: Installment) => {
    setEditingInstId(inst.id)
    setEditInstAmount(String(inst.amount))
    setEditInstDueDate(inst.dueDate)
    setEditInstStatus(inst.status)
    setEditInstPaidDate(inst.paidDate ?? '')
  }

  const saveInstallmentEdit = (instId: string) => {
    if (!student) return
    const updated = student.payment.installments.map((inst) =>
      inst.id === instId
        ? {
            ...inst,
            amount: parseInt(editInstAmount) || inst.amount,
            dueDate: editInstDueDate,
            status: editInstStatus,
            paidDate: editInstStatus === 'lunas'
              ? (editInstPaidDate || new Date().toISOString().split('T')[0])
              : undefined,
          }
        : inst
    )
    const anyTelat = updated.some((i) => i.status === 'telat')
    const allLunas = updated.every((i) => i.status === 'lunas')
    const tuitionStatus = allLunas ? 'lunas' : anyTelat ? 'telat' : 'cicilan'
    const saved = updateStudent(id, { payment: { ...student.payment, installments: updated, tuitionStatus: tuitionStatus as Student['payment']['tuitionStatus'] } })
    if (saved) setStudent(saved)
    setEditingInstId(null)
  }

  const addInstallment = () => {
    if (!student) return
    const p = student.payment
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const newInst: Installment = {
      id: crypto.randomUUID(),
      number: p.installments.length + 1,
      amount: 0,
      dueDate: nextMonth.toISOString().split('T')[0],
      status: 'pending',
    }
    const saved = updateStudent(id, { payment: { ...p, installments: [...p.installments, newInst] } })
    if (saved) {
      setStudent(saved)
      setEditingInstId(newInst.id)
      setEditInstAmount('0')
      setEditInstDueDate(newInst.dueDate)
      setEditInstStatus('pending')
    }
  }

  // ── Render guards ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Siswa tidak ditemukan.</p>
        <Link href="/dashboard/siswa" className="text-primary text-sm hover:underline">Kembali ke Data Siswa</Link>
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const paidAmount      = getPaidAmount(student.payment)
  const remaining       = getRemainingAmount(student.payment)
  const total           = student.payment.tuitionTotal
  const dpPaid          = student.payment.dpStatus === 'lunas' ? student.payment.dpAmount : 0
  const pct             = total > 0 ? Math.min(Math.round((paidAmount / total) * 100), 100) : 0
  const paidInsts       = student.payment.installments.filter((i) => i.status === 'lunas').length
  const totalInsts      = student.payment.installments.length
  const overdueInst     = student.payment.installments.find((i) => i.status === 'telat')
  const nextPendingInst = student.payment.installments.find((i) => i.status === 'pending')
  const waTargetInst    = overdueInst ?? nextPendingInst
  const waMsg = encodeURIComponent(
    `Halo ${student.name},\n\nKami mengingatkan bahwa cicilan ke-${waTargetInst?.number ?? '?'} Anda${waTargetInst?.dueDate ? ` jatuh tempo pada ${new Date(waTargetInst.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ' segera jatuh tempo'}.\n\nSisa pembayaran: ${formatCurrency(remaining)}\n\nSilakan lakukan pembayaran ya.`
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profil',    label: 'Profil' },
    { key: 'pembayaran', label: 'Pembayaran' },
    { key: 'cicilan',   label: `Cicilan (${totalInsts})` },
    { key: 'dokumen',   label: `Dokumen (${student.documents?.length ?? 0})` },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Back link */}
      <Link href="/dashboard/siswa" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Data Siswa
      </Link>

      {/* Profile card */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0 select-none">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
                <p className="text-muted-foreground text-sm mt-0.5 font-mono">{student.nim}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={student.payment.tuitionStatus} size="md" />
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                {(student.payment.tuitionStatus === 'cicilan' || student.payment.tuitionStatus === 'telat') && student.payment.tuitionMethod === 'cicilan' && (
                  <a
                    href={`https://wa.me/${student.phone.replace(/^0/, '62')}?text=${waMsg}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Kirim Reminder WA
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-muted-foreground">
              {student.phone    && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{student.phone}</span>}
              {student.email    && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{student.email}</span>}
              {student.program  && <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{student.program}</span>}
              {student.academicYear && <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />TA {student.academicYear}</span>}
              {student.address  && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{student.address}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Biaya" value={formatCurrency(total)} color="default" />
        <SummaryCard label="Sudah Dibayar" value={formatCurrency(paidAmount)} color="success" sub={dpPaid > 0 ? `DP: ${formatCurrency(dpPaid)}` : undefined} />
        <SummaryCard label="Sisa Tagihan" value={formatCurrency(remaining)} color={remaining > 0 ? 'warning' : 'success'} />
        {student.payment.tuitionMethod === 'cicilan'
          ? <SummaryCard label="Progress Cicilan" value={`${paidInsts} / ${totalInsts}`} color="primary" sub={`${pct}% terbayar`} />
          : <SummaryCard label="Metode" value="Cash" color="primary" sub={student.payment.tuitionStatus === 'lunas' ? 'Lunas' : 'Belum Lunas'} />}
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Progress Pembayaran</span>
          <span className="text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-3 rounded-full transition-all duration-500', pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning')} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatCurrency(paidAmount)} terbayar</span>
          <span>{formatCurrency(remaining)} tersisa</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'shrink-0 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.key ? 'text-primary border-b-2 border-primary -mb-px bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── Profil ── */}
          {activeTab === 'profil' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: 'Nama Lengkap',    value: student.name },
                { label: 'NIM / ID Siswa',  value: student.nim },
                { label: 'Email',           value: student.email || '-' },
                { label: 'Nomor HP',        value: student.phone || '-' },
                { label: 'Program / Kelas', value: student.program || '-' },
                { label: 'Tahun Pelajaran', value: student.academicYear ? `TA ${student.academicYear}` : '-' },
                { label: 'Tanggal Daftar',  value: new Date(student.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Alamat',          value: student.address || '-', full: true },
              ].map((f) => (
                <div key={f.label} className={f.full ? 'sm:col-span-2' : ''}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{f.label}</p>
                  <p className="text-sm text-foreground">{f.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Pembayaran ── */}
          {activeTab === 'pembayaran' && (
            <div className="space-y-3">
              {/* Formulir */}
              {editingPayment === 'form' ? (
                <EditPaymentSection
                  title="Biaya Formulir"
                  fields={[
                    { label: 'Nominal (Rp)', type: 'number', value: editFormFee, onChange: setEditFormFee },
                    { label: 'Status', type: 'select', value: editFormStatus, onChange: (v) => setEditFormStatus(v as 'belum_bayar' | 'lunas'), options: [{ value: 'belum_bayar', label: 'Belum Bayar' }, { value: 'lunas', label: 'Lunas' }] },
                    { label: 'Tanggal Bayar', type: 'date', value: editFormDate, onChange: setEditFormDate, hidden: editFormStatus !== 'lunas' },
                  ]}
                  onSave={savePaymentEdit}
                  onCancel={() => setEditingPayment(null)}
                />
              ) : (
                <PaymentRow
                  title="Biaya Formulir"
                  subtitle={student.payment.formPaidDate ? `Dibayar: ${new Date(student.payment.formPaidDate).toLocaleDateString('id-ID')}` : 'Belum dibayar'}
                  amount={student.payment.formFee}
                  status={student.payment.formStatus === 'lunas' ? 'lunas' : 'belum_bayar'}
                  onMarkPaid={student.payment.formStatus === 'belum_bayar' ? markFormPaid : undefined}
                  onEdit={() => startEditPayment('form')}
                />
              )}

              {/* DP */}
              {editingPayment === 'dp' ? (
                <EditPaymentSection
                  title="Uang Muka (DP)"
                  fields={[
                    { label: 'Nominal (Rp)', type: 'number', value: editDpAmount, onChange: setEditDpAmount },
                    { label: 'Status', type: 'select', value: editDpStatus, onChange: (v) => setEditDpStatus(v as 'belum_bayar' | 'lunas'), options: [{ value: 'belum_bayar', label: 'Belum Bayar' }, { value: 'lunas', label: 'Lunas' }] },
                    { label: 'Tanggal Bayar', type: 'date', value: editDpDate, onChange: setEditDpDate, hidden: editDpStatus !== 'lunas' },
                  ]}
                  onSave={savePaymentEdit}
                  onCancel={() => setEditingPayment(null)}
                />
              ) : (
                <PaymentRow
                  title="Uang Muka (DP)"
                  subtitle={student.payment.dpPaidDate ? `Dibayar: ${new Date(student.payment.dpPaidDate).toLocaleDateString('id-ID')}` : student.payment.dpAmount === 0 ? 'Tidak ada DP' : 'Belum dibayar'}
                  amount={student.payment.dpAmount}
                  status={student.payment.dpStatus === 'lunas' ? 'lunas' : 'belum_bayar'}
                  onMarkPaid={student.payment.dpStatus === 'belum_bayar' && student.payment.dpAmount > 0 ? markDpPaid : undefined}
                  onEdit={() => startEditPayment('dp')}
                  highlight
                />
              )}

              {/* Uang Belajar */}
              {editingPayment === 'tuition' ? (
                <EditPaymentSection
                  title="Uang Belajar"
                  fields={[
                    { label: 'Total Biaya (Rp)', type: 'number', value: editTuitionTotal, onChange: setEditTuitionTotal },
                    { label: 'Metode', type: 'select', value: editTuitionMethod, onChange: (v) => setEditTuitionMethod(v as 'cash' | 'cicilan'), options: [{ value: 'cash', label: 'Cash (Lunas)' }, { value: 'cicilan', label: 'Cicilan' }] },
                    { label: 'Status', type: 'select', value: editTuitionStatus, onChange: (v) => setEditTuitionStatus(v as 'lunas' | 'belum_bayar' | 'cicilan' | 'telat'), options: [{ value: 'belum_bayar', label: 'Belum Bayar' }, { value: 'lunas', label: 'Lunas' }, { value: 'cicilan', label: 'Cicilan' }, { value: 'telat', label: 'Telat' }] },
                    { label: 'Tanggal Bayar', type: 'date', value: editTuitionDate, onChange: setEditTuitionDate, hidden: editTuitionMethod !== 'cash' || editTuitionStatus !== 'lunas' },
                  ]}
                  onSave={savePaymentEdit}
                  onCancel={() => setEditingPayment(null)}
                />
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Uang Belajar</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Metode: {student.payment.tuitionMethod === 'cash' ? 'Cash (Lunas)' : `Cicilan (${totalInsts}x)`}
                      {student.payment.tuitionPaidDate && ` · Dibayar: ${new Date(student.payment.tuitionPaidDate).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{formatCurrency(total)}</span>
                    <StatusBadge status={student.payment.tuitionStatus} />
                    <button onClick={() => startEditPayment('tuition')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(total)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground">Dibayar</p>
                  <p className="text-sm font-bold text-success mt-1">{formatCurrency(paidAmount)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-muted-foreground">Sisa</p>
                  <p className="text-sm font-bold text-warning-foreground mt-1">{formatCurrency(remaining)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Cicilan ── */}
          {activeTab === 'cicilan' && (
            <div className="space-y-3">
              {student.payment.tuitionMethod === 'cash' ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">Siswa ini menggunakan metode pembayaran cash (lunas).</p>
                  <button onClick={() => startEditPayment('tuition')} className="mt-3 text-sm text-primary hover:underline" onClick={() => { setActiveTab('pembayaran'); startEditPayment('tuition') }}>
                    Ubah ke cicilan di tab Pembayaran
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{totalInsts} cicilan terdaftar</p>
                    <button
                      onClick={addInstallment}
                      className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      <Plus className="w-4 h-4" /> Tambah Cicilan
                    </button>
                  </div>

                  {/* DP row */}
                  {student.payment.dpAmount > 0 && (
                    <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border', student.payment.dpStatus === 'lunas' ? 'bg-success/10 border-success/20' : 'bg-card border-border')}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                          {student.payment.dpStatus === 'lunas' ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Uang Muka (DP)</p>
                          {student.payment.dpPaidDate && <p className="text-xs text-muted-foreground">Dibayar: {new Date(student.payment.dpPaidDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatCurrency(student.payment.dpAmount)}</span>
                        <StatusBadge status={student.payment.dpStatus === 'lunas' ? 'lunas' : 'belum_bayar'} type="installment" />
                      </div>
                    </div>
                  )}

                  {/* Installment rows */}
                  {student.payment.installments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Belum ada data cicilan. Klik &quot;Tambah Cicilan&quot; untuk menambahkan.</p>
                  ) : (
                    student.payment.installments.map((inst) => (
                      <InstallmentRow
                        key={inst.id}
                        inst={inst}
                        onMarkPaid={() => markInstallmentPaid(inst.id)}
                        isEditing={editingInstId === inst.id}
                        editAmount={editInstAmount}
                        editDueDate={editInstDueDate}
                        editStatus={editInstStatus}
                        editPaidDate={editInstPaidDate}
                        onStartEdit={() => startEditInstallment(inst)}
                        onCancelEdit={() => setEditingInstId(null)}
                        onSaveEdit={() => saveInstallmentEdit(inst.id)}
                        onEditAmount={setEditInstAmount}
                        onEditDueDate={setEditInstDueDate}
                        onEditStatus={setEditInstStatus}
                        onEditPaidDate={setEditInstPaidDate}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Dokumen ── */}
          {activeTab === 'dokumen' && (
            <div className="space-y-4">
              {/* Upload panel */}
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Upload Dokumen Baru</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-muted-foreground shrink-0">Jenis:</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as StudentDoc['type'])}
                    className="bg-card border border-border rounded-lg text-sm text-foreground px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDocDragOver(true) }}
                  onDragLeave={() => setDocDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDocDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleDocumentUpload(f, student, docType) }}
                  onClick={() => { if (!docUploading) docFileRef.current?.click() }}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none',
                    docDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  {docUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-muted-foreground">Mengunggah...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Drag & drop atau <span className="text-primary">klik untuk memilih</span></p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, atau PDF — Maks. 5MB</p>
                    </>
                  )}
                  <input
                    ref={docFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleDocumentUpload(f, student, docType)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              {/* Document list */}
              {!student.documents || student.documents.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada dokumen yang diunggah</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {student.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {doc.url.startsWith('data:image') ? <ImageIcon className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                      </div>
                      {doc.url.startsWith('data:image') && (
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-12 h-12 rounded-lg object-cover border border-border cursor-pointer shrink-0"
                          onClick={() => setPreviewDoc({ url: doc.url, name: doc.name })}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{DOCUMENT_TYPE_LABELS[doc.type]}</p>
                        <p className="text-xs text-muted-foreground">{doc.uploadedAt}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={doc.url} download={doc.name} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => { if (confirm('Hapus dokumen ini?')) handleDeleteDocument(doc.id) }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Image preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewDoc(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm">Tutup</button>
            <img src={previewDoc.url} alt={previewDoc.name} className="w-full rounded-xl object-contain max-h-[80vh]" />
            <p className="text-white/70 text-sm text-center mt-2">{previewDoc.name}</p>
          </div>
        </div>
      )}

      {/* Edit student modal */}
      {showEdit && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setStudent(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: 'default' | 'success' | 'warning' | 'primary'; sub?: string }) {
  const colorMap = {
    default: 'bg-muted/30 border-border',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    primary: 'bg-primary/10 border-primary/20',
  }
  const textMap = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning-foreground',
    primary: 'text-primary',
  }
  return (
    <div className={cn('rounded-xl border p-4 text-center', colorMap[color])}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-bold mt-1', textMap[color])}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function PaymentRow({ title, subtitle, amount, status, onMarkPaid, onEdit, highlight }: {
  title: string; subtitle: string; amount: number; status: 'lunas' | 'belum_bayar'
  onMarkPaid?: () => void; onEdit?: () => void; highlight?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between p-4 rounded-lg border', highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border')}>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
        {status === 'lunas' ? (
          <StatusBadge status="lunas" />
        ) : onMarkPaid ? (
          <button onClick={onMarkPaid} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Tandai Lunas
          </button>
        ) : (
          <StatusBadge status="belum_bayar" />
        )}
        {onEdit && (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
    </div>
  )
}

interface EditFieldDef {
  label: string; type: 'number' | 'date' | 'select'; value: string; onChange: (v: string) => void
  options?: { value: string; label: string }[]; hidden?: boolean
}

function EditPaymentSection({ title, fields, onSave, onCancel }: { title: string; fields: EditFieldDef[]; onSave: () => void; onCancel: () => void }) {
  const inputCls = 'bg-background border border-border rounded-lg text-sm text-foreground px-2.5 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
  const visible = fields.filter((f) => !f.hidden)
  return (
    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
      <p className="text-sm font-semibold text-primary">Edit {title}</p>
      <div className={cn('grid gap-3', visible.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
        {visible.map((f) => (
          <div key={f.label}>
            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
            {f.type === 'select' ? (
              <select value={f.value} onChange={(e) => f.onChange(e.target.value)} className={inputCls}>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type} value={f.value} onChange={(e) => f.onChange(e.target.value)} className={inputCls} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5" /> Batal
        </button>
        <button onClick={onSave} className="flex items-center gap-1 text-xs px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold">
          <Save className="w-3.5 h-3.5" /> Simpan
        </button>
      </div>
    </div>
  )
}

function InstallmentRow({ inst, onMarkPaid, isEditing, editAmount, editDueDate, editStatus, editPaidDate, onStartEdit, onCancelEdit, onSaveEdit, onEditAmount, onEditDueDate, onEditStatus, onEditPaidDate }: {
  inst: Installment; onMarkPaid: () => void; isEditing: boolean
  editAmount: string; editDueDate: string; editStatus: InstallmentStatus; editPaidDate: string
  onStartEdit: () => void; onCancelEdit: () => void; onSaveEdit: () => void
  onEditAmount: (v: string) => void; onEditDueDate: (v: string) => void
  onEditStatus: (v: InstallmentStatus) => void; onEditPaidDate: (v: string) => void
}) {
  const iconMap: Record<InstallmentStatus, React.ReactNode> = {
    lunas:   <CheckCircle className="w-4 h-4 text-success" />,
    pending: <Clock className="w-4 h-4 text-muted-foreground" />,
    telat:   <AlertTriangle className="w-4 h-4 text-destructive" />,
  }
  const bgMap: Record<InstallmentStatus, string> = {
    lunas:   'bg-success/10 border-success/20',
    pending: 'bg-card border-border',
    telat:   'bg-destructive/10 border-destructive/20',
  }
  const inputCls = 'bg-background border border-border rounded-lg text-sm text-foreground px-2.5 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

  if (isEditing) {
    return (
      <div className="relative flex flex-col gap-3 pl-12 pr-4 py-3.5 rounded-xl border border-primary/30 bg-primary/5">
        <div className="absolute left-2.5 w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center">
          <Pencil className="w-3 h-3 text-primary" />
        </div>
        <p className="text-sm font-semibold text-primary">Edit Cicilan ke-{inst.number}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nominal (Rp)</label>
            <input type="number" value={editAmount} onChange={(e) => onEditAmount(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Jatuh Tempo</label>
            <input type="date" value={editDueDate} onChange={(e) => onEditDueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={editStatus} onChange={(e) => onEditStatus(e.target.value as InstallmentStatus)} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="lunas">Lunas</option>
              <option value="telat">Telat</option>
            </select>
          </div>
          <div className={cn(editStatus !== 'lunas' && 'opacity-40 pointer-events-none')}>
            <label className="text-xs text-muted-foreground mb-1 block">Tanggal Pelunasan</label>
            <input
              type="date"
              value={editPaidDate}
              onChange={(e) => onEditPaidDate(e.target.value)}
              className={inputCls}
              disabled={editStatus !== 'lunas'}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onCancelEdit} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" /> Batal
          </button>
          <button onClick={onSaveEdit} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold">
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative flex items-center gap-4 pl-12 pr-4 py-3.5 rounded-xl border', bgMap[inst.status])}>
      <div className="absolute left-2.5 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
        {iconMap[inst.status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">Cicilan ke-{inst.number}</span>
          <StatusBadge status={inst.status} type="installment" />
          {inst.note && <span className="text-xs text-muted-foreground italic">({inst.note})</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Jatuh tempo: {new Date(inst.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {inst.paidDate && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle className="w-3 h-3" />
              Dibayar: {new Date(inst.paidDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <p className="text-sm font-bold text-foreground">{formatCurrency(inst.amount)}</p>
        <div className="flex items-center gap-1">
          <button onClick={onStartEdit} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          {inst.status !== 'lunas' && (
            <button onClick={onMarkPaid} className="text-xs font-semibold text-primary hover:underline px-1">Lunas</button>
          )}
        </div>
      </div>
    </div>
  )
}
