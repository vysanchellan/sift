'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

import { signInWithMagicLink } from '../actions'
import { magicLinkSchema, type MagicLinkInput } from '../schemas'

export function MagicLinkForm() {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
  })

  function onSubmit(data: MagicLinkInput) {
    startTransition(async () => {
      const result = await signInWithMagicLink(data)
      if (result?.error) {
        toast({ title: 'Magic link failed', description: result.error, variant: 'destructive' })
      } else if (result?.message) {
        toast({ title: 'Check your email', description: result.message, variant: 'success' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'magic-email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="magic-email-error" className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? 'Sending link...' : 'Continue with a magic link'}
      </Button>
    </form>
  )
}