import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings, Cloud, Mail, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/components/language/language-provider'
import { LanguageToggle } from '@/components/language/language-toggle'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { logError } from '@/lib/error-log'
import { showSuccess, showError } from '@/utils/toast'
import { Input } from '@/components/ui/input'

export function AppHeader() {
  const [isSyncingCognito, setIsSyncingCognito] = useState(false)
  const [isSyncingGmail, setIsSyncingGmail] = useState(false)
  const [orgIdInput, setOrgIdInput] = useState<string>('')

  useEffect(() => {
    const fromEnv = (import.meta.env.VITE_COGNITO_ORG_ID as string | undefined)?.trim() || ''
    const fromStorage = (typeof window !== 'undefined' && window.localStorage.getItem('cognito_org_id')) || ''
    setOrgIdInput((fromStorage || fromEnv || '').trim())
  }, [])

  const { t } = useLanguage()
  const navigate = useNavigate()

  const saveOrgId = () => {
    const val = orgIdInput.trim()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cognito_org_id', val)
    }
    showSuccess(val ? 'Saved Cognito organization override' : 'Cleared Cognito organization override')
  }

  const handleOrgDiagnostic = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const orgOverride = orgIdInput.trim() || undefined

      logError({
        source: 'client',
        code: 'cognito_diagnostic_start',
        message: 'Running CognitoForms diagnostic',
        details: { orgOverride: !!orgOverride }
      })

      const { error, data } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'diagnostic', orgId: orgOverride }
      })
      if (error) throw error

      const orgId = (data as any)?.orgId ?? null
      const orgSource = (data as any)?.orgSource ?? 'unknown'
      const formsCount = (data as any)?.formsCount ?? 0
      const hasOrgInToken = !!(data as any)?.hasOrgInToken

      logError({
        source: 'client',
        code: 'cognito_diagnostic_success',
        message: 'Cognito diagnostic completed',
        details: { orgId, orgSource, formsCount, hasOrgInToken }
      })

      if (!orgId || formsCount === 0) {
        showError('Cognito diagnostic: org not accessible or no forms found — check the GUID or token permissions.')
      } else {
        showSuccess(`Cognito diagnostic: org ${orgSource} • ${formsCount} forms accessible`)
      }
    } catch (err: any) {
      logError({
        source: 'client',
        code: 'cognito_diagnostic_error',
        message: err?.message || 'Cognito diagnostic failed',
        details: { stack: err?.stack }
      })
      showError(err?.message || 'Cognito diagnostic failed')
    }
  }

  const handleManualSync = async () => {
    setIsSyncingCognito(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const orgOverride = orgIdInput.trim() || undefined

      logError({
        source: 'client',
        code: 'cognito_sync_start',
        message: 'Starting CognitoForms sync',
        details: { days: 30, orgOverride: !!orgOverride }
      })

      const { error, data } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { days: 30, action: 'bulk_sync', orgId: orgOverride }
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
        <div className="flex items-center gap-2">
          <Input
            value={orgIdInput}
            onChange={(e) => setOrgIdInput(e.target.value)}
            placeholder="Cognito org GUID or name"
            className="w-56"
          />
          <Button variant="outline" size="sm" onClick={saveOrgId} title="Save org override">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleOrgDiagnostic} title="Test org access">
            <RefreshCw className="h-4 w-4 mr-1" />
            Test Org
          </Button>
        </div>
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