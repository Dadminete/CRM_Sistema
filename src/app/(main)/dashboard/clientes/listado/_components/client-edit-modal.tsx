"use client";

import { BadgeCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: string;
  tipoCliente: string;
  categoriaCliente: string;
  fotoUrl: string | null;
  createdAt: string;
}

interface FormData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  estado: string;
}

interface ClientEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  formData: FormData;
  setFormData: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ClientEditModal({
  isOpen,
  onOpenChange,
  isSubmitting,
  formData,
  setFormData,
  onSubmit,
}: ClientEditModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Datos del Cliente</DialogTitle>
          <DialogDescription>
            Actualiza la información personal y de contacto del cliente de forma segura.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Nombres
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="border-muted-foreground/20 focus:border-primary h-10"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="apellidos"
                className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
              >
                Apellidos
              </Label>
              <Input
                id="apellidos"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                required
                className="border-muted-foreground/20 focus:border-primary h-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-muted-foreground/20 focus:border-primary h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Teléfono Movíl
            </Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="border-muted-foreground/20 focus:border-primary h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Dirección Residencial
            </Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="border-muted-foreground/20 focus:border-primary h-10"
            />
          </div>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="shadow-primary/10 h-11 w-full text-sm font-bold shadow-lg"
            >
              {isSubmitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="mr-2 h-4 w-4" />
              )}
              Guardar Actualización
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
