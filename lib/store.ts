'use client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentStatus = 'lunas' | 'cicilan' | 'telat' | 'belum_bayar'
export type InstallmentStatus = 'lunas' | 'pending' | 'telat'
export type DpStatus = 'belum_bayar' | 'lunas'

export interface Document {
  id: string
  type: 'foto' | 'ktp' | 'kk' | 'ijazah' | 'lainnya'
  name: string
  url: string
  uploadedAt: string
}

export interface Installment {
  id: string
  number: number
  amount: number
  dueDate: string
  paidDate?: string
  status: InstallmentStatus
  note?: string
}

export interface Payment {
  id: string
  formFee: number
  formPaidDate?: string
  formStatus: 'belum_bayar' | 'lunas'
  dpAmount: number
  dpStatus: DpStatus
  dpPaidDate?: string
  tuitionTotal: number
  tuitionMethod: 'cash' | 'cicilan'
  installments: Installment[]
  tuitionPaidDate?: string
  tuitionStatus: PaymentStatus
}

export interface Student {
  id: string
  nim: string
  name: string
  email: string
  phone: string
  address: string
  program: string
  academicYear: string
  photo?: string
  documents: Document[]
  createdAt: string
  payment: Payment
}

export interface AdminUser {
  id: string
  name: string
  email: string
  password: string
  role: 'Super Admin' | 'Admin Keuangan'
  createdAt: string
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE_STUDENTS = 'hitungin_students_v2'
const STORAGE_AUTH     = 'hitungin_auth'
const STORAGE_ADMINS   = 'hitungin_admins_v1'
const STORAGE_PROGRAMS = 'hitungin_programs_v1'
const STORAGE_YEARS    = 'hitungin_years_v1'
const STORAGE_BRAND    = 'hitungin_brand_v1'

// ─── Brand Config ─────────────────────────────────────────────────────────────

export interface BrandConfig {
  appName: string
  tagline: string
  primaryColor: string   // hex
  accentColor: string    // hex
  logoIcon: 'BookOpen' | 'GraduationCap' | 'School' | 'Calculator' | 'Landmark'
}

export const DEFAULT_BRAND: BrandConfig = {
  appName: 'Hitungin',
  tagline: 'Kelola Pembayaran Siswa',
  primaryColor: '#3b5bdb',
  accentColor: '#12b886',
  logoIcon: 'BookOpen',
}

export function getBrand(): BrandConfig {
  if (typeof window === 'undefined') return DEFAULT_BRAND
  try {
    const raw = localStorage.getItem(STORAGE_BRAND)
    if (!raw) return DEFAULT_BRAND
    return { ...DEFAULT_BRAND, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BRAND
  }
}

export function saveBrand(config: BrandConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_BRAND, JSON.stringify(config))
}

// ─── Default Programs ─────────────────────────────────────────────────────────

export const DEFAULT_PROGRAMS: string[] = [
  'Paket A - Beasiswa',
  'Paket A - Mandiri',
  'Paket B - Beasiswa',
  'Paket B - Mandiri',
  'Paket B - Reguler',
  'Paket C - Beasiswa',
  'Paket C - Mandiri',
  'Paket C - IPA',
  'Paket C - IPS',
  'Kursus Komputer',
  'Kursus Bahasa Inggris',
]

export function getPrograms(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PROGRAMS
  try {
    const raw = localStorage.getItem(STORAGE_PROGRAMS)
    if (!raw) {
      localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify(DEFAULT_PROGRAMS))
      return DEFAULT_PROGRAMS
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_PROGRAMS
  }
}

export function savePrograms(programs: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify(programs))
}

// ─── Academic Year Helpers ────────────────────────────────────────────────────

// Starts at 2025/2026 and goes 5 years forward
export function generateAcademicYears(): string[] {
  if (typeof window !== 'undefined') {
    const stored = getAcademicYears()
    if (stored.length > 0) return stored
  }
  return buildDefaultYears()
}

function buildDefaultYears(): string[] {
  const years: string[] = []
  // Always start from 2025/2026, go to 2030/2031
  for (let y = 2030; y >= 2025; y--) {
    years.push(`${y}/${y + 1}`)
  }
  return years
}

