import React from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'

export default function TasksPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground mt-2">Task management coming soon.</p>
        </div>
      </main>
    </SidebarProvider>
  )
}