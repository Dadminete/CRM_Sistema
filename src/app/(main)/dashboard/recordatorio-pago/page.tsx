import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/auth";

import PaymentReminderEditor from "./payment-reminder-editor";

export default async function PaymentReminderSettingsPage() {
  const cookieStore = await cookies();
  const currentUser = await getCurrentUser(cookieStore.get("auth-token")?.value);

  if (!currentUser) redirect("/auth/v2/login?redirect=/dashboard/recordatorio-pago");

  const canEdit = await checkPermission(currentUser.id, "configuracion_sistema");
  if (!canEdit) redirect("/unauthorized");

  return <PaymentReminderEditor />;
}
