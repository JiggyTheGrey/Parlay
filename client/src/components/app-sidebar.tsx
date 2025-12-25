import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Swords,
  Wallet,
  History,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Teams",
    url: "/teams",
    icon: Users,
  },
  {
    title: "Matches",
    url: "/matches",
    icon: Swords,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: Wallet,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-gradient">
            <span className="font-mono text-sm font-bold text-primary-foreground">PI</span>
          </div>
          <span className="font-bold text-lg text-primary-gradient">Parlay-it</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || location.startsWith(item.url + "/")}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/admin" || location.startsWith("/admin/")}
                  >
                    <Link href="/admin" data-testid="nav-admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="rounded-md bg-muted p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Balance</span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold">
            {parseFloat(user?.balance || "0").toFixed(4)} BTC
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
