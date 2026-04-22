"use client";

import { useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeftRight, Eye, Pencil, Shuffle, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";

type CuentaCaja = { id: string; nombre: string; saldoActual: string };
type CuentaBanco = { id: string; numeroCuenta: string; bancoNombre: string; bankId: string };
type Traspaso = {
  id: string;
  numero: string;
  fecha: string;
  monto: string;
  concepto: string;
  estado: string;
  cajaOrigenId: string | null;
  cajaDestinoId: string | null;
  bancoOrigenId: string | null;
  bancoDestinoId: string | null;
};

type CuentaTipo = "caja" | "banco";

export default function TraspasosPage() {
  const [cajasList, setCajasList] = useState<CuentaCaja[]>([]);
  const [bancosList, setBancosList] = useState<CuentaBanco[]>([]);
  const [traspasosList, setTraspasosList] = useState<Traspaso[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail/Edit states
  const [selectedTraspaso, setSelectedTraspaso] = useState<Traspaso | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const [form, setForm] = useState({
    origenTipo: "caja" as CuentaTipo,
    origenId: "",
    destinoTipo: "banco" as CuentaTipo,
    destinoId: "",
    monto: "",
    concepto: "",
    fecha: new Date().toISOString().slice(0, 10),
  });

  const origenOptions = useMemo(
    () => (form.origenTipo === "caja" ? cajasList : bancosList),
    [form.origenTipo, cajasList, bancosList],
  );
  const destinoOptions = useMemo(
    () => (form.destinoTipo === "caja" ? cajasList : bancosList),
    [form.destinoTipo, cajasList, bancosList],
  );

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const [cajasRes, bancosRes, trasRes] = await Promise.all([
        fetch("/api/traspasos/cuentas/cajas").then((r) => r.json()),
        fetch("/api/traspasos/cuentas/bancos").then((r) => r.json()),
        fetch(`/api/traspasos?page=${targetPage}&limit=${targetLimit}`).then((r) => r.json()),
      ]);

      if (cajasRes.success) setCajasList(cajasRes.data || []);
      if (bancosRes.success) setBancosList(bancosRes.data || []);
      if (trasRes.success) {
        setTraspasosList(trasRes.data || []);
        if (trasRes.pagination) {
          setTotal(trasRes.pagination.total);
          setTotalPages(trasRes.pagination.totalPages);
          setPage(trasRes.pagination.page);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar los datos de traspasos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.monto || Number(form.monto) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!form.concepto.trim()) {
      toast.error("Concepto requerido");
      return;
    }
    if (!form.origenId || !form.destinoId) {
      toast.error("Selecciona origen y destino");
      return;
    }
    if (form.origenTipo === form.destinoTipo && form.origenId === form.destinoId) {
      toast.error("Origen y destino no pueden ser iguales");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/traspasos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monto: Number(form.monto),
          fecha: new Date(form.fecha).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Traspaso creado");
        setForm((prev) => ({ ...prev, monto: "", concepto: "" }));
        await loadData();
      } else {
        toast.error(data.error || "Error al crear traspaso");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al crear traspaso");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Traspaso) => {
    setSelectedTraspaso(t);
    setEditForm({
      origenTipo: t.cajaOrigenId ? "caja" : "banco",
      origenId: t.cajaOrigenId || t.bancoOrigenId || "",
      destinoTipo: t.cajaDestinoId ? "caja" : "banco",
      destinoId: t.cajaDestinoId || t.bancoDestinoId || "",
      monto: t.monto,
      concepto: t.concepto,
      fecha: new Date(t.fecha).toISOString().slice(0, 10),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editForm.monto || Number(editForm.monto) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/traspasos/${selectedTraspaso?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          monto: Number(editForm.monto),
          fecha: new Date(editForm.fecha).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Traspaso actualizado");
        setIsEditOpen(false);
        await loadData();
      } else {
        toast.error(data.error || "Error al actualizar");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-50 p-3 text-blue-600 shadow-sm">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Traspasos</h1>
            <p className="text-muted-foreground">Mover fondos entre cajas y bancos sin afectar gastos/ingresos.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
          {loading ? "Actualizando..." : "Refrescar"}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nuevo Traspaso</CardTitle>
            <CardDescription>Valida saldos antes de confirmar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Origen</Label>
                <Select value={form.origenTipo} onValueChange={(v) => update("origenTipo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="banco">Banco</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.origenId} onValueChange={(v) => update("origenId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {origenOptions.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {form.origenTipo === "caja" ? c.nombre : `${c.numeroCuenta} (${c.bancoNombre || "Banco"})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select value={form.destinoTipo} onValueChange={(v) => update("destinoTipo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="banco">Banco</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.destinoId} onValueChange={(v) => update("destinoId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinoOptions.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {form.destinoTipo === "caja" ? c.nombre : `${c.numeroCuenta} (${c.bancoNombre || "Banco"})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => update("monto", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => update("fecha", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Concepto</Label>
              <Textarea
                rows={3}
                value={form.concepto}
                onChange={(e) => update("concepto", e.target.value)}
                placeholder="Motivo del traspaso"
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creando..." : "Registrar Traspaso"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Historial de Traspasos</CardTitle>
              <CardDescription>Últimos movimientos internos.</CardDescription>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Shuffle className="h-4 w-4" /> Neutros para gastos/ingresos
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Origen → Destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {traspasosList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                      {loading ? "Cargando..." : "Sin traspasos registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  traspasosList.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(t.fecha), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{t.numero}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{t.concepto}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div className="flex flex-col leading-tight">
                          <span>{t.cajaOrigenId ? "Caja origen" : "Banco origen"}</span>
                          <span className="text-foreground font-semibold">
                            → {t.cajaDestinoId ? "Caja destino" : "Banco destino"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(Number(t.monto))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => {
                              setSelectedTraspaso(t);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600"
                            onClick={() => handleEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground text-sm">
                Página {page} de {totalPages} ({total} registros)
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>Filas:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(v) => {
                    const newLimit = parseInt(v, 10);
                    setLimit(newLimit);
                    loadData(1, newLimit);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={limit.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  loadData(newPage);
                }}
                disabled={page === 1 || loading}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  loadData(newPage);
                }}
                disabled={page === totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Traspaso</DialogTitle>
            <DialogDescription>Comprobante de movimiento interno.</DialogDescription>
          </DialogHeader>
          {selectedTraspaso && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Número:</span>
                <span className="font-mono font-bold">{selectedTraspaso.numero}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{format(new Date(selectedTraspaso.fecha), "PPP p", { locale: es })}</span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-bold uppercase">Origen</p>
                  <p className="text-sm">{selectedTraspaso.cajaOrigenId ? "Caja" : "Banco"}</p>
                  <p className="text-sm font-semibold">
                    {selectedTraspaso.cajaOrigenId
                      ? cajasList.find((c) => c.id === selectedTraspaso.cajaOrigenId)?.nombre
                      : bancosList.find((b) => b.id === selectedTraspaso.bancoOrigenId)?.numeroCuenta}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground text-xs font-bold uppercase">Destino</p>
                  <p className="text-sm">{selectedTraspaso.cajaDestinoId ? "Caja" : "Banco"}</p>
                  <p className="text-sm font-semibold">
                    {selectedTraspaso.cajaDestinoId
                      ? cajasList.find((c) => c.id === selectedTraspaso.cajaDestinoId)?.nombre
                      : bancosList.find((b) => b.id === selectedTraspaso.bancoDestinoId)?.numeroCuenta}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-bold uppercase">Concepto</p>
                <p className="text-sm italic">"{selectedTraspaso.concepto}"</p>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                  <span className="font-bold text-blue-700">Monto Total</span>
                  <span className="text-xl font-bold text-blue-700">
                    {formatCurrency(Number(selectedTraspaso.monto))}
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground flex justify-end pt-2 text-[10px] tracking-widest uppercase">
                ID: {selectedTraspaso.id}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Traspaso</DialogTitle>
            <DialogDescription>Modifica los datos del traspaso seleccionado.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Select
                    value={editForm.origenTipo}
                    onValueChange={(v) => setEditForm((p: any) => ({ ...p, origenTipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="banco">Banco</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={editForm.origenId}
                    onValueChange={(v) => setEditForm((p: any) => ({ ...p, origenId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(editForm.origenTipo === "caja" ? cajasList : bancosList).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {editForm.origenTipo === "caja" ? c.nombre : `${c.numeroCuenta} (${c.bancoNombre})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select
                    value={editForm.destinoTipo}
                    onValueChange={(v) => setEditForm((p: any) => ({ ...p, destinoTipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="banco">Banco</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={editForm.destinoId}
                    onValueChange={(v) => setEditForm((p: any) => ({ ...p, destinoId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(editForm.destinoTipo === "caja" ? cajasList : bancosList).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {editForm.destinoTipo === "caja" ? c.nombre : `${c.numeroCuenta} (${c.bancoNombre})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={editForm.monto}
                    onChange={(e) => setEditForm((p: any) => ({ ...p, monto: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={editForm.fecha}
                    onChange={(e) => setEditForm((p: any) => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Concepto</Label>
                <Textarea
                  value={editForm.concepto}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, concepto: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Actualizando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
