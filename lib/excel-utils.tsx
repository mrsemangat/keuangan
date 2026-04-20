import type { Student } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportedStudentRow {
  nim: string
  name: string
  email: string
  phone: string
  address: string
  program: string
  academicYear: string
  formFee: number
  formStatus: 'lunas' | 'belum_bayar'
  dpAmount: number
  dpStatus: 'lunas' | 'belum_bayar'
  tuitionTotal: number
  tuitionMethod: 'cash' | 'cicilan'
  tuitionStatus: 'lunas' | 'cicilan' | 'belum_bayar' | 'telat'
  installmentCount: number
}

export interface ParseResult {
  valid: ImportedStudentRow[]
  errors: { row: number; message: string }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function escapeCSV(value: string | number | undefined | null): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// Map header names (lowercase, no spaces/symbols) to field keys
const HEADER_MAP: Record<string, keyof ImportedStudentRow> = {
  nim: 'nim',
  nomorinduk: 'nim',
  namalengkap: 'name',
  nama: 'name',
  namasiswa: 'name',
  email: 'email',
  notelepon: 'phone',
  nohp: 'phone',
  telepon: 'phone',
  hp: 'phone',
  phone: 'phone',
  alamat: 'address',
  address: 'address',
  programstudi: 'program',
  prodi: 'program',
  program: 'program',
  jurusan: 'program',
  tahunajaran: 'academicYear',
  tahun: 'academicYear',
  academicyear: 'academicYear',
  biayaformulir: 'formFee',
  formulir: 'formFee',
  formfee: 'formFee',
  statusformulir: 'formStatus',
  statusform: 'formStatus',
  formstatus: 'formStatus',
  uangmukadp: 'dpAmount',
  uangmuka: 'dpAmount',
  dp: 'dpAmount',
  dpamount: 'dpAmount',
  uangdp: 'dpAmount',
  statusdp: 'dpStatus',
  statusuangmuka: 'dpStatus',
  dpstatus: 'dpStatus',
  totaluangbelajar: 'tuitionTotal',
  uangbelajar: 'tuitionTotal',
  tuitiontotal: 'tuitionTotal',
  totalbiaya: 'tuitionTotal',
  metodepembayaran: 'tuitionMethod',
  metode: 'tuitionMethod',
  tuitionmethod: 'tuitionMethod',
  statuspembayaran: 'tuitionStatus',
  statusuangbelajar: 'tuitionStatus',
  tuitionstatus: 'tuitionStatus',
  statuspelunasan: 'tuitionStatus',
  status: 'tuitionStatus',
  jumlahcicilan: 'installmentCount',
  cicilan: 'installmentCount',
  installmentcount: 'installmentCount',
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeStatus(val: string): 'lunas' | 'belum_bayar' {
  const v = val.toLowerCase().trim()
  if (['lunas', 'paid', 'sudah', 'ya', 'yes', '1', 'selesai'].includes(v)) return 'lunas'
  return 'belum_bayar'
}

function normalizeTuitionStatus(val: string): 'lunas' | 'cicilan' | 'belum_bayar' | 'telat' {
  const v = val.toLowerCase().trim()
  if (['lunas', 'paid', 'sudah', 'selesai', 'yes', '1'].includes(v)) return 'lunas'
  if (['cicilan', 'installment', 'angsur', 'dicicil'].includes(v)) return 'cicilan'
  if (['telat', 'terlambat', 'overdue', 'late'].includes(v)) return 'telat'
  return 'belum_bayar'
}

function normalizeTuitionMethod(val: string): 'cash' | 'cicilan' {
  const v = val.toLowerCase().trim()
  if (['cicilan', 'installment', 'angsur', 'kredit'].includes(v)) return 'cicilan'
  return 'cash'
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string
        // Strip BOM
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        // Normalize line endings
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

        // Find header row (skip empty lines and note rows starting with *)
        let headerIdx = -1
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].trim()
          if (!l || l.startsWith('*')) continue
          headerIdx = i
          break
        }

        if (headerIdx === -1) {
          return resolve({ valid: [], errors: [{ row: 0, message: 'File kosong atau tidak ada header.' }] })
        }

        const headers = parseCSVLine(lines[headerIdx]).map(normalizeHeader)
        const fieldMap: Record<number, keyof ImportedStudentRow> = {}
        headers.forEach((h, i) => {
          const key = HEADER_MAP[h]
          if (key) fieldMap[i] = key
        })

        const valid: ImportedStudentRow[] = []
        const errors: { row: number; message: string }[] = []

        for (let i = headerIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line || line.startsWith('*')) continue

