// ─── Types ────────────────────────────────────────────────────────────────────

import type { Student } from './store'

export interface ImportedStudentRow {
  // Personal
  nim: string
  name: string
  email: string
  phone: string
  address: string
  program: string
  academicYear: string
  // Payment
  formFee: number
  formStatus: 'lunas' | 'belum_bayar'
  dpAmount: number
  dpStatus: 'lunas' | 'belum_bayar'
  tuitionTotal: number
  tuitionMethod: 'cash' | 'cicilan'
  tuitionStatus: 'lunas' | 'belum_bayar' | 'cicilan' | 'telat'
  installmentCount: number
  // Validation
  errors: string[]
}

// ─── CSV Utilities ─────────────────────────────────────────────────────────────

/** Trigger a file download in the browser */
function downloadBlob(content: string, filename: string, mime: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: mime + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Parse a CSV string into an array of rows (array of strings) */
function parseCSV(text: string): string[][] {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  const lines = clean.split('\n')

  for (const line of lines) {
    if (line.trim() === '') continue
    const cells: string[] = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}

/** Normalize a header string to a plain lowercase key */
function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Map every plausible CSV header variation → canonical field name */
const HEADER_MAP: Record<string, string> = {
  // NIM
  nim: 'nim',
  nomorindukm: 'nim',
  nomorinduk: 'nim',
  studentid: 'nim',
  // Name
  nama: 'name',
  namaseswa: 'name',
  namalengkap: 'name',
  name: 'name',
  fullname: 'name',
  // Email
  email: 'email',
  emailaddress: 'email',
  // Phone
  nohp: 'phone',
  nomorhp: 'phone',
  telepon: 'phone',
  phone: 'phone',
  hp: 'phone',
  // Address
  alamat: 'address',
  address: 'address',
  // Program
  program: 'program',
  programstudi: 'program',
  jurusan: 'program',
  prodi: 'program',
  // Academic Year
  tahunajaran: 'academicYear',
  tahunajar: 'academicYear',
  academicyear: 'academicYear',
  ta: 'academicYear',
  angkatan: 'academicYear',
  // Form Fee
  biayaformulir: 'formFee',
  biayaform: 'formFee',
  formfee: 'formFee',
  formulir: 'formFee',
  // Form Status
  statusformulir: 'formStatus',
  statusform: 'formStatus',
  formstatus: 'formStatus',
  statuspendaftaran: 'formStatus',
  // DP Amount
  uangmukadp: 'dpAmount',
  uangmuka: 'dpAmount',
  dp: 'dpAmount',
  dpamount: 'dpAmount',
  uangdp: 'dpAmount',
  downpayment: 'dpAmount',
  // DP Status
  statusuangmuka: 'dpStatus',
  statusdp: 'dpStatus',
  dpstatus: 'dpStatus',
  statuspembayarandp: 'dpStatus',
  // Tuition Total
  uangbelajar: 'tuitionTotal',
  totalbiaya: 'tuitionTotal',
  tuitiontotal: 'tuitionTotal',
  totalpembayaran: 'tuitionTotal',
  biayapendidikan: 'tuitionTotal',
  totaluangbelajar: 'tuitionTotal',
  biaya: 'tuitionTotal',
  // Tuition Method
  metodepembayaran: 'tuitionMethod',
  metode: 'tuitionMethod',
  tuitionmethod: 'tuitionMethod',
  carabayar: 'tuitionMethod',
  // Tuition Status
  statuspembayaran: 'tuitionStatus',
  statusuangbelajar: 'tuitionStatus',
  tuitionstatus: 'tuitionStatus',
  statuspelunasan: 'tuitionStatus',
  status: 'tuitionStatus',
  // Installment count
  jumlahcicilan: 'installmentCount',
  cicilan: 'installmentCount',
  installmentcount: 'installmentCount',
  jumlahangsuran: 'installmentCount',
}

/** Normalize a status string to one of the known values */
function normalizeStatus(raw: string): 'lunas' | 'belum_bayar' {
  const v = raw.toLowerCase().replace(/[^a-z_]/g, '')
  if (['lunas', 'paid', 'sudah', 'yes', 'y', 'selesai', 'terbayar'].includes(v)) return 'lunas'
  return 'belum_bayar'
}

function normalizeTuitionStatus(raw: string): 'lunas' | 'belum_bayar' | 'cicilan' | 'telat' {
  const v = raw.toLowerCase().replace(/[^a-z_]/g, '')
  if (['lunas', 'paid', 'sudah', 'terbayar', 'selesai'].includes(v)) return 'lunas'
  if (['cicilan', 'installment', 'angsuran', 'dicicil'].includes(v)) return 'cicilan'
  if (['telat', 'terlambat', 'overdue', 'late', 'keterlambatan'].includes(v)) return 'telat'
  return 'belum_bayar'
}

function normalizeTuitionMethod(raw: string): 'cash' | 'cicilan' {
  const v = raw.toLowerCase().replace(/[^a-z]/g, '')
  if (['cicilan', 'installment', 'kredit', 'angsur', 'dicicil'].includes(v)) return 'cicilan'
  return 'cash'
}

function parseNumber(raw: string): number {
  // Strip currency symbols, dots as thousand separators, spaces
  const cleaned = raw.replace(/[Rp.\s]/g, '').replace(/,/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

// ─── Parse Import File ─────────────────────────────────────────────────────────

export async function parseImportFile(file: File): Promise<ImportedStudentRow[]> {
  const text = await file.text()
  const rawRows = parseCSV(text)

  if (rawRows.length < 2) {
    throw new Error('File kosong atau tidak memiliki data.')
  }

  // Build header → column index map
  const headers = rawRows[0]
  const colMap: Record<string, number> = {}
  headers.forEach((h, i) => {
    const key = normalizeKey(h)
    const field = HEADER_MAP[key]
    if (field) colMap[field] = i
  })

  const get = (row: string[], field: string): string => {
    const idx = colMap[field]
    return idx !== undefined ? (row[idx] ?? '').trim() : ''
  }

  const results: ImportedStudentRow[] = []

  // Start from row 1 (skip header). Skip rows that look like instruction/notes rows.
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    // Skip completely empty rows
    if (row.every((c) => c === '')) continue
    // Skip rows that look like template notes (start with * or #)
    const firstCell = row[0] ?? ''
    if (firstCell.startsWith('*') || firstCell.startsWith('#')) continue

    const errors: string[] = []

    const nim = get(row, 'nim')
    const name = get(row, 'name')
    const email = get(row, 'email')
    const phone = get(row, 'phone')
    const address = get(row, 'address')
    const program = get(row, 'program')
    const academicYear = get(row, 'academicYear')
    const formFeeRaw = get(row, 'formFee')
    const formStatusRaw = get(row, 'formStatus')
    const dpAmountRaw = get(row, 'dpAmount')
    const dpStatusRaw = get(row, 'dpStatus')
    const tuitionTotalRaw = get(row, 'tuitionTotal')
    const tuitionMethodRaw = get(row, 'tuitionMethod')
    const tuitionStatusRaw = get(row, 'tuitionStatus')
    const installmentCountRaw = get(row, 'installmentCount')

    // Validation
    if (!nim) errors.push(`Baris ${i + 1}: NIM kosong`)
    if (!name) errors.push(`Baris ${i + 1}: Nama kosong`)

    const formFee = parseNumber(formFeeRaw)
    const formStatus = normalizeStatus(formStatusRaw)
    const dpAmount = parseNumber(dpAmountRaw)
    const dpStatus = dpAmountRaw ? normalizeStatus(dpStatusRaw) : 'belum_bayar'
    const tuitionTotal = parseNumber(tuitionTotalRaw)
    const tuitionMethod = normalizeTuitionMethod(tuitionMethodRaw)

    // Tuition status: use explicit value from CSV; if empty, infer from method
    let tuitionStatus: 'lunas' | 'belum_bayar' | 'cicilan' | 'telat'
    if (tuitionStatusRaw) {
      tuitionStatus = normalizeTuitionStatus(tuitionStatusRaw)
    } else {
      // Auto-infer: if method is cicilan, status is cicilan; else belum_bayar
      tuitionStatus = tuitionMethod === 'cicilan' ? 'cicilan' : 'belum_bayar'
    }

    const installmentCount = installmentCountRaw ? (parseInt(installmentCountRaw, 10) || 1) : 1

    results.push({
      nim,
      name,
      email,
      phone,
      address,
      program,
      academicYear,
      formFee,
      formStatus,
      dpAmount,
      dpStatus,
      tuitionTotal,
      tuitionMethod,
      tuitionStatus,
      installmentCount,
      errors,
    })
  }

  return results
}

// ─── Template Download ─────────────────────────────────────────────────────────

export async function downloadImportTemplate(): Promise<void> {
  const headers = [
    'NIM',
    'Nama',
    'Email',
    'No HP',
    'Alamat',
    'Program Studi',
    'Tahun Ajaran',
    'Biaya Formulir',
    'Status Formulir',
    'Uang Muka (DP)',
    'Status DP',
    'Uang Belajar',
    'Metode Pembayaran',
    'Status Uang Belajar',
    'Jumlah Cicilan',
  ]

  const example = [
    '2024001',
    'Budi Santoso',
    'budi@email.com',
    '081234567890',
    'Jl. Merdeka No. 1',
    'Teknik Informatika',
    '2024/2025',
    '500000',
    'lunas',
    '1000000',
    'lunas',
    '5000000',
    'cicilan',
    'cicilan',
    '6',
  ]

  const note = [
    '* Kolom wajib: NIM dan Nama',
    '',
    '',
    '',
    '',
    '',
    '',
    'Angka tanpa Rp/titik',
    'lunas / belum_bayar',
    '0 jika tidak ada',
    'lunas / belum_bayar',
    'Total biaya belajar',
    'cash / cicilan',
    'lunas / belum_bayar / cicilan / telat',
    'Isi jika metode=cicilan',
  ]

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    headers.map(escape).join(','),
    example.map(escape).join(','),
    note.map(escape).join(','),
  ].join('\n')

  downloadBlob(lines, 'template-import-siswa.csv', 'text/csv')
}

// ─── Export Students to CSV ────────────────────────────────────────────────────

export async function exportStudentsToExcel(students: Student[]): Promise<void> {
  const headers = [
    'NIM',
    'Nama',
    'Email',
    'No HP',
    'Alamat',
    'Program Studi',
    'Tahun Ajaran',
    'Biaya Formulir',
    'Status Formulir',
    'Uang Muka (DP)',
    'Status DP',
    'Uang Belajar',
    'Metode Pembayaran',
    'Status Uang Belajar',
    'Jumlah Cicilan',
    'Total Dibayar',
    'Sisa',
  ]

  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

  const rows = students.map((s) => {
    const p = s.payment
    const paid = (p.formStatus === 'lunas' ? p.formFee : 0) +
      (p.dpStatus === 'lunas' ? p.dpAmount : 0) +
      p.installments.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0) +
      (p.tuitionMethod === 'cash' && p.tuitionStatus === 'lunas' ? p.tuitionTotal : 0)
    const sisa = p.tuitionTotal + p.formFee - paid

    return [
      s.nim,
      s.name,
      s.email || '',
      s.phone || '',
      s.address || '',
      s.program,
      s.academicYear || '',
      p.formFee,
      p.formStatus,
      p.dpAmount,
      p.dpStatus,
      p.tuitionTotal,
      p.tuitionMethod,
      p.tuitionStatus,
      p.installments.length,
      paid,
      Math.max(0, sisa),
    ].map(escape).join(',')
  })

  const csv = [headers.map(escape).join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(csv, `data-siswa-${date}.csv`, 'text/csv')
}

// ─── Export Laporan to CSV ─────────────────────────────────────────────────────

interface MonthlyData {
  month: string
  income: number
  target: number
  count: number
}

export async function exportLaporanToExcel(students: Student[], monthly: MonthlyData[]): Promise<void> {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

  // Sheet 1: student summary
  const headers1 = ['NIM', 'Nama', 'Program', 'TA', 'Total Biaya', 'Dibayar', 'Sisa', 'Status']
  const rows1 = students.map((s) => {
    const p = s.payment
    const paid = (p.formStatus === 'lunas' ? p.formFee : 0) +
      (p.dpStatus === 'lunas' ? p.dpAmount : 0) +
      p.installments.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0) +
      (p.tuitionMethod === 'cash' && p.tuitionStatus === 'lunas' ? p.tuitionTotal : 0)
    const sisa = Math.max(0, p.tuitionTotal + p.formFee - paid)
    return [s.nim, s.name, s.program, s.academicYear || '', p.tuitionTotal + p.formFee, paid, sisa, p.tuitionStatus].map(escape).join(',')
  })

  // Sheet 2: monthly (appended after blank separator)
  const headers2 = ['Bulan', 'Pemasukan', 'Target', 'Jumlah Transaksi']
  const rows2 = monthly.map((m) => [m.month, m.income, m.target, m.count].map(escape).join(','))

  const csv = [
    '=== RINGKASAN SISWA ===',
    headers1.map(escape).join(','),
    ...rows1,
    '',
    '=== PEMASUKAN BULANAN ===',
    headers2.map(escape).join(','),
    ...rows2,
  ].join('\n')

  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(csv, `laporan-${date}.csv`, 'text/csv')
}

// ─── Export PDF (via print iframe) ────────────────────────────────────────────

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  lunas: 'Lunas',
  belum_bayar: 'Belum Bayar',
  cicilan: 'Cicilan',
  telat: 'Telat',
}

