'use client'

import { useRef, useState, useEffect } from 'react'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  FileDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImportedStudentRow } from '@/lib/excel-utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ExportMode = 'students' | 'laporan'

interface Props {
  mode: ExportMode
  onExportExcel: () => Promise<void>
  onExportPDF: () => Promise<void>
  onImport?: (rows: ImportedStudentRow[]) => void // only for students mode
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ImportExportMenu({ mode, onExportExcel, onExportPDF, onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [importModal, setImportModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const run = async (key: string, fn: () => Promise<void>) => {
    setLoading(key)
    setOpen(false)
    try { await fn() } finally { setLoading(null) }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <FileDown className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">Import / Export</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Export section */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Export</p>
            </div>
            <MenuItem
              icon={<FileSpreadsheet className="w-4 h-4 text-green-600" />}
              label="Export CSV"
              desc="Buka di Excel / Google Sheets"
              loading={loading === 'xlsx'}
              onClick={() => run('xlsx', onExportExcel)}
            />
            <MenuItem
              icon={<FileText className="w-4 h-4 text-red-500" />}
              label="Export PDF"
              desc="Laporan siap cetak"
              loading={loading === 'pdf'}
              onClick={() => run('pdf', onExportPDF)}
            />

            {/* Import section — only for students mode */}
            {mode === 'students' && onImport && (
              <>
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Import</p>
                </div>
                <MenuItem
                  icon={<Upload className="w-4 h-4 text-primary" />}
                  label="Import dari CSV"
                  desc="Upload file .csv sesuai template"
                  onClick={() => { setOpen(false); setImportModal(true) }}
                />
                <MenuItem
                  icon={<Download className="w-4 h-4 text-muted-foreground" />}
                  label="Unduh Template CSV"
                  desc="Template siap isi (.csv)"
                  loading={loading === 'tpl'}
                  onClick={() =>
                    run('tpl', async () => {
                      const { downloadImportTemplate } = await import('@/lib/excel-utils')
                      await downloadImportTemplate()
                    })
                  }
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Import modal */}
      {importModal && onImport && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onConfirm={(rows) => { onImport(rows); setImportModal(false) }}
        />
      )}
    </>
  )
}

// ─── MenuItem ──────────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, desc, loading, onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left disabled:opacity-60"
    >
      <span className="shrink-0">
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
      </div>
    </button>
  )
}

// ─── ImportModal ───────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'done'

function ImportModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (rows: ImportedStudentRow[]) => void
}) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [rows, setRows] = useState<ImportedStudentRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.csv$/i)) {
      setErrors(['Format file tidak valid. Gunakan file .csv sesuai template yang diunduh.'])
      return
    }
    setLoading(true)
    setErrors([])
    try {
      const { parseImportFile } = await import('@/lib/excel-utils')
      const parsed = await parseImportFile(file)
      const allErrors = parsed.flatMap((r) => r.errors)
      setRows(parsed)
      setErrors(allErrors)
      setStep('preview')
    } catch {
      setErrors(['Gagal membaca file. Pastikan format sesuai template.'])
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const validRows = rows.filter((r) => r.errors.length === 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Import Data Siswa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 'upload' ? 'Upload file Excel untuk mengimpor data siswa secara massal' :
               step === 'preview' ? `${validRows.length} baris valid dari ${rows.length} baris total` :
               'Import selesai'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-3" />
                )}
                <p className="text-sm font-semibold text-foreground">
                  {loading ? 'Memproses file...' : 'Drag & drop file CSV atau klik untuk memilih'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Format: .csv (unduh template terlebih dahulu)</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {errors.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">{errors.join(' — ')}</div>
                </div>
              )}

              {/* Tips */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-2">Petunjuk Import</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Unduh template CSV terlebih dahulu dari menu "Unduh Template CSV"</li>
                  <li>Buka file .csv dengan Excel/Google Sheets, isi data, simpan kembali sebagai .csv</li>
                  <li>Jangan ubah nama kolom di baris pertama</li>
                  <li>Status diisi: <code className="bg-muted px-1 rounded">lunas</code> atau <code className="bg-muted px-1 rounded">belum_bayar</code></li>
                  <li>Metode bayar: <code className="bg-muted px-1 rounded">cash</code> atau <code className="bg-muted px-1 rounded">cicilan</code></li>
                  <li>Kosongkan baris yang tidak terpakai</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground">Total Baris</p>
                  <p className="text-xl font-bold text-foreground">{rows.length}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground">Siap Import</p>
                  <p className="text-xl font-bold text-success">{validRows.length}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-muted-foreground">Ada Error</p>
                  <p className="text-xl font-bold text-destructive">{rows.length - validRows.length}</p>
                </div>
              </div>

              {/* Error list */}
              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                  <p className="text-xs font-semibold text-destructive">Baris bermasalah (tidak akan diimpor):</p>
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {['', 'NIM', 'Nama', 'Program', 'TA', 'Total Biaya', 'Metode', 'Status'].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className={cn('transition-colors', r.errors.length > 0 ? 'bg-destructive/5' : 'hover:bg-muted/30')}>
                        <td className="px-3 py-2 text-center">
                          {r.errors.length > 0
                            ? <AlertCircle className="w-3.5 h-3.5 text-destructive inline" />
                            : <CheckCircle className="w-3.5 h-3.5 text-success inline" />}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{r.nim}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.program}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.academicYear}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.tuitionTotal)}
                        </td>
                        <td className="px-3 py-2 capitalize">{r.tuitionMethod}</td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            r.errors.length > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
                          )}>
                            {r.errors.length > 0 ? 'Error' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          {step === 'upload' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Batal</button>
              <div />
            </>
          ) : (
            <>
              <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                Kembali
              </button>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Batal</button>
                <button
                  onClick={() => onConfirm(validRows)}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Import {validRows.length} Siswa
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
