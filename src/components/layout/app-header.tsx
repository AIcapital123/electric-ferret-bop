import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Settings } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { emailSyncService } from '@/components/email-sync/email-sync-service'
import { useLanguage } from '@/components/language/language-provider'
import { LanguageToggle } from '@/components/language/language-toggle'

export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false)
  const { t } = useLanguage()

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await emailSyncService.syncEmails()
      toast.success(t('refresh'))
    } catch (error) {
      toast.error('Email sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b border-primary bg-primary px-4 text-primary-foreground">
      <SidebarTrigger />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">GoKapital</h1>
          <Badge variant="secondary">{t('live_badge')}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {t('sync_emails')}
        </Button>
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-primary-foreground">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}