export function getAcademicYears(): string[] {
  if (typeof window === 'undefined') return buildDefaultYears()
  try {
    const raw = localStorage.getItem(STORAGE_YEARS)
    if (!raw) {
      const defaults = buildDefaultYears()
      localStorage.setItem(STORAGE_YEARS, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw)
  } catch {
    return buildDefaultYears()
  }
}

export function saveAcademicYears(years: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_YEARS, JSON.stringify(years))
}

export function getCurrentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // Academic year starts July (month 7)
  const startYear = month >= 7 ? year : year - 1
  return `${startYear}/${startYear + 1}`
}

// ─── Admin Store ──────────────────────────────────────────────────────────────

const SEED_ADMINS: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Admin Keuangan',
    email: 'admin@hitungin.id',
    password: 'admin123',
    role: 'Super Admin',
    createdAt: '2025-01-01',
  },
]

export function getAdmins(): AdminUser[] {
  if (typeof window === 'undefined') return SEED_ADMINS
  try {
    const raw = localStorage.getItem(STORAGE_ADMINS)
    if (!raw) {
      localStorage.setItem(STORAGE_ADMINS, JSON.stringify(SEED_ADMINS))
      return SEED_ADMINS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_ADMINS
  }
}

export function saveAdmins(admins: AdminUser[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_ADMINS, JSON.stringify(admins))
}

export function addAdmin(data: Omit<AdminUser, 'id' | 'createdAt'>): AdminUser {
  const admins = getAdmins()
  const newAdmin: AdminUser = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().split('T')[0],
  }
  saveAdmins([...admins, newAdmin])
  return newAdmin
}

export function updateAdmin(id: string, updates: Partial<Omit<AdminUser, 'id'>>): AdminUser | null {
  const admins = getAdmins()
  const idx = admins.findIndex((a) => a.id === id)
  if (idx === -1) return null
  admins[idx] = { ...admins[idx], ...updates }
  saveAdmins(admins)
  // If editing the currently logged-in admin, update auth
  if (typeof window !== 'undefined') {
    const auth = getAuth()
    if (auth && auth.email === admins[idx].email) {
      localStorage.setItem(
        STORAGE_AUTH,
        JSON.stringify({ loggedIn: true, id, name: admins[idx].name, role: admins[idx].role, email: admins[idx].email })
      )
    }
  }
  return admins[idx]
}

export function deleteAdmin(id: string): boolean {
  const admins = getAdmins()
  if (admins.length <= 1) return false // keep at least one admin
  const filtered = admins.filter((a) => a.id !== id)
  if (filtered.length === admins.length) return false
  saveAdmins(filtered)
  return true
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  loggedIn: boolean
  id?: string
  name: string
  role: string
  email: string
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const STORAGE_LOGIN_ATTEMPTS = 'hitungin_login_attempts'
const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 15 * 60 * 1000 // 15 minutes

interface LoginAttempts {
  count: number
  firstAt: number
  lockedUntil?: number
}

function getLoginAttempts(): LoginAttempts {
  try {
    const raw = localStorage.getItem(STORAGE_LOGIN_ATTEMPTS)
    return raw ? JSON.parse(raw) : { count: 0, firstAt: Date.now() }
  } catch {
    return { count: 0, firstAt: Date.now() }
  }
}

function recordFailedAttempt(): LoginAttempts {
  const attempts = getLoginAttempts()
  const now = Date.now()
  // Reset window if it's been more than 15 minutes since first attempt
  if (now - attempts.firstAt > LOCKOUT_MS) {
    const fresh = { count: 1, firstAt: now }
    localStorage.setItem(STORAGE_LOGIN_ATTEMPTS, JSON.stringify(fresh))
    return fresh
  }
  const updated: LoginAttempts = {
    count: attempts.count + 1,
    firstAt: attempts.firstAt,
    lockedUntil: attempts.count + 1 >= MAX_ATTEMPTS ? now + LOCKOUT_MS : undefined,
  }
  localStorage.setItem(STORAGE_LOGIN_ATTEMPTS, JSON.stringify(updated))
  return updated
}

function clearLoginAttempts(): void {
  localStorage.removeItem(STORAGE_LOGIN_ATTEMPTS)
}

export function getLoginLockoutSeconds(): number {
  try {
    const attempts = getLoginAttempts()
    if (!attempts.lockedUntil) return 0
    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000)
    return Math.max(0, remaining)
  } catch {
    return 0
  }
}

