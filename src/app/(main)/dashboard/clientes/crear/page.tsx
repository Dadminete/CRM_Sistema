"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, ChevronLeft, Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { CommercialSelectionCard, type PlanOption, type ServiceOption } from "./_components/commercial-selection-card";
import { buildCreateClientPayload, fetchCatalog, getErrorMessage } from "./_components/create-client-form-utils";
import { initialForm, type FormState } from "./_components/form-state";

export default function CrearClientePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingCommercialData, setIsLoadingCommercialData] = useState(true);

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

  const canSubmit = useMemo(() => {
    return Boolean(formData.codigoCliente.trim() && formData.nombre.trim() && formData.apellidos.trim());
  }, [formData.codigoCliente, formData.nombre, formData.apellidos]);

  const setField = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleServiceSelection = (serviceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      servicioIds: checked
        ? Array.from(new Set([...prev.servicioIds, serviceId]))
        : prev.servicioIds.filter((id) => id !== serviceId),
    }));
  };

  useEffect(() => {
    const fetchCommercialData = async () => {
      setIsLoadingCommercialData(true);
      try {
        const [plansData, servicesData] = await Promise.all([
          fetchCatalog<PlanOption>(
            "/api/planes?limit=100&sortBy=nombre&sortOrder=asc",
            "No se pudieron cargar los planes",
          ),
          fetchCatalog<ServiceOption>(
            "/api/servicios?limit=100&sortBy=nombre&sortOrder=asc",
            "No se pudieron cargar los servicios adicionales",
          ),
        ]);

        setPlans(plansData);
        setServices(servicesData);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsLoadingCommercialData(false);
      }
    };

    void fetchCommercialData();
  }, []);

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Completa codigo, nombre y apellidos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildCreateClientPayload(formData);

      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        toast.error(result.error ?? "No se pudo crear el cliente.");
        return;
      }

      toast.success("Cliente creado correctamente.");
      router.push("/dashboard/clientes/listado");
      router.refresh();
    } catch (_error) {
      toast.error("Error de conexion al crear cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 duration-500 md:p-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
              Crear Cliente
            </h1>
            <p className="text-muted-foreground mt-2">Alta de nuevos clientes en la base operativa.</p>
          </div>
        </div>
      </div>

      <form onSubmit={submitForm} className="space-y-6">
        <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
          <CardHeader className="bg-muted/5 border-b">
            <CardTitle className="text-xl">Datos esenciales</CardTitle>
            <CardDescription>Obligatorios y contacto principal del cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
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
                    htmlFor="photo-upload-create"
                    className="bg-primary hover:bg-primary/90 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {formData.fotoUrl ? "Cambiar foto" : "Subir foto"}
                  </Label>
                  <input
                    id="photo-upload-create"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold opacity-80">Foto del Cliente</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Sube una imagen clara para identificar al cliente. <br />
                  Formatos soportados: JPG, PNG. Máximo 2MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="codigoCliente">Codigo de cliente *</Label>
                <Input
                  id="codigoCliente"
                  value={formData.codigoCliente}
                  onChange={(e) => setField("codigoCliente", e.target.value)}
                  maxLength={30}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setField("nombre", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setField("apellidos", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedula">Cedula</Label>
                <Input
                  id="cedula"
                  value={formData.cedula}
                  onChange={(e) => setField("cedula", e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setField("telefono", e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.celular}
                  onChange={(e) => setField("celular", e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de cliente</Label>
                <Select
                  value={formData.tipoCliente}
                  onValueChange={(value: "residencial" | "empresarial") => setField("tipoCliente", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="empresarial">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="direccion">Direccion</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setField("direccion", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value: "NUEVO" | "VIEJO" | "VIP" | "INACTIVO") => setField("categoria", value)}
                >
                  <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        <CommercialSelectionCard
          plans={plans}
          services={services}
          selectedPlanId={formData.planId}
          selectedServiceIds={formData.servicioIds}
          isLoading={isLoadingCommercialData}
          onPlanChange={(planId) => setField("planId", planId)}
          onToggleService={toggleServiceSelection}
          onClear={() => {
            setField("planId", "");
            setField("servicioIds", []);
          }}
        />

        <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
          <CardHeader className="bg-muted/5 border-b">
            <CardTitle className="text-xl">Datos avanzados</CardTitle>
            <CardDescription>Opcionales para credito, perfil y seguimiento.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="extra-fields">
                <AccordionTrigger className="text-sm font-semibold">Completar informacion adicional</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="sector">Sector</Label>
                      <Input id="sector" value={formData.sector} onChange={(e) => setField("sector", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input id="ciudad" value={formData.ciudad} onChange={(e) => setField("ciudad", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provincia">Provincia</Label>
                      <Input
                        id="provincia"
                        value={formData.provincia}
                        onChange={(e) => setField("provincia", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigoPostal">Codigo Postal</Label>
                      <Input
                        id="codigoPostal"
                        value={formData.codigoPostal}
                        onChange={(e) => setField("codigoPostal", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <Label htmlFor="coordenadas">Coordenadas (lat,lng)</Label>
                      <Input
                        id="coordenadas"
                        value={formData.coordenadas}
                        onChange={(e) => setField("coordenadas", e.target.value)}
                        placeholder="18.4861,-69.9312"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="limiteCredito">Limite de credito</Label>
                      <Input
                        id="limiteCredito"
                        value={formData.limiteCredito}
                        onChange={(e) => setField("limiteCredito", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diasCredito">Dias de credito</Label>
                      <Input
                        id="diasCredito"
                        type="number"
                        min={0}
                        max={365}
                        value={formData.diasCredito}
                        onChange={(e) => setField("diasCredito", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descuentoCliente">Descuento (%)</Label>
                      <Input
                        id="descuentoCliente"
                        value={formData.descuentoCliente}
                        onChange={(e) => setField("descuentoCliente", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select
                        value={formData.sexo.length ? formData.sexo : "none"}
                        onValueChange={(value) => setField("sexo", value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No especificar</SelectItem>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocupacion">Ocupacion</Label>
                      <Input
                        id="ocupacion"
                        value={formData.ocupacion}
                        onChange={(e) => setField("ocupacion", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nombreEmpresa">Empresa</Label>
                      <Input
                        id="nombreEmpresa"
                        value={formData.nombreEmpresa}
                        onChange={(e) => setField("nombreEmpresa", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <Label htmlFor="referenciaPersonal">Referencia personal</Label>
                      <Input
                        id="referenciaPersonal"
                        value={formData.referenciaPersonal}
                        onChange={(e) => setField("referenciaPersonal", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-3">
                      <Label htmlFor="observaciones">Observaciones</Label>
                      <Textarea
                        id="observaciones"
                        value={formData.observaciones}
                        onChange={(e) => setField("observaciones", e.target.value)}
                        className="min-h-[110px]"
                      />
                    </div>
                    <div className="border-border/60 mt-2 grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:col-span-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Cliente activo</p>
                          <p className="text-muted-foreground text-xs">Control operativo inicial.</p>
                        </div>
                        <Switch checked={formData.activo} onCheckedChange={(checked) => setField("activo", checked)} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Acepta promociones</p>
                          <p className="text-muted-foreground text-xs">Permite envio de ofertas.</p>
                        </div>
                        <Switch
                          checked={formData.aceptaPromociones}
                          onCheckedChange={(checked) => setField("aceptaPromociones", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/clientes/listado")}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Volver al listado
          </Button>
          <Button type="button" variant="outline" onClick={() => setFormData(initialForm)} disabled={isSubmitting}>
            Limpiar
          </Button>
          <Button type="submit" disabled={!canSubmit || isSubmitting} className="min-w-[170px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Crear cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
