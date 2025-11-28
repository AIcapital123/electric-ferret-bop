import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Home, DollarSign, Settings, BarChart3, HelpCircle, ListChecks, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '@/components/language/language-provider'
import { supabase } from '@/lib/supabase'

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const menuItems = [
    { title: t('nav_dashboard'), icon: Home, path: '/' },
    { title: t('nav_deals'), icon: DollarSign, path: '/deals' },
    { title: 'Tasks', icon: ListChecks, path: '/tasks' },
    { title: t('nav_analytics'), icon: BarChart3, path: '/analytics' },
    { title: t('nav_settings'), icon: Settings, path: '/settings' },
    { title: 'Help', icon: HelpCircle, path: '/help' },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer w-full"
            aria-label="Go to Dashboard"
          >
            <span className="text-white text-lg font-semibold tracking-wide">GoKapital CRM</span>
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                onClick={() => navigate(item.path)}
                isActive={item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
              isActive={false}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}