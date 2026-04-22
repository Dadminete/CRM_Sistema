"use client";

import { useState } from "react";

import { BadgeCheck, RefreshCw, Upload, X, User, MapPin, Contact, Settings } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface FormData {
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  celular: string;
  email: string;
  direccion: string;
  tipoCliente: string;
  categoria: string;
  sector: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  coordenadas: string;
  limiteCredito: string;
  diasCredito: string;
  descuentoCliente: string;
  sexo: string;
  ocupacion: string;
  nombreEmpresa: string;
  referenciaPersonal: string;
  observaciones: string;
  activo: boolean;
  aceptaPromociones: boolean;
  fotoUrl: string;
  estado: string; // Maintain compatibility with existing page.tsx PATCH logic
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
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/infra/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, fotoUrl: data.url });
        toast.success("Foto cargada correctamente");
      } else {
        toast.error(data.error || "Error al subir la imagen");
      }
    } catch (error) {
      toast.error("Error de conexión al subir imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, fotoUrl: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="bg-muted/10 border-b p-6">
          <DialogTitle className="text-2xl font-bold">Editar Perfil del Cliente</DialogTitle>
          <DialogDescription>Sincroniza y actualiza toda la información operativa del cliente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col overflow-hidden">
          <ScrollArea className="max-h-[calc(95vh-180px)] overflow-y-auto px-6 py-4">
            <div className="flex flex-col items-center gap-6 pb-6 md:flex-row md:items-start">
              <div className="group relative flex flex-col items-center gap-2">
                <Avatar className="ring-primary/10 h-32 w-32 border-4 border-white shadow-xl ring-2">
                  <AvatarImage src={formData.fotoUrl} className="object-cover" />
                  <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">
                    {formData.nombre?.[0]}
                    {formData.apellidos?.[0]}
                  </AvatarFallback>
                </Avatar>
                {formData.fotoUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Label
                    htmlFor="photo-upload"
                    className="bg-primary hover:bg-primary/90 flex h-9 cursor-pointer items-center gap-2 rounded-md px-4 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    {isUploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {formData.fotoUrl ? "Cambiar foto" : "Subir foto"}
                  </Label>
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="codigoCliente"
                    className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Código de Cliente
                  </Label>
                  <Input
                    id="codigoCliente"
                    value={formData.codigoCliente}
                    disabled
                    className="bg-muted/50 border-muted-foreground/20 h-10 font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="tipo"
                    className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Tipo de Cliente
                  </Label>
                  <Select
                    value={formData.tipoCliente}
                    onValueChange={(val) => setFormData({ ...formData, tipoCliente: val })}
                  >
                    <SelectTrigger className="border-muted-foreground/20 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="empresarial">Empresarial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="nombre"
                    className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Nombres *
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="border-muted-foreground/20 h-10 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="apellidos"
                    className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Apellidos *
                  </Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                    className="border-muted-foreground/20 h-10 font-bold"
                  />
                </div>
              </div>
            </div>

            <Tabs defaultValue="contacto" className="w-full">
              <TabsList className="bg-muted/30 grid w-full grid-cols-4 rounded-xl p-1">
                <TabsTrigger value="contacto" className="gap-2 font-bold data-[state=active]:shadow-md">
                  <Contact className="h-4 w-4" /> Principal
                </TabsTrigger>
                <TabsTrigger value="identidad" className="gap-2 font-bold data-[state=active]:shadow-md">
                  <User className="h-4 w-4" /> Identidad
                </TabsTrigger>
                <TabsTrigger value="ubicacion" className="gap-2 font-bold data-[state=active]:shadow-md">
                  <MapPin className="h-4 w-4" /> Ubicación
                </TabsTrigger>
                <TabsTrigger value="avanzado" className="gap-2 font-bold data-[state=active]:shadow-md">
                  <Settings className="h-4 w-4" /> Avanzado
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contacto" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="telefono"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="celular"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Celular
                    </Label>
                    <Input
                      id="celular"
                      value={formData.celular}
                      onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="email"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="identidad" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cedula"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Cédula / RNC
                    </Label>
                    <Input
                      id="cedula"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sexo"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Sexo
                    </Label>
                    <Select value={formData.sexo} onValueChange={(val) => setFormData({ ...formData, sexo: val })}>
                      <SelectTrigger className="border-muted-foreground/20 h-10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="ocupacion"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Ocupación
                    </Label>
                    <Input
                      id="ocupacion"
                      value={formData.ocupacion}
                      onChange={(e) => setFormData({ ...formData, ocupacion: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="nombreEmpresa"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Empresa
                    </Label>
                    <Input
                      id="nombreEmpresa"
                      value={formData.nombreEmpresa}
                      onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ubicacion" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="direccion"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Dirección Full
                    </Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sector"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Sector / Barrio
                    </Label>
                    <Input
                      id="sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="ciudad"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Ciudad
                    </Label>
                    <Input
                      id="ciudad"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="provincia"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Provincia
                    </Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="coordenadas"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Coordenadas (lat,lng)
                    </Label>
                    <Input
                      id="coordenadas"
                      value={formData.coordenadas}
                      onChange={(e) => setFormData({ ...formData, coordenadas: e.target.value })}
                      placeholder="18.4861,-69.9312"
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="avanzado" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="categoria"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Categoría
                    </Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                    >
                      <SelectTrigger className="border-muted-foreground/20 h-10 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NUEVO">Nuevo</SelectItem>
                        <SelectItem value="VIEJO">Viejo</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="INACTIVO">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="limiteCredito"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Límite de Crédito
                    </Label>
                    <Input
                      id="limiteCredito"
                      value={formData.limiteCredito}
                      onChange={(e) => setFormData({ ...formData, limiteCredito: e.target.value })}
                      className="border-muted-foreground/20 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="observaciones"
                    className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Observaciones
                  </Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="border-muted-foreground/20 min-h-[100px]"
                  />
                </div>

                <div className="bg-muted/30 grid grid-cols-1 gap-4 rounded-xl p-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">Acepta Promociones</p>
                      <p className="text-muted-foreground text-[10px]">Envío de ofertas y noticias.</p>
                    </div>
                    <Switch
                      checked={formData.aceptaPromociones}
                      onCheckedChange={(val) => setFormData({ ...formData, aceptaPromociones: val })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">Cliente Activo</p>
                      <p className="text-muted-foreground text-[10px]">Estado operativo de cuenta.</p>
                    </div>
                    <Switch
                      checked={formData.activo}
                      onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="bg-muted/10 border-t p-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-8 font-bold">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="shadow-primary/20 h-11 min-w-[180px] font-bold shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <BadgeCheck className="mr-2 h-4 w-4" /> Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
