"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  History,
  Landmark,
  RefreshCw,
  Receipt,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardStat = { count: number; monto?: number };

type Cards = {
  pendiente: CardStat;
  parcial: CardStat;
  adelantado: CardStat;
  pagada: CardStat;
};

type OverdueInvoice = {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  total: string;
  estado: string;
  montoPendiente: string;
  diasTranscurridos: number;
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  fotoUrl: string | null;
};

type LatePayer = {
  cliente_id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  foto_url: string | null;
  total_pagos: number;
  pagos_tardios: number;
  pct_tardio: number;
  promedio_dias: number;
};

type ParcialClient = {
  cliente_id: string;
  nombre: string;
  apellidos: string | null;
  total_parciales: number;
  monto_pendiente: string;
};

type ApiData = {
  cards: Cards;
  overdueInvoices: OverdueInvoice[];
  latePayersRaw: LatePayer[];
  parcialesChart: ParcialClient[];
};

type LookupData = {
  cuentasBancarias: { id: string; numeroCuenta: string; bankNombre?: string }[];
  cajas: { id: string; nombre: string }[];
};

type SessionData = {
  cajaId: string;
  cajaNombre?: string;
};

type HistorialPago = {
  pagoId: string;
  numeroPago: string;
  fechaPago: string;
  monto: string;
  metodoPago: string;
  numeroReferencia: string | null;
  estadoPago: string;
  facturaId: string;
  numeroFactura: string;
  fechaFactura: string;
  totalFactura: string;
  estadoFactura: string;
  diasDiferencia: number;
};

type HistorialData = {
  cliente: { nombre: string; apellidos: string | null; email: string | null } | null;
  pagos: HistorialPago[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | string) =>
  `RD$ ${Number(v ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const getInitials = (nombre: string, apellidos: string | null) => {
  const n = nombre?.charAt(0) ?? "";
  const a = apellidos?.charAt(0) ?? "";
  return (n + a).toUpperCase() || "?";
};

const riskColor = (pct: number) => {
  if (pct >= 75) return "bg-red-100 text-red-700 border-red-200";
  if (pct >= 50) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
};

const diasColor = (dias: number) => {
  if (dias >= 15) return "text-red-600 font-bold";
  if (dias >= 10) return "text-orange-600 font-bold";
  return "text-yellow-600 font-semibold";
};

// ─── Component ────────────────────────────────────────────────────────────────

const LATE_PAGE_SIZE = 8;

// ─── LatePayerRow (shared between preview and dialog) ─────────────────────────

function LatePayerRow({ client, onClick }: { client: LatePayer; onClick: (c: LatePayer) => void }) {
  return (
    <div
      className="border-border/60 hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
      onClick={() => onClick(client)}
    >
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
          {getInitials(client.nombre, client.apellidos)}
        </div>
        <div>
          <p className="text-sm leading-none font-semibold">
            {client.nombre} {client.apellidos}
          </p>
          {client.email && <p className="text-muted-foreground mt-0.5 text-[10px]">{client.email}</p>}
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            Promedio: <span className="font-bold">{client.promedio_dias} días</span> · {client.pagos_tardios}/
            {client.total_pagos} pagos tardíos
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${riskColor(client.pct_tardio)}`}
        >
          {client.pct_tardio}%
        </span>
        <History className="text-muted-foreground h-3.5 w-3.5" />
      </div>
    </div>
  );
}

