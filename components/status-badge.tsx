import { cn } from '@/lib/utils'
import type { PaymentStatus, InstallmentStatus } from '@/lib/store'

const paymentStyles: Record<PaymentStatus, string> = {
  lunas: 'bg-success/10 text-success border-success/20',
  cicilan: 'bg-primary/10 text-primary border-primary/20',
  telat: 'bg-destructive/10 text-destructive border-destructive/20',
  belum_bayar: 'bg-warning/10 text-warning-foreground border-warning/20',
}

const paymentLabels: Record<PaymentStatus, string> = {
  lunas: 'Lunas',
  cicilan: 'Cicilan',
  telat: 'Telat',
  belum_bayar: 'Belum Bayar',
}

const installmentStyles: Record<InstallmentStatus, string> = {
  lunas: 'bg-success/10 text-success border-success/20',
  pending: 'bg-muted text-muted-foreground border-border',
  telat: 'bg-destructive/10 text-destructive border-destructive/20',
}

const installmentLabels: Record<InstallmentStatus, string> = {
  lunas: 'Lunas',
  pending: 'Pending',
  telat: 'Telat',
}

interface Props {
  status: PaymentStatus | InstallmentStatus
  type?: 'payment' | 'installment'
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, type = 'payment', size = 'sm' }: Props) {
  const styles = type === 'installment' ? installmentStyles : paymentStyles
  const labels = type === 'installment' ? installmentLabels : paymentLabels

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border shrink-0',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
        (styles as Record<string, string>)[status]
      )}
    >
      {(labels as Record<string, string>)[status]}
    </span>
  )
}
