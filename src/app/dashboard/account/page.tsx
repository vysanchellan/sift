import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The profiles table may not be applied to the hosted project yet; degrade
  // gracefully to auth metadata if it is missing.
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('username, full_name, plan, created_at')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-sand-500 dark:text-sand-400">Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt className="text-sand-500 dark:text-sand-400">Full name</dt>
              <dd>{profile?.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sand-500 dark:text-sand-400">Username</dt>
              <dd>{profile?.username ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sand-500 dark:text-sand-400">Plan</dt>
              <dd className="capitalize">{profile?.plan ?? 'free'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of this device</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  )
}