          const cols = parseCSVLine(lines[i])
          const raw: Partial<Record<keyof ImportedStudentRow, string>> = {}
          cols.forEach((val, ci) => {
            const key = fieldMap[ci]
            if (key) raw[key] = val.trim()
          })

          const rowNum = i + 1

          const nim  = raw.nim?.trim() || ''
          const name = raw.name?.trim() || ''

          if (!nim)  { errors.push({ row: rowNum, message: `Baris ${rowNum}: NIM kosong.` }); continue }
          if (!name) { errors.push({ row: rowNum, message: `Baris ${rowNum}: Nama kosong.` }); continue }

          const formFee      = parseInt(raw.formFee?.replace(/\D/g, '') || '0') || 0
          const dpAmount     = parseInt(raw.dpAmount?.replace(/\D/g, '') || '0') || 0
          const tuitionTotal = parseInt(raw.tuitionTotal?.replace(/\D/g, '') || '0') || 0
          const installmentCount = parseInt(raw.installmentCount || '0') || 0
          const tuitionMethod  = normalizeTuitionMethod(raw.tuitionMethod || 'cash')
          const tuitionStatusRaw = raw.tuitionStatus || ''

          // Auto-infer tuitionStatus if column is empty
          let tuitionStatus: 'lunas' | 'cicilan' | 'belum_bayar' | 'telat'
          if (!tuitionStatusRaw) {
            if (tuitionMethod === 'cicilan') {
              tuitionStatus = 'cicilan'
            } else {
              const dpS = normalizeStatus(raw.dpStatus || '')
              tuitionStatus = dpS === 'lunas' ? 'lunas' : 'belum_bayar'
            }
          } else {
            tuitionStatus = normalizeTuitionStatus(tuitionStatusRaw)
          }

          valid.push({
            nim,
            name,
            email:          raw.email?.trim() || '',
            phone:          raw.phone?.trim() || '',
            address:        raw.address?.trim() || '',
            program:        raw.program?.trim() || '',
            academicYear:   raw.academicYear?.trim() || '',
            formFee,
            formStatus:     normalizeStatus(raw.formStatus || ''),
            dpAmount,
            dpStatus:       normalizeStatus(raw.dpStatus || ''),
            tuitionTotal,
            tuitionMethod,
            tuitionStatus,
            installmentCount: tuitionMethod === 'cicilan' ? (installmentCount || 3) : 0,
          })
        }

        resolve({ valid, errors })
      } catch (err) {
        resolve({ valid: [], errors: [{ row: 0, message: `Gagal membaca file: ${err}` }] })
      }
    }
    reader.onerror = () => resolve({ valid: [], errors: [{ row: 0, message: 'Gagal membaca file.' }] })
    reader.readAsText(file, 'UTF-8')
  })
}

// ─── Template Download ────────────────────────────────────────────────────────