export function getRemainingLoginAttempts(): number {
  try {
    const attempts = getLoginAttempts()
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) return 0
    return Math.max(0, MAX_ATTEMPTS - attempts.count)
  } catch {
    return MAX_ATTEMPTS
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  loggedIn: boolean
  id?: string
  name: string
  role: string
  email: string
  // Session token to prevent naive session fixation
  token?: string
}

export function login(email: string, password: string): boolean {
  // Sanitize inputs
  const cleanEmail    = email.trim().toLowerCase().slice(0, 256)
  const cleanPassword = password.slice(0, 256)

  // Check lockout
  const lockoutSecs = getLoginLockoutSeconds()
  if (lockoutSecs > 0) return false

  const admins = getAdmins()
  const admin = admins.find(
    (a) => a.email.toLowerCase() === cleanEmail && a.password === cleanPassword
  )

  if (!admin) {
    recordFailedAttempt()
    return false
  }

  clearLoginAttempts()

  const session: AuthSession = {
    loggedIn: true,
    id: admin.id,
    name: admin.name,
    role: admin.role,
    email: admin.email,
    token: crypto.randomUUID(),
  }
  localStorage.setItem(STORAGE_AUTH, JSON.stringify(session))
  return true
}

export function logout(): void {
  localStorage.removeItem(STORAGE_AUTH)
}

export function getAuth(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_AUTH)
    if (!raw) return null
    const session: AuthSession = JSON.parse(raw)
    // Basic session validation
    if (!session.loggedIn || !session.email || !session.name) return null
    return session
  } catch {
    return null
  }
}

// ─── Student Seed Data ────────────────────────────────────────────────────────

