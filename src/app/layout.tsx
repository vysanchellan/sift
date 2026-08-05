import type { Metadata } from 'next'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/query-provider'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
})

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Sift',
  description: 'Turn Reddit discussions into structured, scored knowledge.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}