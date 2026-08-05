'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <header className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 fixed top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
        <Link
          href="/dashboard"
          className="text-foreground font-serif text-2xl font-normal tracking-wide"
        >
          Sift
        </Link>

        <nav className="hidden items-center gap-4 md:flex" aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="border-border text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md border p-2 transition-colors md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="border-border bg-background/95 border-b backdrop-blur md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 p-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    pathname === link.href
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
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
      aria-current={active ? 'page' : undefined}
      className={`relative px-2 py-1 text-sm font-medium tracking-wide transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="bg-primary absolute inset-x-2 -bottom-2 h-[2px]"
        />
      )}
    </Link>
  )
}