export default function CuentasPorCobrarPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [lookup, setLookup] = useState<LookupData>({ cuentasBancarias: [], cajas: [] });
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [latePage, setLatePage] = useState(1);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialData, setHistorialData] = useState<HistorialData | null>(null);
  const [historialLoading, setHistorialLoading] = useState(false);

  // Payment modal state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [monto, setMonto] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const openHistorial = useCallback(async (client: LatePayer) => {
    setHistorialData(null);
    setHistorialOpen(true);
    setHistorialLoading(true);
    try {
      const res = await fetch(`/api/contabilidad/cuentas-por-cobrar/historial?clienteId=${client.cliente_id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Error");
      setHistorialData(json as HistorialData);
    } catch {
      toast.error("Error al cargar historial");
      setHistorialOpen(false);
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resMain, resLookup, resSession] = await Promise.all([
        fetch("/api/contabilidad/cuentas-por-cobrar"),
        fetch("/api/contabilidad/lookup"),
        fetch("/api/cajas/sesiones"),
      ]);

      const [jsonMain, jsonLookup, jsonSession] = await Promise.all([
        resMain.json(),
        resLookup.json(),
        resSession.json(),
      ]);

      if (!jsonMain.success) throw new Error(jsonMain.error ?? "Error");
      setData(jsonMain as ApiData);

      if (jsonLookup?.success) {
        setLookup({
          cuentasBancarias: jsonLookup.data?.cuentasBancarias ?? [],
          cajas: jsonLookup.data?.cajas ?? [],
        });
      }

      if (jsonSession?.success) {
        setActiveSession(jsonSession.activeSession ?? null);
      }
    } catch {
      toast.error("Error al cargar cuentas por cobrar");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPaymentForm = useCallback(() => {
    setMonto("");
    setDescuento("0");
    setMetodoPago("efectivo");
    setReferencia("");
    setCuentaBancariaId("");
    setObservaciones("");
    if (activeSession?.cajaId) {
      setCajaId(activeSession.cajaId);
    } else if (lookup.cajas[0]?.id) {
      setCajaId(lookup.cajas[0].id);
    } else {
      setCajaId("");
    }
  }, [activeSession, lookup.cajas]);

  const openPaymentModal = useCallback(
    (invoice: OverdueInvoice) => {
      setSelectedInvoice(invoice);
      setPaymentOpen(true);
      setMonto(String(invoice.montoPendiente ?? 0));
      setDescuento("0");
      setMetodoPago("efectivo");
      setReferencia("");
      setCuentaBancariaId("");
      setObservaciones("");
      if (activeSession?.cajaId) {
        setCajaId(activeSession.cajaId);
      } else if (lookup.cajas[0]?.id) {
        setCajaId(lookup.cajas[0].id);
      } else {
        setCajaId("");
      }
    },
    [activeSession, lookup.cajas],
  );

  const closePaymentModal = useCallback(() => {
    setPaymentOpen(false);
    setSelectedInvoice(null);
    resetPaymentForm();
  }, [resetPaymentForm]);

  const handleProcessPayment = useCallback(async () => {
    if (!selectedInvoice) return;

    const balancePendiente = Number(selectedInvoice.montoPendiente || 0);
    const montoNumerico = Number(monto || 0);
    const descuentoNumerico = Number(descuento || 0);
    const totalAplicado = montoNumerico + descuentoNumerico;

    if (!selectedInvoice.id || !selectedInvoice.clienteId || !metodoPago) {
      toast.error("Faltan datos para procesar el pago.");
      return;
    }

    if (!Number.isFinite(montoNumerico) || !Number.isFinite(descuentoNumerico)) {
      toast.error("Monto o descuento inválido.");
      return;
    }

    if (montoNumerico < 0) {
      toast.error("El monto no puede ser negativo.");
      return;
    }

    if (descuentoNumerico < 0) {
      toast.error("El descuento no puede ser negativo.");
      return;
    }

    if (totalAplicado <= 0) {
      toast.error("El monto o descuento debe ser mayor a 0.");
      return;
    }

    if (totalAplicado > balancePendiente) {
      toast.error("El total aplicado (monto + descuento) no puede superar el saldo pendiente.");
      return;
    }

    if (metodoPago === "efectivo" && !activeSession) {
      toast.error("Debe abrir una caja para pagos en efectivo.");
      return;
    }

    if (metodoPago === "efectivo" && !cajaId) {
      toast.error("Seleccione una caja para pagos en efectivo.");
      return;
    }

    if (metodoPago !== "efectivo" && !cuentaBancariaId) {
      toast.error("Seleccione una cuenta para depósito.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch("/api/facturas/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaId: selectedInvoice.id,
          clienteId: selectedInvoice.clienteId,
          monto: montoNumerico.toString(),
          descuento: descuentoNumerico.toString(),
          metodoPago,
          numeroReferencia: referencia,
          cajaId: metodoPago === "efectivo" ? cajaId : null,
          cuentaBancariaId: metodoPago !== "efectivo" ? cuentaBancariaId : null,
          observaciones,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Error procesando pago");
      }

      toast.success("Pago procesado correctamente");
      closePaymentModal();
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message ?? "Error al procesar el pago");
    } finally {
      setIsSubmittingPayment(false);
    }
  }, [
    activeSession,
    cajaId,
    closePaymentModal,
    cuentaBancariaId,
    descuento,
    fetchData,
    metodoPago,
    monto,
    observaciones,
    referencia,
    selectedInvoice,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived ──
  const cards = data?.cards ?? {
    pendiente: { count: 0, monto: 0 },
    parcial: { count: 0, monto: 0 },
    adelantado: { count: 0, monto: 0 },
    pagada: { count: 0 },
  };

  const overdueInvoices = data?.overdueInvoices ?? [];
  const latePayers = data?.latePayersRaw ?? [];
  const parcialesChart = data?.parcialesChart ?? [];
  const maxParciales = Math.max(...parcialesChart.map((c) => c.total_parciales), 1);

  // Late payers pagination
  const lateTotal = latePayers.length;
  const lateTotalPages = Math.max(1, Math.ceil(lateTotal / LATE_PAGE_SIZE));
  const latePageSafe = Math.min(latePage, lateTotalPages);
  const latePagedRows = latePayers.slice((latePageSafe - 1) * LATE_PAGE_SIZE, latePageSafe * LATE_PAGE_SIZE);
  const latePreview = latePayers.slice(0, 6);
  const balancePendiente = Number(selectedInvoice?.montoPendiente ?? 0);
  const montoNumerico = Number(monto || 0);
  const descuentoNumerico = Number(descuento || 0);
  const totalAplicado = montoNumerico + descuentoNumerico;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <p className="text-sm">Cargando cuentas por cobrar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Receipt className="text-primary h-6 w-6" />
            Cuentas por Cobrar
          </h1>
          <p className="text-muted-foreground text-sm">Seguimiento de facturas pendientes y análisis de cobranza</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* ── Cards de Estado ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Pendiente */}
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-tight uppercase">
              Pendiente
            </CardTitle>
            <Clock className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{cards.pendiente.count}</div>
            <p className="text-muted-foreground mt-0.5 text-xs">{fmt(cards.pendiente.monto ?? 0)}</p>
          </CardContent>
        </Card>

        {/* Pago Parcial */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-tight uppercase">
              Pago Parcial
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{cards.parcial.count}</div>
            <p className="text-muted-foreground mt-0.5 text-xs">{fmt(cards.parcial.monto ?? 0)}</p>
          </CardContent>
        </Card>

        {/* Pago Adelantado */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-tight uppercase">
              Pago Adelantado
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{cards.adelantado.count}</div>
            <p className="text-muted-foreground mt-0.5 text-xs">{fmt(cards.adelantado.monto ?? 0)}</p>
          </CardContent>
        </Card>

        {/* Pagadas */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-tight uppercase">
              Pagadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{cards.pagada.count}</div>
            <p className="text-muted-foreground mt-0.5 text-xs">Total histórico</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Facturas con más de 5 días pendientes ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Facturas Pendientes de Cobro (+5 días)
              </CardTitle>
              <CardDescription>
                Facturas en estado <span className="font-semibold text-rose-600">pendiente</span> con más de 5 días
                desde su emisión
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {overdueInvoices.length} FACTURAS
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {overdueInvoices.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-sm font-medium">No hay facturas pendientes con más de 5 días</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="text-primary font-mono text-xs font-bold">{inv.numeroFactura}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase">
                          {getInitials(inv.clienteNombre, inv.clienteApellidos)}
                        </div>
                        <div>
                          <p className="text-sm leading-none font-medium">
                            {inv.clienteNombre} {inv.clienteApellidos}
                          </p>
                          {inv.clienteEmail && <p className="text-muted-foreground text-[10px]">{inv.clienteEmail}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(inv.fechaFactura)}</TableCell>
                    <TableCell className="text-center">
                      <span className={diasColor(inv.diasTranscurridos)}>{inv.diasTranscurridos}d</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmt(inv.total)}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-rose-600">{fmt(inv.montoPendiente)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-[11px] font-semibold"
                        onClick={() => openPaymentModal(inv)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Segunda fila: Clientes morosos + Gráfica pago parcial ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clientes con pagos tardíos */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-orange-500" />
                  Clientes con Pagos Tardíos
                </CardTitle>
                <CardDescription>Clientes que frecuentemente pagan después de 4+ días</CardDescription>
              </div>
              {lateTotal > 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => {
                    setLatePage(1);
                    setLateDialogOpen(true);
                  }}
                >
                  Ver todos ({lateTotal})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {latePayers.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-8">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <p className="text-sm">Sin datos de pagos tardíos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {latePreview.map((client) => (
                  <LatePayerRow key={client.cliente_id} client={client} onClick={openHistorial} />
                ))}
                {lateTotal > 6 && (
                  <p className="text-muted-foreground pt-1 text-center text-[11px]">
                    Mostrando 6 de {lateTotal} clientes.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog: todos los clientes con pagos tardíos + paginación */}
        <Dialog open={lateDialogOpen} onOpenChange={setLateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Clientes con Pagos Tardíos
                <Badge variant="secondary" className="ml-1 text-[10px] font-bold">
                  {lateTotal}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {latePagedRows.map((client) => (
                <LatePayerRow key={client.cliente_id} client={client} onClick={openHistorial} />
              ))}
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-muted-foreground text-xs">
                Página {latePageSafe} de {lateTotalPages} · {lateTotal} clientes
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={latePageSafe <= 1}
                  onClick={() => setLatePage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: lateTotalPages }, (_, i) => i + 1).map((pg) => (
                  <Button
                    key={pg}
                    variant={pg === latePageSafe ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => setLatePage(pg)}
                  >
                    {pg}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={latePageSafe >= lateTotalPages}
                  onClick={() => setLatePage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Gráfica clientes con pago parcial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Clientes con Más Facturas en Pago Parcial
            </CardTitle>
            <CardDescription>Top clientes con saldo pendiente en facturas parciales</CardDescription>
          </CardHeader>
          <CardContent>
            {parcialesChart.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-8">
                <AlertCircle className="text-muted-foreground/50 h-6 w-6" />
                <p className="text-sm">No hay facturas con pago parcial</p>
              </div>
            ) : (
              <div className="space-y-3">
                {parcialesChart.map((client, idx) => {
                  const barPct = Math.max((client.total_parciales / maxParciales) * 100, 4);
                  return (
                    <div key={client.cliente_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-5 text-right text-[11px] font-bold">#{idx + 1}</span>
                          <span className="font-medium">
                            {client.nombre} {client.apellidos}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[11px]">{fmt(client.monto_pendiente)}</span>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                            {client.total_parciales} fact.
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog: Historial de pagos del cliente ── */}
      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-orange-500" />
              Historial de Pagos
              {historialData?.cliente && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  — {historialData.cliente.nombre} {historialData.cliente.apellidos}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {historialLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : historialData?.pagos.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <p className="text-sm">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha Factura</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialData?.pagos.map((p) => (
                    <TableRow key={p.pagoId}>
                      <TableCell>
                        <span className="text-primary font-mono text-xs font-bold">{p.numeroFactura}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtDate(p.fechaFactura)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(p.fechaPago)}</TableCell>
                      <TableCell className="text-center">
                        <span className={diasColor(p.diasDiferencia)}>{p.diasDiferencia}d</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm capitalize">{p.metodoPago}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(p.monto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pago de factura ── */}
      <Dialog open={paymentOpen} onOpenChange={(open) => (!open ? closePaymentModal() : setPaymentOpen(open))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="text-primary h-5 w-5" />
              Registrar Pago de Factura
            </DialogTitle>
            <DialogDescription>
              Aplica abonos y descuentos respetando el saldo pendiente de la factura.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice ? (
            <div className="space-y-5">
              <div className="bg-muted/30 grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Factura</p>
                  <p className="text-primary font-mono text-sm font-bold">{selectedInvoice.numeroFactura}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Cliente</p>
                  <p className="text-sm font-semibold">
                    {selectedInvoice.clienteNombre} {selectedInvoice.clienteApellidos}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Total Factura</p>
                  <p className="text-sm font-semibold">{fmt(selectedInvoice.total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Saldo Pendiente</p>
                  <p className="text-sm font-bold text-rose-600">{fmt(selectedInvoice.montoPendiente)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wide uppercase">Monto a pagar</Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wide uppercase">Descuento</Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      value={descuento}
                      onChange={(e) => setDescuento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wide uppercase">Método</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wide uppercase">
                    {metodoPago === "efectivo" ? "Caja" : "Cuenta de depósito"}
                  </Label>
                  {metodoPago === "efectivo" ? (
                    <Select value={cajaId} onValueChange={setCajaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {lookup.cajas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={cuentaBancariaId} onValueChange={setCuentaBancariaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {lookup.cuentasBancarias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.numeroCuenta} {c.bankNombre ? `- ${c.bankNombre}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wide uppercase">Referencia</Label>
                  <Input
                    placeholder="No. comprobante"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  <div className="mb-1 flex items-center gap-1 font-semibold tracking-wide uppercase">
                    <Landmark className="h-3.5 w-3.5" />
                    Control de caja
                  </div>
                  <p>
                    {metodoPago === "efectivo"
                      ? activeSession
                        ? `Caja activa: ${activeSession.cajaNombre ?? "Caja"}`
                        : "No hay caja activa para efectivo"
                      : "Para banco/tarjeta se requiere cuenta de depósito."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold tracking-wide uppercase">Observaciones</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
              </div>

              <div className="bg-muted/20 rounded-xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total aplicado (monto + descuento)</span>
                  <span className="font-semibold">{fmt(totalAplicado)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo luego del pago</span>
                  <span className="text-primary font-bold">{fmt(Math.max(0, balancePendiente - totalAplicado))}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closePaymentModal} disabled={isSubmittingPayment}>
                  Cancelar
                </Button>
                <Button onClick={handleProcessPayment} disabled={isSubmittingPayment} className="gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  {isSubmittingPayment ? "Procesando..." : "Confirmar pago"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
