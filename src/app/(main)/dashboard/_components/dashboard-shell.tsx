import { ReactNode } from "react";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { type SidebarVariant, type SidebarCollapsible, type ContentLayout } from "@/types/preferences/layout";

import { NotificationMenu } from "./notification-menu";
import { SessionLockScreen } from "./session-lock-screen";
import { AccountSwitcher } from "./sidebar/account-switcher";
import { LayoutControls } from "./sidebar/layout-controls";
import { SearchDialog } from "./sidebar/search-dialog";
import { ThemeSwitcher } from "./sidebar/theme-switcher";

type DashboardShellProps = {
  children: ReactNode;
  defaultOpen: boolean;
  userData: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
  } | null;
  layoutPreferences: {
    contentLayout: ContentLayout;
    variant: SidebarVariant;
    collapsible: SidebarCollapsible;
  };
};

export async function DashboardShell({ children, defaultOpen, userData, layoutPreferences }: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant={layoutPreferences.variant} collapsible={layoutPreferences.collapsible} user={userData} />
      <SidebarInset
        data-content-layout={layoutPreferences.contentLayout}
        className={cn(
          "data-[content-layout=centered]:!mx-auto data-[content-layout=centered]:max-w-screen-2xl",
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <SessionLockScreen>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                <SearchDialog />
              </div>
              <div className="flex items-center gap-2">
                <LayoutControls {...layoutPreferences} />
                <NotificationMenu />
                <ThemeSwitcher />
                {userData && <AccountSwitcher users={[userData]} />}
              </div>
            </div>
          </header>
          <div className="h-full p-4 md:p-6">{children}</div>
        </SessionLockScreen>
      </SidebarInset>
    </SidebarProvider>
  );
}
