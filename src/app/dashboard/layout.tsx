import Link from 'next/link'

import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { createClient } from '@/lib/supabase/server'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              Sift
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link
                href="/dashboard/account"
                className="text-muted-foreground hover:text-foreground"
              >
                Account
              </Link>
              <Link
                href="/dashboard/knowledge-base"
                className="text-muted-foreground hover:text-foreground"
              >
                Knowledge base
              </Link>
              <Link
                href="/dashboard/courses"
                className="text-muted-foreground hover:text-foreground"
              >
                Courses
              </Link>
              <Link
                href="/health"
                className="text-muted-foreground hover:text-foreground"
              >
                Health
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden text-sm sm:inline">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
