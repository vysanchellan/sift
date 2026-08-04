import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/components/query-provider'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
