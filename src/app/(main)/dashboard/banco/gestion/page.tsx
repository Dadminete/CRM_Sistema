import { Metadata } from "next";
import { getBanks } from "./actions";
import { BankList } from "./_components/bank-list";

export const metadata: Metadata = {
  title: "Gestión de Banco",
  description: "Administración de Bancos y Cuentas Bancarias",
};

export default async function GestionBancoPage() {
  const { data: banks } = await getBanks();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Bancos</h1>
          <p className="text-muted-foreground">Administra los bancos y sus cuentas bancarias asociadas.</p>
        </div>
      </div>

      <BankList initialBanks={banks || []} />
    </div>
  );
}
