"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, PowerOff, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccountDialog } from "./account-dialog";
import { getBankAccounts, toggleBankAccountStatus } from "../actions";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BankAccountsSheetProps {
  bank: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankAccountsSheet({ bank, open, onOpenChange }: BankAccountsSheetProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<any>(null);

  useEffect(() => {
    if (open && bank) {
      loadAccounts();
    }
  }, [open, bank]);

  async function loadAccounts() {
    if (!bank) return;
    setLoading(true);
    const res = await getBankAccounts(bank.id);
    if (res.success && res.data) {
      setAccounts(res.data);
    } else {
      toast.error("Error al cargar las cuentas");
    }
    setLoading(false);
  }

  function handleAddAccount() {
    setAccountToEdit(null);
    setShowAccountDialog(true);
  }

  function handleEditAccount(account: any) {
    setAccountToEdit(account);
    setShowAccountDialog(true);
  }

  async function handleToggleStatus(account: any) {
    const res = await toggleBankAccountStatus(account.id, account.activo);
    if (res.success) {
      toast.success(`Cuenta ${account.activo ? "desactivada" : "activada"} correctamente`);
      loadAccounts();
    } else {
      toast.error("Error al cambiar el estado");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[700px]">
          <SheetHeader className="mb-6">
            <SheetTitle>Cuentas Bancarias - {bank?.nombre}</SheetTitle>
            <SheetDescription>Administra las cuentas bancarias asociadas a este banco.</SheetDescription>
          </SheetHeader>

          <div className="mb-4 flex justify-end">
            <Button onClick={handleAddAccount} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cuenta
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Cuenta Contable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                        No hay cuentas registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium">{acc.numeroCuenta}</TableCell>
                        <TableCell className="capitalize">{acc.tipoCuenta}</TableCell>
                        <TableCell>{acc.moneda}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">{acc.cuentasContable?.codigo}</span>
                            <span className="max-w-[150px] truncate text-sm">{acc.cuentasContable?.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={acc.activo ? "default" : "secondary"}>
                            {acc.activo ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditAccount(acc)}>
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
                                      acc.activo
                                        ? "text-red-500 hover:text-red-600"
                                        : "text-green-500 hover:text-green-600"
                                    }
                                    onClick={() => handleToggleStatus(acc)}
                                  >
                                    {acc.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{acc.activo ? "Desactivar" : "Activar"}</TooltipContent>
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
          )}
        </SheetContent>
      </Sheet>

      <AccountDialog
        open={showAccountDialog}
        onOpenChange={setShowAccountDialog}
        bankId={bank?.id}
        accountToEdit={accountToEdit}
        onSuccess={loadAccounts}
      />
    </>
  );
}
