"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Wifi, DollarSign, ArrowUpDown } from "lucide-react";

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  precio: string;
  moneda: string;
  subidaKbps: number;
  bajadaMbps: number;
  detalles: any;
  activo: boolean;
  orden: number;
}

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  activo: boolean;
  orden: number;
}

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

export function PlanFormModal({ isOpen, onClose, plan }: PlanFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoriaId: "",
    precio: "",
    moneda: "DOP",
    subidaKbps: "",
    bajadaMbps: "",
    activo: true,
    orden: "0",
  });

  // Cargar categorías
  useEffect(() => {
    const fetchCategorias = async () => {
      setIsLoadingCategorias(true);
      try {
        const res = await fetch("/api/categorias");
        const data = await res.json();

        if (data.success) {
          setCategorias(data.data.categorias);
        } else {
          toast.error("Error al cargar categorías");
        }
      } catch (error) {
        toast.error("Error de conexión");
      } finally {
        setIsLoadingCategorias(false);
      }
    };

    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen]);

  // Cargar datos del plan si estamos editando
  useEffect(() => {
    if (plan) {
      setFormData({
        nombre: plan.nombre,
        descripcion: plan.descripcion || "",
        categoriaId: plan.categoriaId,
        precio: plan.precio,
        moneda: plan.moneda,
        subidaKbps: plan.subidaKbps.toString(),
        bajadaMbps: plan.bajadaMbps.toString(),
        activo: plan.activo,
        orden: plan.orden.toString(),
      });
    } else {
      // Reset form si estamos creando
      setFormData({
        nombre: "",
        descripcion: "",
        categoriaId: "",
        precio: "",
        moneda: "DOP",
        subidaKbps: "",
        bajadaMbps: "",
        activo: true,
        orden: "0",
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones básicas
      if (!formData.nombre.trim()) {
        toast.error("El nombre es requerido");
        setIsSubmitting(false);
        return;
      }

      if (!formData.categoriaId) {
        toast.error("La categoría es requerida");
        setIsSubmitting(false);
        return;
      }

      if (!formData.precio || parseFloat(formData.precio) <= 0) {
        toast.error("El precio debe ser mayor a 0");
        setIsSubmitting(false);
        return;
      }

      if (!formData.subidaKbps || parseInt(formData.subidaKbps) <= 0) {
        toast.error("La velocidad de subida debe ser mayor a 0");
        setIsSubmitting(false);
        return;
      }

      if (!formData.bajadaMbps || parseInt(formData.bajadaMbps) <= 0) {
        toast.error("La velocidad de bajada debe ser mayor a 0");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        categoriaId: formData.categoriaId,
        precio: formData.precio,
        moneda: formData.moneda,
        subidaKbps: parseInt(formData.subidaKbps),
        bajadaMbps: parseInt(formData.bajadaMbps),
        activo: formData.activo,
        orden: parseInt(formData.orden) || 0,
      };

      const url = plan ? `/api/planes/${plan.id}` : "/api/planes";
      const method = plan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(plan ? "Plan actualizado exitosamente" : "Plan creado exitosamente");
        onClose();
      } else {
        toast.error(data.error || "Error al guardar plan");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Wifi className="text-primary h-5 w-5" />
            {plan ? "Editar Plan" : "Nuevo Plan"}
          </DialogTitle>
          <DialogDescription>
            {plan
              ? "Actualiza los detalles del plan de internet"
              : "Crea un nuevo plan de internet con sus características"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Información Básica
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wider">
                  Nombre del Plan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Plan Básico 20 Mbps"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoriaId" className="text-xs font-bold uppercase tracking-wider">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.categoriaId} onValueChange={(val) => setFormData({ ...formData, categoriaId: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCategorias ? (
                      <div className="p-2 text-center text-sm text-slate-500">Cargando...</div>
                    ) : categorias.length === 0 ? (
                      <div className="p-2 text-center text-sm text-slate-500">No hay categorías disponibles</div>
                    ) : (
                      categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-xs font-bold uppercase tracking-wider">
                Descripción
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Describe las características y beneficios del plan..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          {/* Velocidades */}
          <div className="space-y-4 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <ArrowUpDown className="h-4 w-4" />
              Velocidades
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bajadaMbps" className="text-xs font-bold uppercase tracking-wider">
                  Velocidad de Bajada (Mbps) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="bajadaMbps"
                    type="number"
                    placeholder="Ej: 20"
                    value={formData.bajadaMbps}
                    onChange={(e) => setFormData({ ...formData, bajadaMbps: e.target.value })}
                    className="h-10 pr-16"
                    min="1"
                    required
                  />
                  <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                    Mbps
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">Velocidad de descarga</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subidaKbps" className="text-xs font-bold uppercase tracking-wider">
                  Velocidad de Subida (Kbps) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="subidaKbps"
                    type="number"
                    placeholder="Ej: 2048"
                    value={formData.subidaKbps}
                    onChange={(e) => setFormData({ ...formData, subidaKbps: e.target.value })}
                    className="h-10 pr-16"
                    min="1"
                    required
                  />
                  <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                    Kbps
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">Velocidad de carga</p>
              </div>
            </div>
          </div>

          {/* Precio y Configuración */}
          <div className="space-y-4 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <DollarSign className="h-4 w-4" />
              Precio y Configuración
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio" className="text-xs font-bold uppercase tracking-wider">
                  Precio Mensual <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 995.00"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  className="h-10"
                  min="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moneda" className="text-xs font-bold uppercase tracking-wider">
                  Moneda
                </Label>
                <Select value={formData.moneda} onValueChange={(val) => setFormData({ ...formData, moneda: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOP">DOP (Peso Dominicano)</SelectItem>
                    <SelectItem value="USD">USD (Dólar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orden" className="text-xs font-bold uppercase tracking-wider">
                  Orden de Visualización
                </Label>
                <Input
                  id="orden"
                  type="number"
                  placeholder="0"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                  className="h-10"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-white p-4 dark:bg-slate-950">
              <div className="space-y-0.5">
                <Label htmlFor="activo" className="text-sm font-bold">
                  Plan Activo
                </Label>
                <p className="text-muted-foreground text-xs">El plan estará disponible para nuevas suscripciones</p>
              </div>
              <Switch id="activo" checked={formData.activo} onCheckedChange={(val) => setFormData({ ...formData, activo: val })} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {plan ? "Actualizar Plan" : "Crear Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
