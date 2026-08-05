'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/account', label: 'Account' },
  { href: '/dashboard/knowledge-base', label: 'Knowledge base' },
  { href: '/dashboard/courses', label: 'Courses' },
  { href: '/health', label: 'Health' },
]

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/dashboard" className="font-display font-bold text-lg tracking-tight">
          Sift
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            Get a Quote
          </Button>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b bg-background/95 backdrop-blur"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 p-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    pathname === link.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {children}
    </Link>
  )
}