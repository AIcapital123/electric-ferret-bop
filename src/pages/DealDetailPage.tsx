import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { DealDetail } from '@/components/deals/deal-detail'

export default function DealDetailPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <DealDetail />
      </main>
    </SidebarProvider>
  )
}