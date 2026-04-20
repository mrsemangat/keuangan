'use client'

import { useState, useRef } from 'react'
import { X, Plus, Minus, Upload, Trash2, FileText, Image } from 'lucide-react'
import { addStudent, getCurrentAcademicYear, getAcademicYears, getPrograms, DOCUMENT_TYPE_LABELS, type Installment, type Document } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSaved: () => void
}

const STEPS = ['Data Pribadi', 'Pembayaran', 'Dokumen']

export default function AddStudentModal({ onClose, onSaved }: Props) {
  const [step, setStep] = useState(1)

  // Step 1 – personal info
  const [name, setName] = useState('')
  const [nim, setNim] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [program, setProgram] = useState('')
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())

  // Step 2 – payment
  const [formFee, setFormFee] = useState('75000')
  const [formStatus, setFormStatus] = useState<'belum_bayar' | 'lunas'>('belum_bayar')
  const [dpAmount, setDpAmount] = useState('1000000')
  const [dpStatus, setDpStatus] = useState<'belum_bayar' | 'lunas'>('belum_bayar')
  const [tuitionTotal, setTuitionTotal] = useState('3725000')
  const [tuitionMethod, setTuitionMethod] = useState<'cash' | 'cicilan'>('cicilan')
  // Custom installments: array of { amount: string; dueDate: string }
  const [installments, setInstallments] = useState<Array<{ amount: string; dueDate: string }>>(() => {
    const today = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const due = new Date(today.getFullYear(), today.getMonth() + i + 1, 1)
      const defaultTotal = 3725000
      const defaultCount = 5
      const perInst = Math.round(defaultTotal / defaultCount)
      const amount = i === defaultCount - 1 ? String(defaultTotal - perInst * (defaultCount - 1)) : String(perInst)
      return { amount, dueDate: due.toISOString().split('T')[0] }
    })
  })

  // Step 3 – documents
  const [documents, setDocuments] = useState<Document[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocType, setPendingDocType] = useState<Document['type']>('foto')

  const [academicYears] = useState(() => getAcademicYears())
  const [programs] = useState(() => getPrograms())

  // Sync installments count helper
  const setInstallmentCount = (count: number) => {
    const today = new Date()
    const clamped = Math.max(1, Math.min(24, count))
    const totalNum = parseInt(tuitionTotal) || 0
    const perInst = clamped > 0 ? Math.round(totalNum / clamped) : 0
    setInstallments(
      Array.from({ length: clamped }, (_, i) => {
        const due = new Date(today.getFullYear(), today.getMonth() + i + 1, 1)
        return {
          amount: String(i === clamped - 1 ? totalNum - perInst * (clamped - 1) : perInst),
          dueDate: due.toISOString().split('T')[0],
        }
      })
    )
  }

  const updateInstallment = (idx: number, field: 'amount' | 'dueDate', value: string) => {
    setInstallments((prev) => prev.map((inst, i) => (i === idx ? { ...inst, [field]: value } : inst)))
  }

  const addInstallmentRow = () => {
    const today = new Date()
    const due = new Date(today.getFullYear(), today.getMonth() + installments.length + 1, 1)
    setInstallments((prev) => [...prev, { amount: '0', dueDate: due.toISOString().split('T')[0] }])
  }

  const removeInstallmentRow = (idx: number) => {
    if (installments.length <= 1) return
    setInstallments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Recalculate equal split
  const redistributeInstallments = () => {
    const totalNum = parseInt(tuitionTotal) || 0
    const count = installments.length
    const perInst = count > 0 ? Math.round(totalNum / count) : 0
    setInstallments((prev) =>
      prev.map((inst, i) => ({
        ...inst,
        amount: String(i === count - 1 ? totalNum - perInst * (count - 1) : perInst),
      }))
    )
  }

  const totalInstallmentAmount = installments.reduce((sum, i) => sum + (parseInt(i.amount) || 0), 0)
  const tuitionTotalNum = parseInt(tuitionTotal) || 0
  const installmentDiff = tuitionTotalNum - totalInstallmentAmount

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        setDocuments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: pendingDocType,
            name: file.name,
            url,
            uploadedAt: new Date().toISOString().split('T')[0],
          },
        ])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
  }

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0]
    const formFeeNum = parseInt(formFee) || 0
    const dpNum = parseInt(dpAmount) || 0

    const builtInstallments: Installment[] = tuitionMethod === 'cicilan'
      ? installments.map((inst, i) => ({
          id: crypto.randomUUID(),
          number: i + 1,
          amount: parseInt(inst.amount) || 0,
          dueDate: inst.dueDate,
          status: 'pending' as const,
        }))
      : []

    addStudent({
      nim: nim || `PKB-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      name,
      email,
      phone,
      address,
      program,
      academicYear,
      documents,
      payment: {
        id: crypto.randomUUID(),
        formFee: formFeeNum,
        formStatus,
        formPaidDate: formStatus === 'lunas' ? today : undefined,
        dpAmount: dpNum,
        dpStatus,
        dpPaidDate: dpStatus === 'lunas' && dpNum > 0 ? today : undefined,
        tuitionTotal: tuitionTotalNum,
        tuitionMethod,
        tuitionStatus: tuitionMethod === 'cash' ? 'lunas' : builtInstallments.length > 0 ? 'cicilan' : 'belum_bayar',
        tuitionPaidDate: tuitionMethod === 'cash' ? today : undefined,
        installments: builtInstallments,
      },
    })
    onSaved()
  }

  const canNext1 = name.trim() !== '' && program !== ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border w-full max-w-xl max-h-[92vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-foreground">Tambah Siswa Baru</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Langkah {step} dari {STEPS.length}: {STEPS[step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4 pb-1 shrink-0">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  i + 1 <= step ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            {STEPS.map((label, i) => (
              <p
                key={i}
                className={cn(
                  'flex-1 text-center text-[10px] font-medium transition-colors',
                  i + 1 === step ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </p>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <>
              <FormField label="Nama Lengkap" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className={inputCls}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="NIM / ID Siswa">
                  <input
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="PKB-2024-001"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Program / Kelas" required>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Pilih Program --</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Tahun Pelajaran" required>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className={inputCls}
                >
                  {academicYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Nomor HP (WA)">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Alamat">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap"
                  rows={2}
                  className={cn(inputCls, 'resize-none')}
                />
              </FormField>
            </>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 2 && (
            <>
              {/* Form fee */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Biaya Formulir</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Nominal">
                    <input
                      type="number"
                      value={formFee}
                      onChange={(e) => setFormFee(e.target.value)}
                      placeholder="200000"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Status">
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'belum_bayar' | 'lunas')}
                      className={inputCls}
                    >
                      <option value="belum_bayar">Belum Bayar</option>
                      <option value="lunas">Lunas</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* DP */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Uang Muka (DP)</h4>
                <p className="text-xs text-muted-foreground -mt-1">Pembayaran awal sebelum cicilan atau pelunasan</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Nominal DP">
                    <input
                      type="number"
                      value={dpAmount}
                      onChange={(e) => setDpAmount(e.target.value)}
                      placeholder="500000"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Status DP">
                    <select
                      value={dpStatus}
                      onChange={(e) => setDpStatus(e.target.value as 'belum_bayar' | 'lunas')}
                      className={inputCls}
                    >
                      <option value="belum_bayar">Belum Bayar</option>
                      <option value="lunas">Lunas</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Tuition */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Uang Belajar</h4>
                <FormField label="Total Biaya Belajar">
                  <input
                    type="number"
                    value={tuitionTotal}
                    onChange={(e) => setTuitionTotal(e.target.value)}
                    placeholder="5000000"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Metode Pembayaran">
                  <div className="flex gap-2">
                    {(['cash', 'cicilan'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTuitionMethod(m)}
                        className={cn(
                          'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                          tuitionMethod === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m === 'cash' ? 'Cash (Lunas)' : 'Cicilan'}
                      </button>
                    ))}
                  </div>
                </FormField>

                {tuitionMethod === 'cicilan' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        Jadwal Cicilan
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({installments.length}x cicilan)
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={redistributeInstallments}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Rata-kan
                        </button>
                        <button
                          type="button"
                          onClick={addInstallmentRow}
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah
                        </button>
                      </div>
                    </div>

                    {/* Installment rows */}
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {installments.map((inst, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card"
                        >
                          <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0 text-center">
                            {idx + 1}
                          </span>
                          <input
                            type="number"
                            value={inst.amount}
                            onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                            placeholder="Nominal"
                            className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
                          />
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeInstallmentRow(idx)}
                            disabled={installments.length <= 1}
                            className="w-6 h-6 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded disabled:opacity-30 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className={cn(
                      'flex items-center justify-between p-2.5 rounded-lg text-xs border',
                      Math.abs(installmentDiff) < 10
                        ? 'bg-success/10 border-success/20 text-success'
                        : 'bg-warning/10 border-warning/20 text-warning-foreground'
                    )}>
                      <span className="font-medium">
                        Total cicilan: {new Intl.NumberFormat('id-ID').format(totalInstallmentAmount)}
                      </span>
                      {Math.abs(installmentDiff) >= 10 && (
                        <span className="font-semibold">
                          {installmentDiff > 0 ? `Kurang ${new Intl.NumberFormat('id-ID').format(installmentDiff)}` : `Lebih ${new Intl.NumberFormat('id-ID').format(-installmentDiff)}`}
                        </span>
                      )}
                      {Math.abs(installmentDiff) < 10 && <span>Sesuai</span>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 3: Documents ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload dokumen pendukung siswa (opsional). Format yang didukung: JPG, PNG, PDF.
              </p>

              {/* Upload controls */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground block mb-1.5">Jenis Dokumen</label>
                  <select
                    value={pendingDocType}
                    onChange={(e) => setPendingDocType(e.target.value as Document['type'])}
                    className={inputCls}
                  >
                    {(Object.keys(DOCUMENT_TYPE_LABELS) as Array<Document['type']>).map((k) => (
                      <option key={k} value={k}>{DOCUMENT_TYPE_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Pilih File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Document list */}
              {documents.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada dokumen diunggah</p>
                  <p className="text-xs text-muted-foreground mt-1">Pilih jenis dokumen lalu klik Pilih File</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {doc.url.startsWith('data:image') ? (
                          <Image className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{DOCUMENT_TYPE_LABELS[doc.type]}</p>
                      </div>
                      {doc.url.startsWith('data:image') && (
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="w-7 h-7 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Kembali
            </button>
          )}
          {step < STEPS.length ? (
            <button
              onClick={() => { if (step === 1 && !canNext1) return; setStep((s) => s + 1) }}
              disabled={step === 1 && !canNext1}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjut
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Simpan Siswa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
