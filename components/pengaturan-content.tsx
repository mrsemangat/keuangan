'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ShieldCheck, User, BookOpen, GraduationCap, Palette, RotateCcw,
} from 'lucide-react'
import {
  getAdmins, addAdmin, updateAdmin, deleteAdmin,
  getPrograms, savePrograms,
  getAcademicYears, saveAcademicYears,
  getBrand, saveBrand,
  DEFAULT_BRAND,
  type AdminUser,
  type BrandConfig,
} from '@/lib/store'
import { cn } from '@/lib/utils'

type ActiveTab = 'admin' | 'program' | 'tahun' | 'brand'

// ─── inline input style ───────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

export default function PengaturanContent() {
  const [tab, setTab] = useState<ActiveTab>('admin')

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pengaturan</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Kelola akun admin, program kelas, dan tahun ajaran</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {([
          { key: 'brand',   label: 'Brand & Tampilan', icon: Palette },
          { key: 'admin',   label: 'Akun Admin',    icon: User },
          { key: 'program', label: 'Program Kelas',  icon: BookOpen },
          { key: 'tahun',   label: 'Tahun Ajaran',   icon: GraduationCap },
        ] as { key: ActiveTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'brand'   && <BrandSection />}
      {tab === 'admin'   && <AdminSection />}
      {tab === 'program' && <ProgramSection />}
      {tab === 'tahun'   && <TahunSection />}
    </div>
  )
}

// ─── Brand Section ─────────────────────────────────────────────────────────────

const LOGO_OPTIONS: { value: BrandConfig['logoIcon']; label: string }[] = [
  { value: 'BookOpen',     label: 'Buku Terbuka' },
  { value: 'GraduationCap', label: 'Toga' },
  { value: 'School',       label: 'Sekolah' },
  { value: 'Calculator',   label: 'Kalkulator' },
  { value: 'Landmark',     label: 'Lembaga' },
]

function BrandSection() {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setBrand(getBrand()) }, [])

  const handleSave = () => {
    saveBrand(brand)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Refresh page so sidebar/login re-reads brand
    window.dispatchEvent(new Event('hitungin:brand-updated'))
  }

  const handleReset = () => {
    setBrand(DEFAULT_BRAND)
    saveBrand(DEFAULT_BRAND)
    window.dispatchEvent(new Event('hitungin:brand-updated'))
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">Sesuaikan identitas aplikasi sesuai nama lembaga Anda. Perubahan berlaku setelah disimpan.</p>

      {/* App name & tagline */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Identitas Aplikasi</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground block">Nama Aplikasi</label>
          <input
            value={brand.appName}
            onChange={(e) => setBrand({ ...brand, appName: e.target.value })}
            placeholder="Hitungin"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">Ditampilkan di sidebar, login, dan topbar.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground block">Tagline</label>
          <input
            value={brand.tagline}
            onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
            placeholder="Kelola Pembayaran Siswa"
            className={inputCls}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Warna</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">Warna Utama</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brand.primaryColor}
                onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-1"
              />
              <input
                value={brand.primaryColor}
                onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                placeholder="#3b5bdb"
                className={cn(inputCls, 'flex-1 font-mono text-xs')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">Warna Aksen</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brand.accentColor}
                onChange={(e) => setBrand({ ...brand, accentColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-1"
              />
              <input
                value={brand.accentColor}
                onChange={(e) => setBrand({ ...brand, accentColor: e.target.value })}
                placeholder="#12b886"
                className={cn(inputCls, 'flex-1 font-mono text-xs')}
              />
            </div>
          </div>
        </div>
        {/* Color preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: brand.primaryColor }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: brand.primaryColor }}>{brand.appName || 'Nama Aplikasi'}</p>
            <p className="text-xs" style={{ color: brand.accentColor }}>{brand.tagline || 'Tagline'}</p>
          </div>
        </div>
      </div>

      {/* Logo icon */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Ikon Logo</h3>
        <div className="grid grid-cols-5 gap-2">
          {LOGO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBrand({ ...brand, logoIcon: opt.value })}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all',
                brand.logoIcon === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              <LogoIconPreview icon={opt.value} size={20} />
              <span className="text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Default
        </button>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
            saved
              ? 'bg-success text-success-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  )
}

function LogoIconPreview({ icon, size = 16 }: { icon: BrandConfig['logoIcon']; size?: number }) {
  // Dynamically render icon based on name
  const iconMap: Record<BrandConfig['logoIcon'], React.ReactNode> = {
    BookOpen:     <BookOpen style={{ width: size, height: size }} />,
    GraduationCap: <GraduationCap style={{ width: size, height: size }} />,
    School:       <BookOpen style={{ width: size, height: size }} />,
    Calculator:   <Palette style={{ width: size, height: size }} />,
    Landmark:     <GraduationCap style={{ width: size, height: size }} />,
  }
  return <>{iconMap[icon]}</>
}

// ─── Admin Section ─────────────────────────────────────────────────────────────
function AdminSection() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminUser['role']>('Admin Keuangan')
  const [error, setError] = useState('')

  const refresh = () => setAdmins(getAdmins())

  useEffect(() => { refresh() }, [])

  const openAdd = () => {
    setEditId(null)
    setName(''); setEmail(''); setPassword(''); setRole('Admin Keuangan'); setError('')
    setShowForm(true)
  }

  const openEdit = (admin: AdminUser) => {
    setEditId(admin.id)
    setName(admin.name); setEmail(admin.email); setPassword(admin.password)
    setRole(admin.role); setError('')
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditId(null); setError('') }

  const handleSave = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nama, email, dan password wajib diisi.')
      return
    }
    const existing = getAdmins()
    const emailTaken = existing.some((a) => a.email === email && a.id !== editId)
    if (emailTaken) { setError('Email sudah digunakan admin lain.'); return }

    if (editId) {
      updateAdmin(editId, { name, email, password, role })
    } else {
      addAdmin({ name, email, password, role })
    }
    refresh()
    closeForm()
  }

  const handleDelete = (id: string) => {
    if (admins.length <= 1) return
    deleteAdmin(id)
    refresh()
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{admins.length} akun admin terdaftar</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      {/* Admin list */}
      <div className="space-y-3">
        {admins.map((admin) => (
          <div key={admin.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{admin.name}</p>
              <p className="text-muted-foreground text-xs truncate">{admin.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                admin.role === 'Super Admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {admin.role === 'Super Admin' && <ShieldCheck className="w-3 h-3" />}
                {admin.role}
              </span>
              <button
                onClick={() => openEdit(admin)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {admins.length > 1 && (
                <button
                  onClick={() => setDeleteId(admin.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{editId ? 'Edit Admin' : 'Tambah Admin Baru'}</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nama Lengkap</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama admin" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@lembaga.id" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={cn(inputCls, 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as AdminUser['role'])} className={inputCls}>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin Keuangan">Admin Keuangan</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={closeForm} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Batal</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-foreground">Hapus Admin?</h3>
            <p className="text-sm text-muted-foreground">Akun admin ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Batal</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Program Section ───────────────────────────────────────────────────────────
function ProgramSection() {
  const [programs, setPrograms] = useState<string[]>([])
  const [newProgram, setNewProgram] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setPrograms(getPrograms()) }, [])

  const save = (list: string[]) => { savePrograms(list); setPrograms(list) }

  const handleAdd = () => {
    const val = newProgram.trim()
    if (!val) return
    if (programs.includes(val)) { setError('Program sudah ada.'); return }
    save([...programs, val])
    setNewProgram(''); setError('')
  }

  const handleEdit = (idx: number) => {
    const val = editValue.trim()
    if (!val) return
    if (programs.some((p, i) => p === val && i !== idx)) { setError('Program sudah ada.'); return }
    const updated = [...programs]
    updated[idx] = val
    save(updated)
    setEditIdx(null); setEditValue(''); setError('')
  }

  const handleDelete = (idx: number) => {
    save(programs.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{programs.length} program tersedia. Perubahan berlaku untuk pendaftaran siswa baru.</p>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <input
          value={newProgram}
          onChange={(e) => { setNewProgram(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nama program baru, contoh: Paket A - Beasiswa"
          className={cn(inputCls, 'flex-1')}
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Program list */}
      <div className="space-y-2">
        {programs.map((prog, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
            <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            {editIdx === idx ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => { setEditValue(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(idx); if (e.key === 'Escape') { setEditIdx(null); setError('') } }}
                  autoFocus
                  className={cn(inputCls, 'flex-1 py-1')}
                />
                <button onClick={() => handleEdit(idx)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setEditIdx(null); setError('') }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-foreground">{prog}</span>
                <button onClick={() => { setEditIdx(idx); setEditValue(prog); setError('') }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}
        {programs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada program. Tambahkan program di atas.</p>
        )}
      </div>
    </div>
  )
}

// ─── Tahun Ajaran Section ──────────────────────────────────────────────────────
function TahunSection() {
  const [years, setYears] = useState<string[]>([])
  const [newYear, setNewYear] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setYears(getAcademicYears()) }, [])

  const save = (list: string[]) => { saveAcademicYears(list); setYears(list) }

  const validateYear = (val: string) => /^\d{4}\/\d{4}$/.test(val.trim())

  const handleAdd = () => {
    const val = newYear.trim()
    if (!val) return
    if (!validateYear(val)) { setError('Format tahun ajaran harus YYYY/YYYY, contoh: 2025/2026'); return }
    if (years.includes(val)) { setError('Tahun ajaran sudah ada.'); return }
    const sorted = [...years, val].sort((a, b) => b.localeCompare(a))
    save(sorted)
    setNewYear(''); setError('')
  }

  const handleEdit = (idx: number) => {
    const val = editValue.trim()
    if (!validateYear(val)) { setError('Format tahun ajaran harus YYYY/YYYY'); return }
    if (years.some((y, i) => y === val && i !== idx)) { setError('Tahun ajaran sudah ada.'); return }
    const updated = [...years]
    updated[idx] = val
    save(updated.sort((a, b) => b.localeCompare(a)))
    setEditIdx(null); setEditValue(''); setError('')
  }

  const handleDelete = (idx: number) => {
    save(years.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{years.length} tahun ajaran tersedia. Format: <span className="font-mono bg-muted px-1 rounded">2025/2026</span></p>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <input
          value={newYear}
          onChange={(e) => { setNewYear(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="2025/2026"
          className={cn(inputCls, 'flex-1')}
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Year list */}
      <div className="space-y-2">
        {years.map((year, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
            <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
            {editIdx === idx ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => { setEditValue(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(idx); if (e.key === 'Escape') { setEditIdx(null); setError('') } }}
                  autoFocus
                  placeholder="2025/2026"
                  className={cn(inputCls, 'flex-1 py-1')}
                />
                <button onClick={() => handleEdit(idx)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setEditIdx(null); setError('') }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-foreground">TA {year}</span>
                <button onClick={() => { setEditIdx(idx); setEditValue(year); setError('') }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}
        {years.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada tahun ajaran. Tambahkan di atas.</p>
        )}
      </div>
    </div>
  )
}
