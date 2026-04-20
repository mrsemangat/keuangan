'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  updateStudent,
  getAcademicYears,
  getPrograms,
  type Student,
} from '@/lib/store'
import { cn } from '@/lib/utils'

interface Props {
  student: Student
  onClose: () => void
  onSaved: (updated: Student) => void
}

const inputCls =
  'w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function EditStudentModal({ student, onClose, onSaved }: Props) {
  const [academicYears] = useState(() => getAcademicYears())
  const [programs] = useState(() => getPrograms())

  // Personal info fields
  const [name, setName] = useState(student.name)
  const [nim, setNim] = useState(student.nim)
  const [email, setEmail] = useState(student.email)
  const [phone, setPhone] = useState(student.phone)
  const [address, setAddress] = useState(student.address)
  const [program, setProgram] = useState(student.program)
  const [academicYear, setAcademicYear] = useState(student.academicYear)
  const [error, setError] = useState('')

  const canSave = name.trim() !== '' && program !== ''

  const handleSave = () => {
    if (!canSave) { setError('Nama dan program wajib diisi.'); return }
    const updated = updateStudent(student.id, { name, nim, email, phone, address, program, academicYear })
    if (updated) onSaved(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-foreground">Edit Data Siswa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{student.name} &middot; {student.nim}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <FormField label="Nama Lengkap" required>
            <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Nama lengkap siswa" className={inputCls} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="NIM / ID Siswa">
              <input value={nim} onChange={(e) => setNim(e.target.value)} placeholder="PKB-2025-001" className={inputCls} />
            </FormField>
            <FormField label="Program / Kelas" required>
              <select value={program} onChange={(e) => { setProgram(e.target.value); setError('') }} className={inputCls}>
                <option value="">-- Pilih Program --</option>
                {programs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                {/* If current program is not in list, add it so existing data is preserved */}
                {student.program && !programs.includes(student.program) && (
                  <option value={student.program}>{student.program}</option>
                )}
              </select>
            </FormField>
          </div>

          <FormField label="Tahun Pelajaran" required>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputCls}>
              {academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              {/* Preserve existing year if not in list */}
              {student.academicYear && !academicYears.includes(student.academicYear) && (
                <option value={student.academicYear}>{student.academicYear}</option>
              )}
            </select>
          </FormField>

          <FormField label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" className={inputCls} />
          </FormField>

          <FormField label="Nomor HP (WA)">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls} />
          </FormField>

          <FormField label="Alamat">
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap" rows={3} className={cn(inputCls, 'resize-none')} />
          </FormField>

          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground">
            Data pembayaran (formulir, DP, cicilan) tidak dapat diedit dari sini. Gunakan tab Pembayaran &amp; Cicilan di halaman detail.
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  )
}
