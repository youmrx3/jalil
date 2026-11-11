import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  Store,
  Briefcase,
  Palette,
  Calculator,
  Rocket,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";
import { useApp } from "@/lib/store";

const dashboards = [
  { title: "General", url: "/nexus", icon: LayoutDashboard },
  { title: "E-commerce", url: "/ecom", icon: Store },
  { title: "B2B Agency", url: "/b2b", icon: Briefcase },
];

const business = [
  { title: "Products & Stock", url: "/products", icon: Package },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Ad Calculators", url: "/calculators", icon: Calculator },
  { title: "B2B Clients", url: "/clients", icon: Users },
  { title: "Branding", url: "/branding", icon: Palette },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const config = [
  { title: "Zoric Commerce OS", url: "/zoric", icon: Rocket },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const companyName = useApp((s) => s.settings.companyName);

  const renderGroup = (label: string, items: typeof dashboards) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" style={{ background: "var(--gradient-sidebar)" }}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-9 w-9 rounded-lg overflow-hidden ring-1 ring-white/10 shrink-0"
               style={{ background: "var(--gradient-primary)" }}>
            <img src={logo} alt="Logo" className="h-full w-full object-cover" width={36} height={36} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold leading-tight truncate">{companyName}</span>
              <span className="text-[10px] text-sidebar-foreground/60">Business Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Dashboards", dashboards)}
        {renderGroup("Business", business)}
        {renderGroup("System", config)}
      </SidebarContent>
    </Sidebar>
  );
}