const seedStudents: Student[] = [
  {
    id: '1',
    nim: 'PKB-2025-001',
    name: 'Andi Pratama',
    email: 'andi@email.com',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 10, Jakarta',
    program: 'Paket C - IPA',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-01-15',
    payment: {
      id: 'p1',
      formFee: 200000,
      formPaidDate: '2025-01-15',
      formStatus: 'lunas',
      dpAmount: 500000,
      dpStatus: 'lunas',
      dpPaidDate: '2025-01-15',
      tuitionTotal: 5000000,
      tuitionMethod: 'cicilan',
      tuitionStatus: 'cicilan',
      installments: [
        { id: 'i1', number: 1, amount: 1000000, dueDate: '2025-02-01', paidDate: '2025-01-30', status: 'lunas' },
        { id: 'i2', number: 2, amount: 1000000, dueDate: '2025-03-01', paidDate: '2025-03-02', status: 'lunas' },
        { id: 'i3', number: 3, amount: 1500000, dueDate: '2025-04-01', status: 'pending' },
        { id: 'i4', number: 4, amount: 750000,  dueDate: '2025-05-01', status: 'pending' },
        { id: 'i5', number: 5, amount: 750000,  dueDate: '2025-06-01', status: 'pending' },
      ],
    },
  },
  {
    id: '2',
    nim: 'PKB-2025-002',
    name: 'Siti Rahayu',
    email: 'siti@email.com',
    phone: '082345678901',
    address: 'Jl. Sudirman No. 45, Bandung',
    program: 'Paket B - Reguler',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-01-20',
    payment: {
      id: 'p2',
      formFee: 150000,
      formPaidDate: '2025-01-20',
      formStatus: 'lunas',
      dpAmount: 300000,
      dpStatus: 'lunas',
      dpPaidDate: '2025-01-20',
      tuitionTotal: 3000000,
      tuitionMethod: 'cash',
      tuitionStatus: 'lunas',
      tuitionPaidDate: '2025-01-25',
      installments: [],
    },
  },
  {
    id: '3',
    nim: 'PKB-2025-003',
    name: 'Budi Santoso',
    email: 'budi@email.com',
    phone: '083456789012',
    address: 'Jl. Ahmad Yani No. 22, Surabaya',
    program: 'Paket C - IPS',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-02-01',
    payment: {
      id: 'p3',
      formFee: 200000,
      formStatus: 'belum_bayar',
      dpAmount: 0,
      dpStatus: 'belum_bayar',
      tuitionTotal: 5000000,
      tuitionMethod: 'cicilan',
      tuitionStatus: 'telat',
      installments: [
        { id: 'i6', number: 1, amount: 1250000, dueDate: '2025-02-15', paidDate: '2025-02-20', status: 'lunas' },
        { id: 'i7', number: 2, amount: 1250000, dueDate: '2025-03-15', status: 'telat' },
        { id: 'i8', number: 3, amount: 1500000, dueDate: '2025-04-15', status: 'pending' },
        { id: 'i9', number: 4, amount: 1000000, dueDate: '2025-05-15', status: 'pending' },
      ],
    },
  },
  {
    id: '4',
    nim: 'PKB-2025-004',
    name: 'Dewi Lestari',
    email: 'dewi@email.com',
    phone: '084567890123',
    address: 'Jl. Diponegoro No. 8, Semarang',
    program: 'Kursus Komputer',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-02-10',
    payment: {
      id: 'p4',
      formFee: 100000,
      formPaidDate: '2025-02-10',
      formStatus: 'lunas',
      dpAmount: 200000,
      dpStatus: 'lunas',
      dpPaidDate: '2025-02-10',
      tuitionTotal: 2000000,
      tuitionMethod: 'cicilan',
      tuitionStatus: 'lunas',
      installments: [
        { id: 'i10', number: 1, amount: 1000000, dueDate: '2025-02-20', paidDate: '2025-02-18', status: 'lunas' },
        { id: 'i11', number: 2, amount: 1000000, dueDate: '2025-03-20', paidDate: '2025-03-19', status: 'lunas' },
      ],
    },
  },
  {
    id: '5',
    nim: 'PKB-2025-005',
    name: 'Reza Firmansyah',
    email: 'reza@email.com',
    phone: '085678901234',
    address: 'Jl. Gatot Subroto No. 33, Medan',
    program: 'Paket C - IPA',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-02-15',
    payment: {
      id: 'p5',
      formFee: 200000,
      formStatus: 'belum_bayar',
      dpAmount: 0,
      dpStatus: 'belum_bayar',
      tuitionTotal: 5000000,
      tuitionMethod: 'cicilan',
      tuitionStatus: 'belum_bayar',
      installments: [
        { id: 'i12', number: 1, amount: 1000000, dueDate: '2025-03-01', status: 'telat' },
        { id: 'i13', number: 2, amount: 1000000, dueDate: '2025-04-01', status: 'pending' },
        { id: 'i14', number: 3, amount: 1000000, dueDate: '2025-05-01', status: 'pending' },
        { id: 'i15', number: 4, amount: 1000000, dueDate: '2025-06-01', status: 'pending' },
        { id: 'i16', number: 5, amount: 1000000, dueDate: '2025-07-01', status: 'pending' },
      ],
    },
  },
  {
    id: '6',
    nim: 'PKB-2025-006',
    name: 'Maya Indah',
    email: 'maya@email.com',
    phone: '086789012345',
    address: 'Jl. Pemuda No. 17, Yogyakarta',
    program: 'Paket B - Mandiri',
    academicYear: '2025/2026',
    documents: [],
    createdAt: '2025-03-01',
    payment: {
      id: 'p6',
      formFee: 150000,
      formPaidDate: '2025-03-02',
      formStatus: 'lunas',
      dpAmount: 300000,
      dpStatus: 'lunas',
      dpPaidDate: '2025-03-02',
      tuitionTotal: 3000000,
      tuitionMethod: 'cicilan',
      tuitionStatus: 'cicilan',
      installments: [
        { id: 'i17', number: 1, amount: 1000000, dueDate: '2025-03-15', paidDate: '2025-03-14', status: 'lunas' },
        { id: 'i18', number: 2, amount: 1200000, dueDate: '2025-04-15', status: 'pending' },
        { id: 'i19', number: 3, amount: 800000,  dueDate: '2025-05-15', status: 'pending' },
      ],
    },
  },
]

// ─── Student CRUD ─────────────────────────────────────────────────────────────

export function getStudents(): Student[] {
  if (typeof window === 'undefined') return seedStudents
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS)
    if (!raw) {
      localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(seedStudents))
      return seedStudents
    }
    return JSON.parse(raw)
  } catch {
    return seedStudents
  }
}

export function saveStudents(students: Student[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students))
}

export function getStudentById(id: string): Student | undefined {
  return getStudents().find((s) => s.id === id)
}

