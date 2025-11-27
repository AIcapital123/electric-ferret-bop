import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as any)?.from || '/'

  const handleUseTestAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-test-account', {
        method: 'POST',
      })
      if (error) {
        toast.error(error.message || 'Failed to create test account')
        return
      }
      const resp = data as {
        success: boolean
        session?: { access_token: string; refresh_token: string }
        error?: string
      }
      if (!resp.success || !resp.session?.access_token || !resp.session?.refresh_token) {
        toast.error(resp.error || 'Failed to create test account')
        return
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: resp.session.access_token,
        refresh_token: resp.session.refresh_token,
      })
      if (setErr) {
        toast.error(setErr.message || 'Failed to start session')
        return
      }

      toast.success('Signed in with Test Account')
      navigate(redirectTo, { replace: true })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to use test account')
    }
  }

  useEffect(() => {
    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) navigate(redirectTo, { replace: true })
    }
    sync()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate(redirectTo, { replace: true })
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [navigate, redirectTo])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">GoKapital CRM Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex justify-center">
            <Button variant="secondary" onClick={handleUseTestAccount}>
              Use Test Account
            </Button>
          </div>
          <Auth
            supabaseClient={supabase}
            providers={['google']}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Password',
                }
              }
            }}
          />
          <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
            <p><strong>Admin:</strong> chris@gokapital.com, deals@gokapital.com, info@gokapital.com</p>
            <p>GoKapital emails get edit access; others get view-only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}