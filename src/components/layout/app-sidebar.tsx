import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Home, DollarSign, Settings, BarChart3 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { title: 'Dashboard', icon: Home, path: '/' },
    { title: 'Deals', icon: DollarSign, path: '/deals' },
    { title: 'Analytics', icon: BarChart3, path: '/analytics' },
    { title: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-3">
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                onClick={() => navigate(item.path)}
                isActive={location.pathname === item.path}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}