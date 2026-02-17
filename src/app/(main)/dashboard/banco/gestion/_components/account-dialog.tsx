"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BankAccountFormValues, bankAccountSchema } from "../schema";
import { createBankAccount, updateBankAccount, getAccountingAccounts } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankId: string;
  accountToEdit?: any; // Replace with proper type from Prisma if available
  onSuccess: () => void;
}

export function AccountDialog({ open, onOpenChange, bankId, accountToEdit, onSuccess }: AccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountingAccounts, setAccountingAccounts] = useState<any[]>([]);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      numeroCuenta: "",
      tipoCuenta: "corriente",
      moneda: "DOP",
      nombreOficialCuenta: "",
      cuentaContableId: "",
      activo: true,
      observaciones: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (accountToEdit) {
        form.reset({
          numeroCuenta: accountToEdit.numeroCuenta,
          tipoCuenta: accountToEdit.tipoCuenta || "corriente",
          moneda: accountToEdit.moneda || "DOP",
          nombreOficialCuenta: accountToEdit.nombreOficialCuenta || "",
          cuentaContableId: accountToEdit.cuentaContableId,
          activo: accountToEdit.activo,
          observaciones: accountToEdit.observaciones || "",
        });
      } else {
        form.reset({
          numeroCuenta: "",
          tipoCuenta: "corriente",
          moneda: "DOP",
          nombreOficialCuenta: "",
          cuentaContableId: "",
          activo: true,
          observaciones: "",
        });
      }
      loadAccountingAccounts();
    }
  }, [open, accountToEdit, form]);

  async function loadAccountingAccounts() {
    const res = await getAccountingAccounts();
    if (res.success && res.data) {
      setAccountingAccounts(res.data);
    }
  }

  async function onSubmit(data: BankAccountFormValues) {
    setIsSubmitting(true);
    try {
      let result;
      if (accountToEdit) {
        result = await updateBankAccount(accountToEdit.id, data);
      } else {
        result = await createBankAccount(bankId, data);
      }

      if (result.success) {
        toast.success(accountToEdit ? "Cuenta actualizada exitosamente" : "Cuenta creada exitosamente");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{accountToEdit ? "Editar Cuenta Bancaria" : "Nueva Cuenta Bancaria"}</DialogTitle>
          <DialogDescription>
            {accountToEdit
              ? "Modifica los datos de la cuenta bancaria aquí."
              : "Ingresa los datos para registrar una nueva cuenta bancaria."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numeroCuenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Cuenta</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoCuenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corriente">Corriente</SelectItem>
                        <SelectItem value="ahorro">Ahorro</SelectItem>
                        <SelectItem value="nomina">Nómina</SelectItem>
                        <SelectItem value="prestamo">Préstamo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombreOficialCuenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Oficial (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Cuenta Operativa Principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cuentaContableId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta Contable</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta contable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {accountingAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.codigo} - {acc.nombre} ({acc.moneda})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
