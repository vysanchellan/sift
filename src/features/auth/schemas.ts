import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z
  .object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const magicLinkSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type MagicLinkInput = z.infer<typeof magicLinkSchema>
