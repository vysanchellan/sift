'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

import { signInWithPassword } from '../actions'
import { signInSchema, type SignInInput } from '../schemas'

export function SignInForm() {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  function onSubmit(data: SignInInput) {
    startTransition(async () => {
      const result = await signInWithPassword(data)
      if (result?.error) {
        toast({ title: 'Sign in failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'signin-email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="signin-email-error" className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'signin-password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p id="signin-password-error" className="text-destructive text-sm" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
