"use client";

/* eslint-disable complexity, @typescript-eslint/prefer-nullish-coalescing, max-lines, react/no-array-index-key */

import React, { useEffect, useMemo, useState } from "react";

import { Edit, Loader2, Plus, RefreshCw, Search, Server, Trash2, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ServicioOption {
  id: string;
  nombre: string;
  tipo: string;
}

interface PlanOption {
  id: string;
  nombre: string;
  precio: string;
  bajadaMbps: number;
  subidaKbps: number;
}

interface EquipoItem {
  id: string;
  clienteId?: string;
  tipoEquipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  macAddress: string | null;
  ipAsignada?: string | null;
  estado: string;
  fechaInstalacion?: string | null;
  ubicacion?: string | null;
  notas?: string | null;
  suscripcionId: string | null;
}

interface SuscripcionItem {
  id: string;
  numero_contrato: string;
  estado: string;
  precio_mensual: string;
  fecha_proximo_pago: string | null;
  dia_facturacion: number;
  descuento_aplicado: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_apellidos: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  codigo_cliente: string;
  servicio_id: string | null;
  servicio_nombre: string | null;
  plan_id: number | null;
  plan_nombre: string | null;
  equipos_count: number;
  equipos: EquipoItem[];
}

interface SingleEquipoForm {
  tipoEquipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  macAddress: string;
  ipAsignada: string;
  estado: string;
  fechaInstalacion: string;
  ubicacion: string;
  notas: string;
  suscripcionId: string;
}

interface BulkEquipoFormRow extends Omit<SingleEquipoForm, "notas"> {
  notas: string;
}

const EMPTY_SINGLE_FORM: SingleEquipoForm = {
  tipoEquipo: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  macAddress: "",
  ipAsignada: "",
  estado: "instalado",
  fechaInstalacion: "",
  ubicacion: "",
  notas: "",
  suscripcionId: "none",
};

const createBulkRow = (): BulkEquipoFormRow => ({
  tipoEquipo: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  macAddress: "",
  ipAsignada: "",
  estado: "instalado",
  fechaInstalacion: "",
  ubicacion: "",
  notas: "",
  suscripcionId: "none",
});

const formatMoney = (value: string) => {
  const amount = Number.parseFloat(value || "0");
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
};

const normalizeIpForForm = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/\/\d+$/, "");
};

const normalizeMacForForm = (value?: string | null) => {
  if (!value) return "";
  const hexOnly = value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (hexOnly.length !== 12) return value.toUpperCase();
  return hexOnly.match(/.{1,2}/g)?.join(":") ?? value.toUpperCase();
};

