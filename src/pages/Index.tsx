import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { DealsDashboard } from '@/components/deals/deals-dashboard'
import { useEffect } from 'react'
import { emailSyncService } from '@/components/email-sync/email-sync-service'

export default function Index() {
  useEffect(() => {
    // Start auto-sync when component mounts
    emailSyncService.startAutoSync(15) // Sync every 15 minutes
    
    return () => {
      // Clean up on unmount
      emailSyncService.stopAutoSync()
    }
  }, [])

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