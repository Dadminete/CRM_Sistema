"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Power, PowerOff, CreditCard } from "lucide-react";
import { BankDialog } from "./bank-dialog";
import { BankAccountsSheet } from "./bank-accounts-sheet";
import { toggleBankStatus } from "../actions";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BankListProps {
  initialBanks: any[];
}

export function BankList({ initialBanks }: BankListProps) {
  const router = useRouter();
  const [banks, setBanks] = useState(initialBanks);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [bankToEdit, setBankToEdit] = useState<any>(null);

  const [showAccountsSheet, setShowAccountsSheet] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);

  // This function is passed to BankDialog to refresh the list (in a real app you might reload the page or re-fetch)
  // Since we are using server actions with revalidatePath, the page data will refresh on next navigation/refresh.
  // But for immediate UI update without full reload, we might want to manually update or rely on router.refresh().
  // Here for simplicity, we'll let the parent Page component handle data fetching or use router.refresh in the dialog onSuccess if needed.
  // Actually, better to just rely on Next.js Server Actions revalidation and router.refresh().
  // But since this is a client component receiving props, props won't update automatically unless parent re-renders.
  // We can use router.refresh() in the dialogs.

  // Update local state when initialBanks changes (e.g. after router.refresh())
  // This is important because the server component re-renders and passes new props
  if (initialBanks !== banks) {
    setBanks(initialBanks);
  }

  function handleEdit(bank: any) {
    setBankToEdit(bank);
    setShowBankDialog(true);
  }

  function handleNew() {
    setBankToEdit(null);
    setShowBankDialog(true);
  }

  function handleManageAccounts(bank: any) {
    setSelectedBank(bank);
    setShowAccountsSheet(true);
  }

  async function handleToggleStatus(bank: any) {
    const res = await toggleBankStatus(bank.id, bank.activo);
    if (res.success) {
      toast.success(`Banco ${bank.activo ? "desactivado" : "activado"} correctamente`);
      router.refresh();
    } else {
      toast.error("Error al cambiar el estado");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>Nuevo Banco</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Cuentas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No hay bancos registrados.
                </TableCell>
              </TableRow>
            ) : (
              banks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.nombre}</TableCell>
                  <TableCell>{bank.codigo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{bank._count?.cuentas || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bank.activo ? "default" : "secondary"}>{bank.activo ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleManageAccounts(bank)}>
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Gestionar Cuentas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(bank)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={
                                bank.activo ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"
                              }
                              onClick={() => handleToggleStatus(bank)}
                            >
                              {bank.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{bank.activo ? "Desactivar" : "Activar"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BankDialog
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        bankToEdit={bankToEdit}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <BankAccountsSheet bank={selectedBank} open={showAccountsSheet} onOpenChange={setShowAccountsSheet} />
    </div>
  );
}
