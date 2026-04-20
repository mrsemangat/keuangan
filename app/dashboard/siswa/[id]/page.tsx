import AppShell from '@/components/app-shell'
import StudentDetailContent from '@/components/student-detail-content'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <AppShell>
      <StudentDetailContent id={id} />
    </AppShell>
  )
}
