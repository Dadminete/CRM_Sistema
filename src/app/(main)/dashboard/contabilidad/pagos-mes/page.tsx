import { redirect } from "next/navigation";

export default function PagosMesRedirectPage() {
  redirect("/dashboard/facturas/pagos-mes");
}
