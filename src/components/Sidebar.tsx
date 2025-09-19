import { useLocation, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  Calculator,
  CheckSquare,
  StickyNote,
  Users,
  History,
  Info,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles?: ('admin' | 'teacher')[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile } = useAuthStore();
  const currentPath = location.pathname;

  const adminItems: SidebarItem[] = [
    {
      title: 'Create Purchase Sheet',
      icon: FileSpreadsheet,
      href: '/admin/create-purchase',
      roles: ['admin'],
    },
    {
      title: 'Compare Prices',
      icon: Calculator,
      href: '/admin/compare-prices',
      roles: ['admin'],
    },
    {
      title: 'Finalize Purchases',
      icon: CheckSquare,
      href: '/admin/finalize',
      roles: ['admin'],
    },
    {
      title: 'Manage Users',
      icon: Users,
      href: '/admin/users',
      roles: ['admin'],
    },
    {
      title: 'Purchase History',
      icon: History,
      href: '/admin/purchase-history',
      roles: ['admin'],
    },
    
  ];

  const teacherItems: SidebarItem[] = [
    {
      title: 'Book Requests',
      icon: BookOpen,
      href: '/teacher/book-requests',
      roles: ['teacher'],
    },
    {
      title: 'My Notes',
      icon: StickyNote,
      href: '/teacher/notes',
      roles: ['teacher'],
    },
  ];

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const shouldShowAdmin = profile?.role === 'admin';
  const shouldShowTeacher = profile?.role === 'teacher';
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
      collapsible="icon"
      variant="sidebar"
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Library</h2>
              <p className="text-xs text-sidebar-foreground/70">Dr. MCET</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className={getNavCls}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {shouldShowAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.href} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Teacher Section */}
        {shouldShowTeacher && (
          <SidebarGroup>
            <SidebarGroupLabel>Teacher Panel</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teacherItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.href} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

// Also export as default for compatibility
export default AppSidebar;