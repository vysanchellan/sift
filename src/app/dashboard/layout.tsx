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
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Sift
            </Link>
            <nav className="flex gap-1 text-sm" aria-label="Main navigation">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/dashboard/account">Account</NavLink>
              <NavLink href="/dashboard/knowledge-base">Knowledge base</NavLink>
              <NavLink href="/dashboard/courses">Courses</NavLink>
              <NavLink href="/health">Health</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user?.email}
            </span>
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

function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}