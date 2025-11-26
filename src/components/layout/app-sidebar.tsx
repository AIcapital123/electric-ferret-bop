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
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer w-full"
            aria-label="Go to Dashboard"
          >
            <div
              className="h-12 w-full bg-white md:h-14"
              style={{
                WebkitMaskImage: 'url(/gokapital-logo.png)',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskImage: 'url(/gokapital-logo.png)',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'contain',
              }}
            />
          </button>
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