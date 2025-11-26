import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { DealsDashboard } from '@/components/deals/deals-dashboard'
import { useEffect } from 'react'
import { emailSyncService } from '@/components/email-sync/email-sync-service'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language/language-provider'
import { useNavigate } from 'react-router-dom'

export default function Index() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
    // Start auto-sync when component mounts
    emailSyncService.startAutoSync(15) // Sync every 15 minutes

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { parsed?: any; receivedAt?: string }
      const name = detail?.parsed?.client_name || 'New Applicant'
      toast.success(`${t('new_app_in')}: ${name}`, {
        action: {
          label: t('open_dashboard'),
          onClick: () => navigate('/'),
        },
      })
    }

    window.addEventListener('new-application', handler as EventListener)
    
    return () => {
      // Clean up on unmount
      emailSyncService.stopAutoSync()
      window.removeEventListener('new-application', handler as EventListener)
    }
  }, [navigate, t])

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <DealsDashboard />
      </main>
    </SidebarProvider>
  )
}