import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings, Cloud, Mail } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/components/language/language-provider'
import { LanguageToggle } from '@/components/language/language-toggle'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { logError } from '@/lib/error-log'
import { showSuccess, showError } from '@/utils/toast'

export function AppHeader() {
  const [isSyncingCognito, setIsSyncingCognito] = useState(false)
  const [isSyncingGmail, setIsSyncingGmail] = useState(false)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleManualSync = async () => {
    setIsSyncingCognito(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      logError({
        source: 'client',
        code: 'cognito_sync_start',
        message: 'Starting CognitoForms sync',
        details: { days: 30 }
      })

      const { error, data } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { days: 30, action: 'bulk_sync' }
      })
      if (error) throw error
      const processed = (data as any)?.processed ?? 0
      const created = (data as any)?.created ?? 0
      const updated = (data as any)?.updated ?? 0
      const replacedSource = (data as any)?.replacedSource ?? null

      logError({
        source: 'client',
        code: 'cognito_sync_success',
        message: 'CognitoForms sync completed',
        details: { processed, created, updated, replacedSource, data }
      })

      showSuccess(
        `Cognito sync completed • ${processed} processed, ${created} created, ${updated} updated${replacedSource ? ` • replaced ${replacedSource}` : ''}`
      )
    } catch (error: any) {
      logError({
        source: 'client',
        code: 'cognito_sync_error',
        message: error?.message || 'Cognito sync failed',
        details: { stack: error?.stack }
      })
      showError(error?.message || 'Cognito sync failed')
    } finally {
      setIsSyncingCognito(false)
    }
  }

  const handleGmailSync = async () => {
    setIsSyncingGmail(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      logError({
        source: 'client',
        code: 'gmail_sync_start',
        message: 'Starting Gmail sync',
        details: {}
      })

      const { error, data } = await supabase.functions.invoke('sync-gmail', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {}
      })
      if (error) throw error
      const processed = (data as any)?.processed ?? 0
      const skipped = (data as any)?.skipped ?? 0
      const total = (data as any)?.total ?? 0
      const replacedSource = (data as any)?.replacedSource ?? null

      logError({
        source: 'client',
        code: 'gmail_sync_success',
        message: 'Gmail sync completed',
        details: { processed, skipped, total, replacedSource, data }
      })

      showSuccess(
        `Gmail sync completed • ${processed} new, ${skipped} skipped${replacedSource ? ` • replaced ${replacedSource}` : ''}`
      )
    } catch (error: any) {
      logError({
        source: 'client',
        code: 'gmail_sync_error',
        message: error?.message || 'Gmail sync failed',
        details: { stack: error?.stack }
      })
      showError(error?.message || 'Gmail sync failed')
    } finally {
      setIsSyncingGmail(false)
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-muted bg-background px-4">
      <SidebarTrigger />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide text-green-600">GoKapital CRM</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Button
          onClick={handleManualSync}
          disabled={isSyncingCognito}
          variant="default"
          size="sm"
        >
          <Cloud className={`h-4 w-4 mr-2 ${isSyncingCognito ? 'animate-spin' : ''}`} />
          Sync CognitoForms
        </Button>
        <Button
          onClick={handleGmailSync}
          disabled={isSyncingGmail}
          variant="default"
          size="sm"
        >
          <Mail className={`h-4 w-4 mr-2 ${isSyncingGmail ? 'animate-spin' : ''}`} />
          Sync Gmail
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}