import { ReactNode } from "react";

import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { getPreference } from "@/server/server-actions";
import {
  SIDEBAR_VARIANT_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  CONTENT_LAYOUT_VALUES,
  type SidebarVariant,
  type SidebarCollapsible,
  type ContentLayout,
} from "@/types/preferences/layout";

import { DashboardShell } from "./_components/dashboard-shell";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const authToken = cookieStore.get("auth-token")?.value;

  // Get current user from session
  const currentUser = await getCurrentUser(authToken);

  // Prepare user data for components
  const userData = currentUser
    ? {
        id: currentUser.id,
        name: `${currentUser.nombre} ${currentUser.apellido}`,
        username: currentUser.username,
        email: currentUser.email ?? "",
        avatar: currentUser.avatar ?? "",
        role: "usuario", // You can add role to the user query if needed
      }
    : null;

  const [sidebarVariant, sidebarCollapsible, contentLayout] = await Promise.all([
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
  ]);

  const layoutPreferences = {
    contentLayout,
    variant: sidebarVariant,
    collapsible: sidebarCollapsible,
  };

  return (
    <DashboardShell defaultOpen={defaultOpen} userData={userData} layoutPreferences={layoutPreferences}>
      {children}
    </DashboardShell>
  );
}