export function addStudent(student: Omit<Student, 'id' | 'createdAt'>): Student {
  const students = getStudents()
  const newStudent: Student = {
    ...student,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().split('T')[0],
  }
  saveStudents([...students, newStudent])
  return newStudent
}

export function updateStudent(id: string, updates: Partial<Student>): Student | null {
  const students = getStudents()
  const idx = students.findIndex((s) => s.id === id)
  if (idx === -1) return null
  students[idx] = { ...students[idx], ...updates }
  saveStudents(students)
  return students[idx]
}

export function deleteStudent(id: string): boolean {
  const students = getStudents()
  const filtered = students.filter((s) => s.id !== id)
  if (filtered.length === students.length) return false
  saveStudents(filtered)
  return true
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getPaidAmount(payment: Payment): number {
  if (payment.tuitionMethod === 'cash' && payment.tuitionStatus === 'lunas') {
    return payment.tuitionTotal
  }
  const instPaid = payment.installments
    .filter((i) => i.status === 'lunas')
    .reduce((sum, i) => sum + i.amount, 0)
  const dpPaid = payment.dpStatus === 'lunas' ? payment.dpAmount : 0
  return instPaid + dpPaid
}

export function getRemainingAmount(payment: Payment): number {
  const dpPaid = payment.dpStatus === 'lunas' ? payment.dpAmount : 0
  if (payment.tuitionMethod === 'cash' && payment.tuitionStatus === 'lunas') return 0
  const instPaid = payment.installments
    .filter((i) => i.status === 'lunas')
    .reduce((sum, i) => sum + i.amount, 0)
  return Math.max(0, payment.tuitionTotal - dpPaid - instPaid)
}

export function getStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    lunas: 'Lunas',
    cicilan: 'Cicilan',
    telat: 'Telat',
    belum_bayar: 'Belum Bayar',
  }
  return map[status]
}

export function getInstallmentStatusLabel(status: InstallmentStatus): string {
  const map: Record<InstallmentStatus, string> = {
    lunas: 'Lunas',
    pending: 'Pending',
    telat: 'Telat',
  }
  return map[status]
}

export function getMonthlyPayments(
  students: Student[],
  academicYear?: string
): Record<string, { tuition: number; form: number; total: number }> {
  const monthly: Record<string, { tuition: number; form: number; total: number }> = {}

  const ensure = (key: string) => {
    if (!monthly[key]) monthly[key] = { tuition: 0, form: 0, total: 0 }
  }

  const filtered = academicYear
    ? students.filter((s) => s.academicYear === academicYear)
    : students

  for (const student of filtered) {
    const p = student.payment

    // Form fee
    if (p.formStatus === 'lunas' && p.formPaidDate) {
      const key = p.formPaidDate.slice(0, 7)
      ensure(key)
      monthly[key].form += p.formFee
      monthly[key].total += p.formFee
    }

    // DP
    if (p.dpPaidDate && p.dpStatus === 'lunas') {
      const key = p.dpPaidDate.slice(0, 7)
      ensure(key)
      monthly[key].tuition += p.dpAmount
      monthly[key].total += p.dpAmount
    }

    // Installments
    for (const inst of p.installments) {
      if (inst.paidDate && inst.status === 'lunas') {
        const key = inst.paidDate.slice(0, 7)
        ensure(key)
        monthly[key].tuition += inst.amount
        monthly[key].total += inst.amount
      }
    }

    // Cash tuition
    if (p.tuitionMethod === 'cash' && p.tuitionPaidDate) {
      const key = p.tuitionPaidDate.slice(0, 7)
      ensure(key)
      monthly[key].tuition += p.tuitionTotal
      monthly[key].total += p.tuitionTotal
    }
  }
  return monthly
}

export function getUniqueAcademicYears(students: Student[]): string[] {
  const years = new Set(students.map((s) => s.academicYear).filter(Boolean))
  return Array.from(years).sort((a, b) => b.localeCompare(a))
}

export const DOCUMENT_TYPE_LABELS: Record<Document['type'], string> = {
  foto: 'Pas Foto',
  ktp: 'KTP',
  kk: 'Kartu Keluarga',
  ijazah: 'Ijazah Terakhir',
  lainnya: 'Lainnya',
}
