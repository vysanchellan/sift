'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

import { signUp } from '../actions'
import { signUpSchema, type SignUpInput } from '../schemas'

export function SignUpForm() {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  function onSubmit(data: SignUpInput) {
    startTransition(async () => {
      const result = await signUp(data)
      if (result?.error) {
        toast({ title: 'Sign up failed', description: result.error, variant: 'destructive' })
      } else if (result?.message) {
        toast({ title: 'Account created', description: result.message, variant: 'success' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="signup-email-error" className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'signup-password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p id="signup-password-error" className="text-destructive text-sm" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p id="signup-confirm-error" className="text-destructive text-sm" role="alert">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}