export function downloadImportTemplate(): void {
  const headers = [
    'NIM',
    'Nama Lengkap',
    'Email',
    'No Telepon',
    'Alamat',
    'Program Studi',
    'Tahun Ajaran',
    'Biaya Formulir',
    'Status Formulir',
    'Uang Muka (DP)',
    'Status DP',
    'Total Uang Belajar',
    'Metode Pembayaran',
    'Status Uang Belajar',
    'Jumlah Cicilan',
  ]

  const example = [
    '2024001',
    'Ahmad Fauzi',
    'ahmad@email.com',
    '08123456789',
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

  const notes = [
    '* Keterangan:',
    '',
    '',
    '',
    '',
    '',
    '',
    'Angka tanpa titik/koma',
    'lunas / belum_bayar',
    'Angka tanpa titik/koma',
    'lunas / belum_bayar',
    'Angka tanpa titik/koma',
    'cash / cicilan',
    'lunas / cicilan / belum_bayar / telat',
    'Isi jika metode cicilan',
  ]

  const rows = [
    headers.map(escapeCSV).join(','),
    example.map(escapeCSV).join(','),
    notes.map(escapeCSV).join(','),
  ]

  triggerDownload(rows.join('\n'), 'template-import-siswa.csv', 'text/csv;charset=utf-8')
}

// ─── Export Students to CSV ──────────────────────────────────────────────────

export function exportStudentsToExcel(students: Student[]): void {
  const headers = [
    'NIM', 'Nama', 'Email', 'Telepon', 'Alamat', 'Program Studi', 'Tahun Ajaran',
    'Biaya Formulir', 'Status Formulir', 'Tgl Bayar Formulir',
    'Uang Muka (DP)', 'Status DP', 'Tgl Bayar DP',
    'Total Uang Belajar', 'Metode', 'Status Uang Belajar',
    'Total Dibayar', 'Sisa',
  ]

  const rows = students.map((s) => {
    const paid = getPaidTotal(s)
    const remaining = s.payment.tuitionTotal - paid
    return [
      s.nim,
      s.name,
      s.email || '',
      s.phone || '',
      s.address || '',
      s.program || '',
      s.academicYear || '',
      s.payment.formFee,
      s.payment.formStatus === 'lunas' ? 'Lunas' : 'Belum Bayar',
      s.payment.formPaidDate || '',
      s.payment.dpAmount,
      s.payment.dpStatus === 'lunas' ? 'Lunas' : 'Belum Bayar',
      s.payment.dpPaidDate || '',
      s.payment.tuitionTotal,
      s.payment.tuitionMethod === 'cicilan' ? 'Cicilan' : 'Cash',
      statusLabel(s.payment.tuitionStatus),
      paid,
      remaining,
    ].map(escapeCSV).join(',')
  })

  const content = [headers.map(escapeCSV).join(','), ...rows].join('\n')
  triggerDownload(content, `data-siswa-${today()}.csv`, 'text/csv;charset=utf-8')
}

// ─── Export Students to PDF ──────────────────────────────────────────────────

export function exportStudentsToPDF(students: Student[], appName = 'Hitungin'): void {
  const rows = students.map((s, i) => {
    const paid = getPaidTotal(s)
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${s.nim}</td>
        <td>${s.name}</td>
        <td>${s.program || '-'}</td>
        <td>${s.academicYear || '-'}</td>
        <td style="text-align:right">${formatRp(s.payment.tuitionTotal)}</td>
        <td style="text-align:right">${formatRp(paid)}</td>
        <td style="text-align:right">${formatRp(s.payment.tuitionTotal - paid)}</td>
        <td><span class="badge badge-${s.payment.tuitionStatus}">${statusLabel(s.payment.tuitionStatus)}</span></td>
      </tr>`
  }).join('')

  const html = buildPDFHtml({
    appName,
    title: 'Data Siswa',
    subtitle: `Total: ${students.length} siswa — Dicetak: ${formatDate(new Date().toISOString())}`,
    tableHead: `<tr>
      <th>No</th><th>NIM</th><th>Nama</th><th>Program</th><th>TA</th>
      <th>Total Biaya</th><th>Dibayar</th><th>Sisa</th><th>Status</th>
    </tr>`,
    tableBody: rows,
  })

  printHTML(html)
}

// ─── Export Laporan to CSV ────────────────────────────────────────────────────

export function exportLaporanToExcel(students: Student[], monthlyData: { name: string; income: number }[]): void {
  // Sheet 1: summary
  const summaryHeaders = ['NIM', 'Nama', 'Program', 'TA', 'Total Biaya', 'Dibayar', 'Sisa', 'Status']
  const summaryRows = students.map((s) => {
    const paid = getPaidTotal(s)
    return [
      s.nim, s.name, s.program || '', s.academicYear || '',
      s.payment.tuitionTotal, paid, s.payment.tuitionTotal - paid,
      statusLabel(s.payment.tuitionStatus),
    ].map(escapeCSV).join(',')
  })

  // Sheet 2: monthly (appended after blank line)
  const monthlyHeaders = ['Bulan', 'Pemasukan (Rp)']
  const monthlyRows = monthlyData.map((m) => [m.name, m.income].map(escapeCSV).join(','))

  const content = [
    '=== RINGKASAN SISWA ===',
    summaryHeaders.map(escapeCSV).join(','),
    ...summaryRows,
    '',
    '=== PEMASUKAN BULANAN ===',
    monthlyHeaders.map(escapeCSV).join(','),
    ...monthlyRows,
  ].join('\n')

  triggerDownload(content, `laporan-keuangan-${today()}.csv`, 'text/csv;charset=utf-8')
}

// ─── Export Laporan to PDF ────────────────────────────────────────────────────

export function exportLaporanToPDF(
  students: Student[],
  monthlyData: { name: string; income: number }[],
  appName = 'Hitungin'
): void {
  const totalIncome = students.reduce((sum, s) => sum + getPaidTotal(s), 0)
  const totalPending = students.reduce((sum, s) => sum + (s.payment.tuitionTotal - getPaidTotal(s)), 0)
  const lunas = students.filter((s) => s.payment.tuitionStatus === 'lunas').length
  const belum = students.filter((s) => s.payment.tuitionStatus === 'belum_bayar').length
  const cicilan = students.filter((s) => s.payment.tuitionStatus === 'cicilan').length

  const summaryCards = `
    <div class="cards">
      <div class="card"><div class="card-label">Total Siswa</div><div class="card-value">${students.length}</div></div>
      <div class="card"><div class="card-label">Sudah Lunas</div><div class="card-value green">${lunas}</div></div>
      <div class="card"><div class="card-label">Cicilan</div><div class="card-value blue">${cicilan}</div></div>
      <div class="card"><div class="card-label">Belum Bayar</div><div class="card-value red">${belum}</div></div>
      <div class="card"><div class="card-label">Total Pemasukan</div><div class="card-value">${formatRp(totalIncome)}</div></div>
      <div class="card"><div class="card-label">Sisa Piutang</div><div class="card-value red">${formatRp(totalPending)}</div></div>
    </div>`

  const monthlyRows = monthlyData.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.name}</td>
      <td style="text-align:right">${formatRp(m.income)}</td>
    </tr>`).join('')

  const studentRows = students.map((s, i) => {
    const paid = getPaidTotal(s)
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${s.nim}</td>
        <td>${s.name}</td>
        <td>${s.program || '-'}</td>
        <td style="text-align:right">${formatRp(s.payment.tuitionTotal)}</td>
        <td style="text-align:right">${formatRp(paid)}</td>
        <td style="text-align:right">${formatRp(s.payment.tuitionTotal - paid)}</td>
        <td><span class="badge badge-${s.payment.tuitionStatus}">${statusLabel(s.payment.tuitionStatus)}</span></td>
      </tr>`
  }).join('')

  const body = `
    ${summaryCards}
    <h3 style="margin:24px 0 8px">Pemasukan Bulanan</h3>
    <table>
      <thead><tr><th>No</th><th>Bulan</th><th>Pemasukan</th></tr></thead>
      <tbody>${monthlyRows}</tbody>
    </table>
    <h3 style="margin:24px 0 8px">Detail Siswa</h3>
    <table>
      <thead><tr><th>No</th><th>NIM</th><th>Nama</th><th>Program</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Status</th></tr></thead>
      <tbody>${studentRows}</tbody>
    </table>`

  const html = buildPDFHtml({
    appName,
    title: 'Laporan Keuangan',
    subtitle: `Dicetak: ${formatDate(new Date().toISOString())}`,
    tableHead: '',
    tableBody: '',
    customBody: body,
  })

  printHTML(html)
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

function buildPDFHtml(opts: {
  appName: string
  title: string
  subtitle: string
  tableHead: string
  tableBody: string
  customBody?: string
}): string {
  const table = opts.customBody
    ? opts.customBody
    : `<table><thead>${opts.tableHead}</thead><tbody>${opts.tableBody}</tbody></table>`

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${opts.title} — ${opts.appName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
  .header { background: #1e40af; color: white; padding: 14px 20px; border-radius: 8px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 18px; font-weight: 700; }
  .header p  { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .header .right { text-align: right; font-size: 10px; opacity: 0.85; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { padding: 2px 7px; border-radius: 12px; font-size: 9px; font-weight: 600; }
  .badge-lunas    { background: #d1fae5; color: #065f46; }
  .badge-cicilan  { background: #dbeafe; color: #1e40af; }
  .badge-belum_bayar { background: #fee2e2; color: #991b1b; }
  .badge-telat    { background: #fef3c7; color: #92400e; }
  .cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .card { flex: 1; min-width: 130px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .card-label { font-size: 9px; color: #6b7280; margin-bottom: 4px; }
  .card-value { font-size: 16px; font-weight: 700; color: #111; }
  .card-value.green { color: #059669; }
  .card-value.blue  { color: #2563eb; }
  .card-value.red   { color: #dc2626; }
  @media print {
    body { padding: 0; }
    @page { margin: 15mm; size: A4 landscape; }
  }
</style>
</head>
<body>
<div class="header">
  <div><h1>${opts.appName}</h1><p>${opts.title}</p></div>
  <div class="right">${opts.subtitle}</div>
</div>
${table}
</body>
</html>`
}

function printHTML(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }, 500)
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function getPaidTotal(s: Student): number {
  const form = s.payment.formStatus === 'lunas' ? s.payment.formFee : 0
  const dp   = s.payment.dpStatus   === 'lunas' ? s.payment.dpAmount : 0
  const installmentsPaid = (s.payment.installments ?? [])
    .filter((i) => i.status === 'lunas')
    .reduce((sum, i) => sum + i.amount, 0)
  if (s.payment.tuitionMethod === 'cash') {
    const tuition = s.payment.tuitionStatus === 'lunas' ? s.payment.tuitionTotal : 0
    return form + tuition
  }
  return form + dp + installmentsPaid
}

function statusLabel(status: string): string {
  switch (status) {
    case 'lunas':      return 'Lunas'
    case 'cicilan':    return 'Cicilan'
    case 'telat':      return 'Telat'
    case 'belum_bayar': return 'Belum Bayar'
    default:           return status
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}
