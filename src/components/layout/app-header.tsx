import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Settings } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// Create a simple email sync service inline
class EmailSyncService {
  async syncEmails() {
    console.log('Syncing emails...')
    // Mock implementation
    return Promise.resolve()
  }
}

const emailSyncService = new EmailSyncService()

export function AppHeader() {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await emailSyncService.syncEmails()
      toast.success('Email sync completed')
    } catch (error) {
      toast.error('Email sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">GoKapital CRM</h1>
          <Badge variant="secondary">LiveDealUpdate</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Emails
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}