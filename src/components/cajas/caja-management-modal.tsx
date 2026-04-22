"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const IS_ADMIN = true; 

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

interface CajaManagementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  usuarioId: string;
}

export function CajaManagementModal({
  isOpen,
  onOpenChange,
  onSuccess,
  usuarioId,
}: CajaManagementModalProps) {
  const [cajas, setCajas] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [dailyTotals, setDailyTotals] = useState({ ingresos: "0", gastos: "0" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCajaId, setSelectedCajaId] = useState("");
  const [montoIngresado, setMontoIngresado] = useState("0");
  const [montoCierreIngresado, setMontoCierreIngresado] = useState("0");
  const [observaciones, setObservaciones] = useState("");

  // Dialogs
  const [showDiscrepancyAlert, setShowDiscrepancyAlert] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const selectedCaja = cajas.find((c) => c.id === selectedCajaId);

  const fetchSession = useCallback(async (cajaId: string) => {
    if (!cajaId) {
      setActiveSession(null);
      setDailyTotals({ ingresos: "0", gastos: "0" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cajas/sesiones?cajaId=${cajaId}&usuarioId=${usuarioId}`);
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.activeSession);
        setDailyTotals(data.dailyTotals);
        if (data.activeSession) {
          setMontoIngresado(data.activeSession.montoApertura);
          const esperado =
            Number(data.activeSession.montoApertura || 0) +
            Number(data.activeSession.totalIngresos || 0) -
            Number(data.activeSession.totalGastos || 0);
          setMontoCierreIngresado(String(esperado));
        } else {
          const caja = cajas.find((c) => c.id === cajaId);
          if (caja) {
            setMontoIngresado(caja.saldoActual);
            setMontoCierreIngresado("0");
          }
        }
      }
    } catch (error) {
      toast.error("Error al cargar sesión de caja");
    } finally {
      setIsLoading(false);
    }
  }, [cajas]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const resLookup = await fetch("/api/contabilidad/lookup");
      const dataLookup = await resLookup.json();

      if (dataLookup.success) {
        const fetchedCajas = dataLookup.data.cajas;
        const sortedCajas = [...fetchedCajas].sort((a: any, b: any) => {
          const isAfuerte = a.nombre.toLowerCase().includes("caja fuerte");
          const isBfuerte = b.nombre.toLowerCase().includes("caja fuerte");
          if (isAfuerte && !isBfuerte) return 1;
          if (!isAfuerte && isBfuerte) return -1;
          return a.nombre.localeCompare(b.nombre);
        });
        setCajas(sortedCajas);

        if (sortedCajas.length > 0 && !selectedCajaId) {
          const principal = sortedCajas.find((c: any) => c.nombre.toLowerCase().includes("principal"));
          if (principal) {
            setSelectedCajaId(principal.id);
          } else {
            setSelectedCajaId(sortedCajas[0].id);
          }
        }
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCajaId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCajaId) {
      fetchSession(selectedCajaId);
    }
  }, [selectedCajaId, fetchSession]);

  const handleOpenBox = async (forceAdmin = false) => {
    if (!selectedCajaId) {
      toast.error("Seleccione una caja");
      return;
    }

    const saldoActualCaja = Number(selectedCaja?.saldoActual || 0);
    const montoApertura = Number(montoIngresado);

    if (montoApertura !== saldoActualCaja && !forceAdmin) {
      setShowDiscrepancyAlert(true);
      return;
    }

    if (montoApertura !== saldoActualCaja && forceAdmin && !observaciones.trim()) {
      toast.error("Las observaciones son obligatorias cuando hay diferencia.");
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
          usuarioId
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Caja abierta exitosamente");
        setActiveSession(data.data);
        setShowDiscrepancyAlert(false);
        setObservaciones("");
        onSuccess?.();
        // Cerramos el modal tras éxito
        onOpenChange(false);
      } else {
        toast.error(data.error || "Error al abrir caja");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseBox = async () => {
    if (!activeSession) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cajas/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cerrar",
          sessionId: activeSession.id,
          montoCierre: montoCierreIngresado,
          observaciones: observaciones,
          usuarioId
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Caja cerrada exitosamente");
        setActiveSession(null);
        setObservaciones("");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Error al cerrar caja");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  Gestión de Sesiones
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium pt-1">
                  Control de apertura y cierre de caja en tiempo real.
                </DialogDescription>
              </div>
              <div className="w-64">
                <Select value={selectedCajaId} onValueChange={setSelectedCajaId}>
                  <SelectTrigger className="bg-white/10 border-white/20 h-9 font-bold text-white">
                    <SelectValue placeholder="Seleccionar Caja..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cajas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[400px]">
            {/* Left: Action Form */}
            <div className="md:col-span-2 p-6 space-y-6">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="h-10 w-10 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                  <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">Actualizando datos...</p>
                </div>
              ) : activeSession ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Estado</span>
                      <div className="flex items-center gap-2 text-emerald-900 font-black">
                        <Unlock className="h-4 w-4" /> ACTIVA
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hora Apertura</span>
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Clock className="h-4 w-4" />
                        {activeSession.fechaApertura ? new Date(activeSession.fechaApertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 space-y-3">
                    <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4" /> Sesión Iniciada por {activeSession.usuarioNombre || 'Administrador'}
                    </h4>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                      La caja {selectedCaja?.nombre} está operativa. Todos los registros se vincularán a esta sesión.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowCloseDialog(true)}
                      className="h-11 px-8 bg-rose-600 font-bold hover:bg-rose-700 shadow-sm"
                    >
                      <Lock className="mr-2 h-4 w-4" /> Cerrar Turno
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo Contable</span>
                      <div className="text-2xl font-black text-primary">
                        {formatCurrency(selectedCaja?.saldoActual || 0)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Monto Apertura</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="number" 
                          className="h-12 pl-9 text-xl font-black"
                          value={montoIngresado}
                          onChange={(e) => setMontoIngresado(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Observaciones (Opcional)</Label>
                    <Textarea 
                      placeholder="Indique si hay alguna novedad..."
                      className="min-h-[100px] bg-slate-50/30"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={() => handleOpenBox()}
                    disabled={isSubmitting || !selectedCajaId}
                    className="h-12 w-full font-black tracking-widest uppercase shadow-md"
                  >
                    {isSubmitting ? "Procesando..." : `Abrir Turno en ${selectedCaja?.nombre || 'Caja'}`}
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Info Sidebar */}
            <div className="bg-slate-50 border-l p-6 space-y-6">
              <Card className="bg-slate-900 border-none shadow-lg text-white">
                <CardHeader className="p-4 pb-2 border-b border-white/5">
                  <CardTitle className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="h-3 w-3" /> Resumen Diario
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Ingresos:</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(dailyTotals.ingresos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Gastos:</span>
                    <span className="font-bold text-rose-400">{formatCurrency(dailyTotals.gastos)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Balance:</span>
                    <span className="font-black text-white">{formatCurrency(Number(dailyTotals.ingresos) - Number(dailyTotals.gastos))}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-2">
                   <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                     <ShieldCheck className="h-3.5 w-3.5" /> Seguridad
                   </div>
                   <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                     Asegúrese de contar el efectivo físico antes de abrir o cerrar. Cualquier diferencia será auditada.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discrepancy Alert */}
      <Dialog open={showDiscrepancyAlert} onOpenChange={setShowDiscrepancyAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Discrepancia
            </DialogTitle>
            <DialogDescription className="font-medium pt-2 text-slate-600">
               El monto ingresado ({formatCurrency(montoIngresado)}) no coincide con el sistema ({formatCurrency(selectedCaja?.saldoActual || 0)}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
             <Button variant="outline" onClick={() => setShowDiscrepancyAlert(false)} className="flex-1">Verificar</Button>
             {IS_ADMIN && (
               <Button onClick={() => handleOpenBox(true)} className="flex-1 bg-amber-600 hover:bg-amber-700">Forzar (Admin)</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Confirm */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-slate-900 -mx-6 -mt-6 p-6 rounded-t-lg">
             <DialogTitle className="text-white flex items-center gap-2">
               <Lock className="h-5 w-5 text-rose-500" /> Confirmar Cierre
             </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
               <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Fondo Inicial</span>
                  <div className="font-bold text-slate-800">{formatCurrency(activeSession?.montoApertura || 0)}</div>
               </div>
               <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Saldo Esperado</span>
                  <div className="font-black text-slate-900 border-b border-primary">
                    {formatCurrency(Number(activeSession?.montoApertura || 0) + Number(activeSession?.totalIngresos || 0) - Number(activeSession?.totalGastos || 0))}
                  </div>
               </div>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 border rounded-xl">
               <Label className="text-[10px] font-black uppercase text-muted-foreground">Efectivo Real en Caja</Label>
               <div className="relative w-full max-w-[180px]">
                 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input 
                   type="number"
                   className="h-12 pl-10 text-center text-xl font-black"
                   value={montoCierreIngresado}
                   onChange={(e) => setMontoCierreIngresado(e.target.value)}
                 />
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-muted-foreground">Observaciones de Cierre</Label>
               <Textarea 
                 className="min-h-[80px]"
                 value={observaciones}
                 onChange={(e) => setObservaciones(e.target.value)}
                 placeholder="Justifique discrepancias si existen..."
               />
            </div>
          </div>
          <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
             <Button onClick={handleCloseBox} className="bg-rose-600 hover:bg-rose-700 font-bold">Confirmar Cierre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
