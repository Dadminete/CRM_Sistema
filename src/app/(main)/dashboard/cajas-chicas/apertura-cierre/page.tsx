"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRightCircle,
  History,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const USUARIO_ID = "df4b1335-5ff6-4703-8dcd-3e2f74fb0822"; // Valid user ID from DB
const IS_ADMIN = true; // Simulado para propósitos de desarrollo, conectar con auth real en producción

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

export default function AperturaCierrePage() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [dailyTotals, setDailyTotals] = useState({ ingresos: "0", gastos: "0" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for opening
  const [selectedCajaId, setSelectedCajaId] = useState("");
  const [montoIngresado, setMontoIngresado] = useState("0");
  const [observaciones, setObservaciones] = useState("");

  // Alert dialog state
  const [showDiscrepancyAlert, setShowDiscrepancyAlert] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const selectedCaja = cajas.find((c) => c.id === selectedCajaId);

  const fetchSession = async (cajaId: string) => {
    if (!cajaId) {
      setActiveSession(null);
      setDailyTotals({ ingresos: "0", gastos: "0" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cajas/sesiones?cajaId=${cajaId}&usuarioId=${USUARIO_ID}`);
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.activeSession);
        setDailyTotals(data.dailyTotals);
        if (data.activeSession) {
          setMontoIngresado(data.activeSession.montoApertura);
        } else {
          // Si no hay sesión, ponemos el saldo actual como sugerencia
          const caja = cajas.find((c) => c.id === cajaId);
          if (caja) setMontoIngresado(caja.saldoActual);
        }
      }
    } catch (error) {
      toast.error("Error al cargar sesión de caja");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resLookup, resSession] = await Promise.all([
        fetch("/api/contabilidad/lookup"),
        fetch(`/api/cajas/sesiones?usuarioId=${USUARIO_ID}`),
      ]);

      const [dataLookup, dataSession] = await Promise.all([resLookup.json(), resSession.json()]);

      if (dataLookup.success) {
        const fetchedCajas = dataLookup.data.cajas;
        setCajas(fetchedCajas);

        // Si el usuario ya tiene una sesión abierta, seleccionamos esa caja por defecto
        if (dataSession.success && dataSession.activeSession) {
          setSelectedCajaId(dataSession.activeSession.cajaId);
          setActiveSession(dataSession.activeSession);
          setDailyTotals(dataSession.dailyTotals);
          setMontoIngresado(dataSession.activeSession.montoApertura);
        } else if (fetchedCajas.length > 0 && !selectedCajaId) {
          // Si no hay sesión activa, seleccionamos la primera caja de la lista
          setSelectedCajaId(fetchedCajas[0].id);
          setMontoIngresado(fetchedCajas[0].saldoActual);
        }
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCajaId]);

  useEffect(() => {
    fetchStatus();
  }, []); // Cargar inicial solo una vez

  // Efecto para recargar sesión cuando cambia la caja seleccionada
  useEffect(() => {
    if (selectedCajaId) {
      fetchSession(selectedCajaId);
    }
  }, [selectedCajaId]);

  const handleOpenBox = async (forceAdmin = false) => {
    if (!selectedCajaId) {
      toast.error("Seleccione una caja");
      return;
    }

    const saldoActualCaja = Number(selectedCaja?.saldoActual || 0);
    const montoApertura = Number(montoIngresado);

    // Validación de Discrepancia
    if (montoApertura !== saldoActualCaja && !forceAdmin) {
      setShowDiscrepancyAlert(true);
      return;
    }

    // Si es forzado por admin, validar observación
    if (montoApertura !== saldoActualCaja && forceAdmin && !observaciones.trim()) {
      toast.error("Las observaciones son obligatorias cuando hay diferencia de balance.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cajas/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "abrir",
          cajaId: selectedCajaId,
          monto: montoIngresado,
          observaciones: forceAdmin ? `[FORZADO ADMIN] - ${observaciones}` : observaciones,
          usuarioId: USUARIO_ID,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Caja abierta exitosamente");
        setActiveSession(data.data);
        setShowDiscrepancyAlert(false);
        setObservaciones("");
      } else {
        toast.error(data.error || "Error al abrir caja");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseBox = async (forceAdmin = false) => {
    if (!activeSession) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cajas/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cerrar",
          sessionId: activeSession.id,
          montoCierre: montoIngresado,
          observaciones: observaciones, // Enviar observaciones al cerrar
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Caja cerrada exitosamente");
        setActiveSession(null);
        setObservaciones("");
        // Recargar datos de la caja para actualizar el saldoActual
        fetchStatus();
      } else {
        toast.error(data.error || "Error al cerrar caja");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && cajas.length === 0) {
    return (
      <div className="p-24 text-center">
        <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
        <p className="text-muted-foreground animate-pulse font-black tracking-widest uppercase">
          Cargando gestión de caja...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in bg-background mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6 duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Wallet className="text-primary h-8 w-8" />
            Gestión de Sesiones
          </h1>
          <p className="text-muted-foreground mt-1">Control de apertura y cierre de cajas chicas y principal.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select value={selectedCajaId} onValueChange={setSelectedCajaId}>
              <SelectTrigger className="bg-muted/30 border-primary/20 h-10 font-bold">
                <SelectValue placeholder="Seleccionar Caja..." />
              </SelectTrigger>
              <SelectContent>
                {cajas.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Action Area */}
        <div className="space-y-6 lg:col-span-8">
          {activeSession ? (
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-emerald-50/50 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-emerald-900">
                      <Unlock className="h-5 w-5" /> Sesión en Curso: {selectedCaja?.nombre}
                    </CardTitle>
                    <CardDescription className="font-medium text-emerald-700">
                      La caja se encuentra operativa.
                    </CardDescription>
                  </div>
                  <Badge className="border-0 bg-emerald-500 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase hover:bg-emerald-600">
                    Activa
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Fondo Inicial</span>
                    <div className="text-2xl font-black text-slate-800">
                      {formatCurrency(activeSession.montoApertura)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Hora Apertura</span>
                    <div className="flex h-8 items-center gap-2 text-sm font-bold text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {activeSession.fechaApertura
                        ? new Date(activeSession.fechaApertura).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Usuario</span>
                    <div className="flex h-8 items-center gap-2 truncate text-sm font-bold text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      Admin
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-900">Operaciones Habilitadas</h4>
                    <p className="text-xs leading-relaxed text-blue-700">
                      Mientras la sesión esté activa, podrá registrar cobros de facturas y movimientos de gastos
                      vinculados a {selectedCaja?.nombre}.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <Button
                    onClick={() => setShowCloseDialog(true)}
                    variant="destructive"
                    className="h-11 bg-rose-600 px-6 font-bold shadow-sm hover:bg-rose-700"
                  >
                    <Lock className="mr-2 h-4 w-4" /> Cerrar Turno
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-black text-slate-800">
                  Apertura de Caja: {selectedCaja?.nombre || "..."}
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  Ingrese el monto para iniciar operaciones en esta caja.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 pt-0">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-muted/20 border-border/50 space-y-3 rounded-2xl border p-6">
                    <Label className="text-muted-foreground text-xs font-bold uppercase">Estado de Caja</Label>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500">Saldo Contable Actual:</p>
                      <p className="text-primary text-3xl font-black">
                        {formatCurrency(selectedCaja?.saldoActual || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label className="text-muted-foreground text-xs font-bold uppercase">
                      Monto de Apertura (Conteo Físico)
                    </Label>
                    <div className="relative">
                      <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        type="number"
                        className="h-14 pl-9 text-2xl font-black"
                        value={montoIngresado}
                        onChange={(e) => setMontoIngresado(e.target.value)}
                      />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 px-1 text-[10px] font-medium">
                      <AlertCircle className="h-3 w-3" /> Debe coincidir con el saldo contable arriba.
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-bold uppercase">Observaciones de Apertura</Label>
                  <Textarea
                    placeholder="Detalles adicionales sobre el fondo..."
                    className="min-h-[100px] bg-slate-50/20"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => handleOpenBox()}
                  disabled={isSubmitting || !selectedCajaId}
                  className="h-12 w-full font-bold shadow-sm"
                >
                  {isSubmitting ? "Procesando..." : `Abrir Turno en ${selectedCaja?.nombre || "Caja"}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
            <CardHeader className="border-b border-white/10 p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                <History className="h-3 w-3" /> Estado del Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Estado:</span>
                {activeSession ? (
                  <Badge className="h-4 border-none bg-emerald-500 px-2 py-0 text-[9px] font-bold text-white hover:bg-emerald-600">
                    EN CURSO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-4 border-white/30 px-2 py-0 text-[9px] font-bold text-white">
                    CERRADO
                  </Badge>
                )}
              </div>
              <div className="space-y-2 border-t border-white/5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Caja Seleccionada:</span>
                  <span className="font-bold text-white">{selectedCaja?.nombre || "Ninguna"}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Saldo Contable:</span>
                  <span className="font-bold text-white">{formatCurrency(selectedCaja?.saldoActual || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-1 text-[11px]">
                  <span className="font-medium text-emerald-400">Ingresos Hoy:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(dailyTotals.ingresos)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-rose-400">Gastos Hoy:</span>
                  <span className="font-bold text-rose-400">{formatCurrency(dailyTotals.gastos)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b p-3 pb-1.5">
              <CardTitle className="text-muted-foreground text-[9px] font-black tracking-wider uppercase">
                Atajos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 p-2">
              <Button
                variant="ghost"
                className="h-8 w-full justify-start gap-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                onClick={() => (window.location.href = "/dashboard/facturas/pagar")}
              >
                <ArrowRightCircle className="text-primary h-3.5 w-3.5" /> Registrar Cobros
              </Button>
              <Button
                variant="ghost"
                className="h-8 w-full justify-start gap-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                onClick={() => (window.location.href = "/dashboard/contabilidad/ingresos-gastos")}
              >
                <ArrowRightCircle className="text-primary h-3.5 w-3.5" /> Reportar Gastos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discrepancy Alert Dialog */}
      <Dialog open={showDiscrepancyAlert} onOpenChange={setShowDiscrepancyAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-6 w-6" />
              Discrepancia de Balance
            </DialogTitle>
            <DialogDescription className="pt-2 font-medium text-slate-600">
              El monto de apertura ingresado ({formatCurrency(montoIngresado)}) no coincide con el saldo actual de la
              caja en el sistema ({formatCurrency(selectedCaja?.saldoActual || 0)}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-700">Acción Requerida:</p>
            <ul className="list-inside list-disc space-y-2 text-xs font-medium text-slate-600">
              <li>Verifique el conteo físico de la caja.</li>
              <li>Asegúrese de haber seleccionado la caja correcta.</li>
              <li>
                <strong>Si el valor es correcto:</strong> Comuníquese con el <u>Administrador del Sistema</u> para
                autorizar la apertura forzada.
              </li>
            </ul>
          </div>

          <DialogFooter className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setShowDiscrepancyAlert(false)}>
              Verificar Monto
            </Button>

            {IS_ADMIN && (
              <Button
                className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
                onClick={() => handleOpenBox(true)}
                disabled={isSubmitting}
              >
                <ShieldCheck className="h-4 w-4" /> Forzar Apertura (Admin)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="-mx-6 -mt-6 mb-6 rounded-t-lg bg-slate-900 p-6">
            <DialogTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5 text-rose-500" />
              Confirmar Cierre de Caja
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-400">
              Ingrese el monto final (efectivo en caja) para cerrar el turno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {activeSession ? (
              <>
                <div className="rounded border bg-slate-50 p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Fondo Inicial</span>
                  <span className="font-bold text-slate-700">{formatCurrency(activeSession.montoApertura)}</span>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Saldo Esperado</span>
                  <span className="border-b-2 border-slate-300 font-bold text-slate-900">
                    {formatCurrency(
                      Number(activeSession.montoApertura) +
                        Number(activeSession.totalIngresos || 0) -
                        Number(activeSession.totalGastos || 0),
                    )}
                  </span>
                </div>
                <div className="font-medium text-emerald-600">
                  + Ingresos: {formatCurrency(activeSession.totalIngresos || 0)}
                </div>
                <div className="font-medium text-rose-600">
                  - Gastos: {formatCurrency(activeSession.totalGastos || 0)}
                </div>
              </>
            ) : (
              <div className="col-span-2 p-4 text-center font-bold text-rose-500">No hay una sesión activa.</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <Label className="text-xs font-bold text-slate-500 uppercase">Total en Efectivo (Conteo Físico)</Label>
            <div className="relative w-full max-w-[200px]">
              <DollarSign className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="number"
                className="h-12 bg-white pl-10 text-center text-xl font-black"
                value={montoIngresado}
                onChange={(e) => setMontoIngresado(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Discrepancy Calculation */}
          {activeSession &&
            (() => {
              const esperado =
                Number(activeSession.montoApertura) +
                Number(activeSession.totalIngresos || 0) -
                Number(activeSession.totalGastos || 0);
              const real = Number(montoIngresado || 0);
              const diff = real - esperado;

              if (diff !== 0) {
                return (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-3 text-xs font-bold",
                      diff < 0
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-blue-200 bg-blue-50 text-blue-700",
                    )}
                  >
                    <AlertCircle className="h-4 w-4" />
                    {diff < 0 ? `Faltante: ${formatCurrency(Math.abs(diff))}` : `Sobrante: ${formatCurrency(diff)}`}
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Balance Cuadrado
                </div>
              );
            })()}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold uppercase">Observaciones de Cierre</Label>
            <Textarea
              placeholder="Comentarios sobre el cierre o justificación de diferencias..."
              className="min-h-[80px] bg-slate-50/20"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="px-4 text-center text-[11px] text-slate-500">
            Al cerrar la caja, se generará un reporte de cierre y no podrá registrar más movimientos hasta una nueva
            apertura.
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleCloseBox();
                setShowCloseDialog(false);
              }}
              disabled={isSubmitting}
              className="bg-rose-600 font-bold hover:bg-rose-700"
            >
              {isSubmitting ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
