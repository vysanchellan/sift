'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { MagicLinkForm } from './magic-link-form'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'

export function AuthForm() {
  return (
    <Tabs defaultValue="sign-in">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">Sign in</TabsTrigger>
        <TabsTrigger value="sign-up">Sign up</TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in" className="space-y-4 pt-4">
        <SignInForm />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">or continue with</span>
          </div>
        </div>
        <MagicLinkForm />
      </TabsContent>
      <TabsContent value="sign-up" className="pt-4">
        <SignUpForm />
      </TabsContent>
    </Tabs>
  )
}
