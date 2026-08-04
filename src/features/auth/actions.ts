'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { magicLinkSchema, signInSchema, signUpSchema } from './schemas'

export type AuthActionResult = { error?: string; message?: string }

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function signInWithPassword(input: {
  email: string
  password: string
}): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(input: {
  email: string
  password: string
}): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // When email confirmation is disabled, signUp returns a session immediately.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return { message: 'Check your email to confirm your account.' }
}

export async function signInWithMagicLink(input: { email: string }): Promise<AuthActionResult> {
  const parsed = magicLinkSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Check your email for the magic link.' }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/sign-in')
}
