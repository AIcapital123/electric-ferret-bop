import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings, Cloud } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language/language-provider'
import { LanguageToggle } from '@/components/language/language-toggle'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const { error, data } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}`, 'x-days': '30' },
        method: 'GET'
      })
      if (error) throw error
      const processed = (data as any)?.processed ?? 0
      const skipped = (data as any)?.skipped ?? 0
      const errors = (data as any)?.errors ?? 0
      toast.success(`Sync completed • Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`)
    } catch (error: any) {
      toast.error(error?.message || 'Cognito sync failed')
    } finally {
      setIsSyncing(false)
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
          disabled={isSyncing}
          variant="default"
          size="sm"
        >
          <Cloud className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync CognitoForms
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}