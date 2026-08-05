import { Header } from '@/components/header'
import { createClient } from '@/lib/supabase/server'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await createClient()

  return (
    <div className="flex min-h-svh flex-col pt-14">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 p-5">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}