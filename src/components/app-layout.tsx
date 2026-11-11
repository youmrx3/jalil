import type { ReactNode } from "react";
import { Moon, Sun, Database } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./app-sidebar";
import { useApp } from "@/lib/store";
import { useThemeSync } from "@/lib/theme";
import { toast } from "sonner";

export function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  useThemeSync();
  const theme = useApp((s) => s.settings.theme);
  const updateSettings = useApp((s) => s.updateSettings);
  const seedDemo = useApp((s) => s.seedDemo);
  const hasData = useApp((s) => s.products.length + s.orders.length + s.clients.length > 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur px-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <h1 className="text-base font-semibold truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-1">
              {!hasData && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    seedDemo();
                    toast.success("Demo data loaded");
                  }}
                >
                  <Database className="h-4 w-4 mr-1" /> Load demo
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => updateSettings({ theme: theme === "dark" ? "light" : "dark" })}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
