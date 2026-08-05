import type { Metadata } from 'next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/features/auth/components/auth-form'

export const metadata: Metadata = {
  title: 'Sign in · Sift',
  description: 'Sign in or create an account to continue.',
}

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl tracking-tight">Sift</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </div>
  )
}