"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BankFormValues, bankSchema } from "../schema";
import { createBank, updateBank } from "../actions";
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

interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankToEdit?: any;
  onSuccess: () => void;
}

export function BankDialog({ open, onOpenChange, bankToEdit, onSuccess }: BankDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      nombre: "",
      codigo: "",
      activo: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (bankToEdit) {
        form.reset({
          nombre: bankToEdit.nombre,
          codigo: bankToEdit.codigo || "",
          activo: bankToEdit.activo,
        });
      } else {
        form.reset({
          nombre: "",
          codigo: "",
          activo: true,
        });
      }
    }
  }, [open, bankToEdit, form]);

  async function onSubmit(data: BankFormValues) {
    setIsSubmitting(true);
    try {
      let result;
      if (bankToEdit) {
        result = await updateBank(bankToEdit.id, data);
      } else {
        result = await createBank(data);
      }

      if (result.success) {
        toast.success(bankToEdit ? "Banco actualizado exitosamente" : "Banco creado exitosamente");
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
          <DialogTitle>{bankToEdit ? "Editar Banco" : "Nuevo Banco"}</DialogTitle>
          <DialogDescription>
            {bankToEdit
              ? "Modifica los detalles del banco seleccionado."
              : "Ingresa la información para registrar un nuevo banco."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Banco</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Banco Popular" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. BPD" {...field} />
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