const STATUS_COLOR: Record<string, string> = {
  lunas: '#16a34a',
  belum_bayar: '#dc2626',
  cicilan: '#2563eb',
  telat: '#d97706',
}

export async function exportStudentsToPDF(students: Student[], appName: string): Promise<void> {
  const date = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  const rows = students.map((s) => {
    const p = s.payment
    const paid = (p.formStatus === 'lunas' ? p.formFee : 0) +
      (p.dpStatus === 'lunas' ? p.dpAmount : 0) +
      p.installments.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0) +
      (p.tuitionMethod === 'cash' && p.tuitionStatus === 'lunas' ? p.tuitionTotal : 0)
    const sisa = Math.max(0, p.tuitionTotal + p.formFee - paid)
    const color = STATUS_COLOR[p.tuitionStatus] ?? '#6b7280'
    const label = STATUS_LABEL[p.tuitionStatus] ?? p.tuitionStatus

    return `<tr>
      <td>${s.nim}</td>
      <td>${s.name}</td>
      <td>${s.program}</td>
      <td>${s.academicYear || '-'}</td>
      <td style="text-align:right">${formatRp(p.tuitionTotal + p.formFee)}</td>
      <td style="text-align:right">${formatRp(paid)}</td>
      <td style="text-align:right">${formatRp(sisa)}</td>
      <td><span style="color:${color};font-weight:600">${label}</span></td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Data Siswa - ${appName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  .sub { color: #6b7280; font-size: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${appName} — Data Siswa</h1>
  <p class="sub">Dicetak pada ${date} &bull; Total ${students.length} siswa</p>
  <table>
    <thead>
      <tr>
        <th>NIM</th><th>Nama</th><th>Program</th><th>TA</th>
        <th>Total Biaya</th><th>Dibayar</th><th>Sisa</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  printHTML(html)
}

export async function exportLaporanToPDF(students: Student[], monthly: MonthlyData[], appName: string): Promise<void> {
  const date = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const totalIncome = monthly.reduce((a, m) => a + m.income, 0)

  const monthRows = monthly.map((m) => `<tr>
    <td>${m.month}</td>
    <td style="text-align:right">${formatRp(m.income)}</td>
    <td style="text-align:right">${formatRp(m.target)}</td>
    <td style="text-align:right">${m.count}</td>
  </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan - ${appName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  h2 { font-size: 13px; font-weight: 700; margin: 20px 0 8px; }
  .sub { color: #6b7280; font-size: 10px; margin-bottom: 16px; }
  .stat { display: inline-block; margin-right: 24px; }
  .stat strong { font-size: 15px; display: block; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${appName} — Laporan Keuangan</h1>
  <p class="sub">Dicetak pada ${date}</p>
  <div style="margin-bottom:16px">
    <span class="stat"><strong>${students.length}</strong>Total Siswa</span>
    <span class="stat"><strong>${formatRp(totalIncome)}</strong>Total Pemasukan</span>
  </div>
  <h2>Pemasukan Bulanan</h2>
  <table>
    <thead><tr><th>Bulan</th><th>Pemasukan</th><th>Target</th><th>Transaksi</th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
</body>
</html>`

  printHTML(html)
}

function printHTML(html: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 500)
}