export default function EquiposServiciosPage() {
  const [rows, setRows] = useState<SuscripcionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [services, setServices] = useState<ServicioOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  const [editingRow, setEditingRow] = useState<SuscripcionItem | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string>("none");
  const [editingPlanId, setEditingPlanId] = useState<string>("none");
  const [editingDiscount, setEditingDiscount] = useState<string>("0");
  const [editingSaving, setEditingSaving] = useState(false);

  const [equipmentTarget, setEquipmentTarget] = useState<SuscripcionItem | null>(null);
  const [existingEquipos, setExistingEquipos] = useState<EquipoItem[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [editingEquipoId, setEditingEquipoId] = useState<string | null>(null);
  const [singleEquipoForm, setSingleEquipoForm] = useState<SingleEquipoForm>(EMPTY_SINGLE_FORM);
  const [bulkRows, setBulkRows] = useState<BulkEquipoFormRow[]>([createBulkRow()]);
  const [savingSingle, setSavingSingle] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [deletingEquipoId, setDeletingEquipoId] = useState<string | null>(null);
  const [equipmentTab, setEquipmentTab] = useState("single");

  const totalEquipos = useMemo(() => rows.reduce((acc, row) => acc + (row.equipos_count || 0), 0), [rows]);

  const fetchOptions = async () => {
    try {
      const [servicesResult, plansResult] = await Promise.allSettled([
        fetch("/api/servicios?limit=100&sortBy=nombre&sortOrder=asc"),
        fetch("/api/planes?limit=100&sortBy=nombre&sortOrder=asc"),
      ]);

      if (servicesResult.status === "fulfilled") {
        const servicesData = await servicesResult.value.json();
        const serviceItems = servicesData?.data?.data ?? [];
        setServices(Array.isArray(serviceItems) ? serviceItems : []);
      } else {
        setServices([]);
      }

      if (plansResult.status === "fulfilled") {
        const plansData = await plansResult.value.json();
        const planItems = plansData?.data?.data ?? [];
        setPlans(Array.isArray(planItems) ? planItems : []);
      } else {
        setPlans([]);
      }
    } catch (_error) {
      toast.error("No se pudieron cargar servicios y planes");
    }
  };

  const fetchRows = async (q?: string) => {
    setLoading(true);
    try {
      const query = q?.trim() ? `?search=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/suscripciones${query}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? "No se pudo cargar la informacion");
        setRows([]);
        return;
      }

      setRows(data.data?.suscripciones ?? []);
    } catch (_error) {
      toast.error("Error de conexion al cargar suscripciones");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchRows();
  }, []);

  const openEditModal = (row: SuscripcionItem) => {
    setEditingRow(row);
    setEditingServiceId(row.servicio_id ?? "none");
    setEditingPlanId(row.plan_id ? String(row.plan_id) : "none");
    setEditingDiscount(row.descuento_aplicado);
  };

  const saveSubscription = async () => {
    if (!editingRow) return;

    setEditingSaving(true);
    try {
      const payload = {
        servicioId: editingServiceId === "none" ? null : editingServiceId,
        planId: editingPlanId === "none" ? null : Number(editingPlanId),
        descuentoAplicado: editingDiscount || "0",
      };

      const res = await fetch(`/api/suscripciones/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? "No se pudo actualizar la suscripcion");
        return;
      }

      toast.success("Suscripcion actualizada");
      setEditingRow(null);
      fetchRows(search);
    } catch (_error) {
      toast.error("Error al actualizar la suscripcion");
    } finally {
      setEditingSaving(false);
    }
  };

  const loadClientEquipos = async (clienteId: string) => {
    setLoadingEquipos(true);
    try {
      const res = await fetch(`/api/equipos?clienteId=${encodeURIComponent(clienteId)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      console.log("[loadClientEquipos] status:", res.status, "body:", JSON.stringify(data));
      if (!res.ok || !data.success) {
        setExistingEquipos([]);
        toast.error(data.error ?? "No se pudieron cargar los equipos del cliente");
        return;
      }

      const items = data.data?.equipos ?? [];
      console.log("[loadClientEquipos] equipos recibidos:", items.length, items);
      setExistingEquipos(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("[loadClientEquipos] exception:", err);
      setExistingEquipos([]);
      toast.error("No se pudieron cargar los equipos del cliente");
    } finally {
      setLoadingEquipos(false);
    }
  };

  const openEquiposModal = async (row: SuscripcionItem) => {
    setEquipmentTarget(row);
    setEditingEquipoId(null);
    setEquipmentTab("single");
    setSingleEquipoForm({ ...EMPTY_SINGLE_FORM, suscripcionId: row.id });
    setBulkRows([{ ...createBulkRow(), suscripcionId: row.id }]);
    await loadClientEquipos(row.cliente_id);
  };

  const closeEquiposModal = () => {
    setEquipmentTarget(null);
    setEditingEquipoId(null);
    setEquipmentTab("single");
    setExistingEquipos([]);
    setSingleEquipoForm(EMPTY_SINGLE_FORM);
    setBulkRows([createBulkRow()]);
  };

  const startEditingEquipo = (equipo: EquipoItem) => {
    setEditingEquipoId(equipo.id);
    setSingleEquipoForm({
      tipoEquipo: equipo.tipoEquipo || "",
      marca: equipo.marca || "",
      modelo: equipo.modelo || "",
      numeroSerie: equipo.numeroSerie || "",
      macAddress: normalizeMacForForm(equipo.macAddress),
      ipAsignada: normalizeIpForForm(equipo.ipAsignada),
      estado: equipo.estado || "instalado",
      fechaInstalacion: toDateInputValue(equipo.fechaInstalacion),
      ubicacion: equipo.ubicacion || "",
      notas: equipo.notas || "",
      suscripcionId: equipo.suscripcionId || "none",
    });
  };

  const targetSubscriptions = useMemo(() => {
    if (!equipmentTarget) return [];
    return rows.filter((row) => row.cliente_id === equipmentTarget.cliente_id);
  }, [equipmentTarget, rows]);

  const saveSingleEquipo = async () => {
    if (!equipmentTarget) return;

    setSavingSingle(true);
    try {
      const payload = {
        clienteId: equipmentTarget.cliente_id,
        suscripcionId: singleEquipoForm.suscripcionId === "none" ? null : singleEquipoForm.suscripcionId,
        tipoEquipo: singleEquipoForm.tipoEquipo,
        marca: singleEquipoForm.marca,
        modelo: singleEquipoForm.modelo,
        numeroSerie: singleEquipoForm.numeroSerie,
        macAddress: normalizeMacForForm(singleEquipoForm.macAddress) || null,
        ipAsignada: singleEquipoForm.ipAsignada || null,
        estado: singleEquipoForm.estado || "instalado",
        fechaInstalacion: singleEquipoForm.fechaInstalacion || null,
        ubicacion: singleEquipoForm.ubicacion || null,
        notas: singleEquipoForm.notas || null,
      };

      const endpoint = editingEquipoId ? `/api/equipos/${editingEquipoId}` : "/api/equipos";
      const method = editingEquipoId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).find((messages) => Array.isArray(messages) && messages.length > 0)?.[0]
          : undefined;
        toast.error(firstFieldError || data.error || "No se pudo guardar el equipo");
        return;
      }

      toast.success(editingEquipoId ? "Equipo actualizado" : "Equipo registrado");
      setEditingEquipoId(null);
      setSingleEquipoForm({ ...EMPTY_SINGLE_FORM, suscripcionId: equipmentTarget.id });
      await Promise.all([fetchRows(search), loadClientEquipos(equipmentTarget.cliente_id)]);
    } catch (_error) {
      toast.error("Error al guardar equipo");
    } finally {
      setSavingSingle(false);
    }
  };

  const updateBulkRow = (index: number, key: keyof BulkEquipoFormRow, value: string) => {
    setBulkRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)));
  };

  const addBulkRow = () => {
    const preferredSubscriptionId = equipmentTarget?.id ?? "none";
    setBulkRows((prev) => [...prev, { ...createBulkRow(), suscripcionId: preferredSubscriptionId }]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveBulkEquipos = async () => {
    if (!equipmentTarget) return;

    setSavingBulk(true);
    try {
      const payload = {
        clienteId: equipmentTarget.cliente_id,
        equipos: bulkRows.map((row) => ({
          suscripcionId: row.suscripcionId === "none" ? null : row.suscripcionId,
          tipoEquipo: row.tipoEquipo,
          marca: row.marca,
          modelo: row.modelo,
          numeroSerie: row.numeroSerie,
          macAddress: row.macAddress || null,
          ipAsignada: row.ipAsignada || null,
          estado: row.estado || "instalado",
          fechaInstalacion: row.fechaInstalacion || null,
          ubicacion: row.ubicacion || null,
          notas: row.notas || null,
        })),
      };

      const res = await fetch("/api/equipos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "No se pudo procesar la carga masiva");
        await loadClientEquipos(equipmentTarget.cliente_id);
        return;
      }

      const createdCount = data.data?.createdCount ?? 0;
      const failedCount = data.data?.failedCount ?? 0;
      if (createdCount > 0 && failedCount === 0) {
        toast.success(`Se registraron ${createdCount} equipos`);
      } else if (createdCount > 0 && failedCount > 0) {
        toast.warning(`Registrados: ${createdCount}. Fallidos: ${failedCount}`);
      } else {
        const firstFailedReason = data.data?.failed?.[0]?.error;
        toast.error(firstFailedReason || "No se registraron equipos en la carga");
      }

      setEditingEquipoId(null);
      setSingleEquipoForm({ ...EMPTY_SINGLE_FORM, suscripcionId: equipmentTarget.id });
      setBulkRows([{ ...createBulkRow(), suscripcionId: equipmentTarget.id }]);
      setEquipmentTab("single");
      await Promise.all([fetchRows(search), loadClientEquipos(equipmentTarget.cliente_id)]);
    } catch (_error) {
      toast.error("Error al registrar equipos");
    } finally {
      setSavingBulk(false);
    }
  };

  const deleteEquipo = async (equipo: EquipoItem) => {
    if (!equipmentTarget) return;

    const confirmed = window.confirm(
      `Deseas eliminar este equipo?\n\n${equipo.tipoEquipo} - ${equipo.marca} ${equipo.modelo}\nSerie: ${equipo.numeroSerie}`,
    );
    if (!confirmed) return;

    setDeletingEquipoId(equipo.id);
    try {
      const res = await fetch(`/api/equipos/${equipo.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? "No se pudo eliminar el equipo");
        return;
      }

      if (editingEquipoId === equipo.id) {
        setEditingEquipoId(null);
        setSingleEquipoForm({ ...EMPTY_SINGLE_FORM, suscripcionId: equipmentTarget.id });
      }

      toast.success("Equipo eliminado");
      await Promise.all([fetchRows(search), loadClientEquipos(equipmentTarget.cliente_id)]);
    } catch (_error) {
      toast.error("Error al eliminar equipo");
    } finally {
      setDeletingEquipoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Equipos y Servicios por Cliente</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona clientes activos con suscripciones activas, edita su plan/servicio y registra equipos.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchRows(search)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Suscripciones activas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clientes activos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{new Set(rows.map((row) => row.cliente_id)).size}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Equipos registrados</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totalEquipos}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, codigo o contrato"
                className="pl-9"
              />
            </div>
            <Button onClick={() => fetchRows(search)} disabled={loading}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Suscripcion</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Equipos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No hay clientes activos con suscripciones activas.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {row.cliente_nombre} {row.cliente_apellidos}
                      </span>
                      <span className="text-muted-foreground text-xs">{row.codigo_cliente}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.cliente_telefono || row.cliente_email || "Sin contacto"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{row.numero_contrato}</span>
                      <Badge variant="secondary">Dia {row.dia_facturacion}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-sky-500" />
                      <span>{row.servicio_nombre || "Sin servicio"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-violet-500" />
                      <span>{row.plan_nombre || "Sin plan"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatMoney(row.precio_mensual)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{row.equipos_count} equipo(s)</Badge>
                      {row.equipos.slice(0, 1).map((eq) => (
                        <span key={eq.id} className="text-muted-foreground text-xs">
                          {eq.tipoEquipo} - {eq.numeroSerie}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEditModal(row)}
                        title="Editar servicio y plan"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={() => void openEquiposModal(row)} title="Registrar o editar equipos">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Servicio y Plan</DialogTitle>
            <DialogDescription>
              {editingRow
                ? `${editingRow.cliente_nombre} ${editingRow.cliente_apellidos} - ${editingRow.numero_contrato}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select value={editingServiceId} onValueChange={setEditingServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin servicio</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.nombre} ({service.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={editingPlanId} onValueChange={setEditingPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plan</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre} - {formatMoney(plan.precio)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descuento aplicado (%)</Label>
              <Input value={editingDiscount} onChange={(event) => setEditingDiscount(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              Cancelar
            </Button>
            <Button onClick={saveSubscription} disabled={editingSaving}>
              {editingSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(equipmentTarget)} onOpenChange={(open) => !open && closeEquiposModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Registrar Equipos del Cliente</DialogTitle>
            <DialogDescription>
              {equipmentTarget
                ? `${equipmentTarget.cliente_nombre} ${equipmentTarget.cliente_apellidos} (${equipmentTarget.codigo_cliente})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Equipos existentes del cliente ({existingEquipos.length})</p>
              <div className="flex items-center gap-2">
                {loadingEquipos && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
                {!loadingEquipos && equipmentTarget && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Refrescar lista"
                    onClick={() => loadClientEquipos(equipmentTarget.cliente_id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {!loadingEquipos && existingEquipos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Este cliente aun no tiene equipos registrados.</p>
            ) : (
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {existingEquipos.map((equipo) => (
                  <div key={equipo.id} className="flex items-center justify-between rounded border p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {equipo.tipoEquipo} - {equipo.marca} {equipo.modelo}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">Serie: {equipo.numeroSerie}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant={editingEquipoId === equipo.id ? "secondary" : "outline"}
                        onClick={() => {
                          setEquipmentTab("single");
                          startEditingEquipo(equipo);
                        }}
                        disabled={deletingEquipoId === equipo.id}
                        title="Editar equipo"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => void deleteEquipo(equipo)}
                        disabled={deletingEquipoId === equipo.id}
                        title="Eliminar equipo"
                      >
                        {deletingEquipoId === equipo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Tabs value={equipmentTab} onValueChange={setEquipmentTab} className="w-full">
            <TabsList>
              <TabsTrigger value="single">Uno por vez</TabsTrigger>
              <TabsTrigger value="bulk">Carga multiple</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de equipo *</Label>
                  <Input
                    value={singleEquipoForm.tipoEquipo}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, tipoEquipo: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={singleEquipoForm.marca}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, marca: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={singleEquipoForm.modelo}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, modelo: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Numero de serie *</Label>
                  <Input
                    value={singleEquipoForm.numeroSerie}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, numeroSerie: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MAC Address</Label>
                  <Input
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={singleEquipoForm.macAddress}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, macAddress: event.target.value }))}
                    onBlur={(event) =>
                      setSingleEquipoForm((prev) => ({ ...prev, macAddress: normalizeMacForForm(event.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Asignada</Label>
                  <Input
                    placeholder="192.168.1.10"
                    value={singleEquipoForm.ipAsignada}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, ipAsignada: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={singleEquipoForm.estado}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, estado: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha instalacion</Label>
                  <Input
                    type="date"
                    value={singleEquipoForm.fechaInstalacion}
                    onChange={(event) =>
                      setSingleEquipoForm((prev) => ({ ...prev, fechaInstalacion: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Vincular a suscripcion (opcional)</Label>
                  <Select
                    value={singleEquipoForm.suscripcionId}
                    onValueChange={(value) => setSingleEquipoForm((prev) => ({ ...prev, suscripcionId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar suscripcion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Solo cliente</SelectItem>
                      {targetSubscriptions.map((subscription) => (
                        <SelectItem key={subscription.id} value={subscription.id}>
                          {subscription.numero_contrato}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Ubicacion</Label>
                  <Input
                    value={singleEquipoForm.ubicacion}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, ubicacion: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={singleEquipoForm.notas}
                    onChange={(event) => setSingleEquipoForm((prev) => ({ ...prev, notas: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSingleEquipo} disabled={savingSingle}>
                  {savingSingle ? "Guardando..." : editingEquipoId ? "Actualizar equipo" : "Registrar equipo"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Registra varios equipos de una vez. Campos obligatorios por fila: tipo, marca, modelo y serie.
                </p>
                <Button variant="outline" onClick={addBulkRow}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar fila
                </Button>
              </div>

              <div className="space-y-3">
                {bulkRows.map((row, index) => (
                  <Card key={`bulk-row-${index}`}>
                    <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-3">
                      <Input
                        placeholder="Tipo *"
                        value={row.tipoEquipo}
                        onChange={(event) => updateBulkRow(index, "tipoEquipo", event.target.value)}
                      />
                      <Input
                        placeholder="Marca *"
                        value={row.marca}
                        onChange={(event) => updateBulkRow(index, "marca", event.target.value)}
                      />
                      <Input
                        placeholder="Modelo *"
                        value={row.modelo}
                        onChange={(event) => updateBulkRow(index, "modelo", event.target.value)}
                      />
                      <Input
                        placeholder="Numero de serie *"
                        value={row.numeroSerie}
                        onChange={(event) => updateBulkRow(index, "numeroSerie", event.target.value)}
                      />
                      <Input
                        placeholder="MAC"
                        value={row.macAddress}
                        onChange={(event) => updateBulkRow(index, "macAddress", event.target.value)}
                        onBlur={(event) => updateBulkRow(index, "macAddress", normalizeMacForForm(event.target.value))}
                      />
                      <Input
                        placeholder="IP"
                        value={row.ipAsignada}
                        onChange={(event) => updateBulkRow(index, "ipAsignada", event.target.value)}
                      />

                      <Select
                        value={row.suscripcionId}
                        onValueChange={(value) => updateBulkRow(index, "suscripcionId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Suscripcion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Solo cliente</SelectItem>
                          {targetSubscriptions.map((subscription) => (
                            <SelectItem key={subscription.id} value={subscription.id}>
                              {subscription.numero_contrato}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Estado"
                        value={row.estado}
                        onChange={(event) => updateBulkRow(index, "estado", event.target.value)}
                      />

                      <Input
                        type="date"
                        value={row.fechaInstalacion}
                        onChange={(event) => updateBulkRow(index, "fechaInstalacion", event.target.value)}
                      />

                      <Input
                        placeholder="Ubicacion"
                        value={row.ubicacion}
                        onChange={(event) => updateBulkRow(index, "ubicacion", event.target.value)}
                      />

                      <Textarea
                        className="md:col-span-2"
                        placeholder="Notas"
                        value={row.notas}
                        onChange={(event) => updateBulkRow(index, "notas", event.target.value)}
                      />

                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={bulkRows.length === 1}
                          onClick={() => removeBulkRow(index)}
                        >
                          Eliminar fila
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={saveBulkEquipos} disabled={savingBulk}>
                  {savingBulk ? "Procesando..." : "Registrar lote"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
