import React from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { DealsDashboard } from '@/components/deals/deals-dashboard'

export default function Index() {
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