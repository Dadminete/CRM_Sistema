"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
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
import { subscribeFinanzasUpdates } from "@/lib/finanzas-sync";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthHistory = {
  month: string;
  totalPagado: number;
  cantidadPagos: number;
  pagos: Array<{ id: string; monto: number; fechaPago: string; metodoPago: string; numeroReferencia?: string | null }>;
};

type Account = {
  id: string;
  proveedorId: string | null;
  proveedorNombre: string | null;
  numeroDocumento: string;
  tipoDocumento: string;
  fechaEmision: string;
  fechaVencimiento: string;
  concepto: string;
  montoOriginal: number;
  montoPendiente: number;
  cuotaMensual: number | null;
  moneda: string;
  estado: "pendiente" | "parcial" | "pagada";
  diasVencido: number;
  observaciones: string | null;
  numeroCuotas: number | null;
  tipo: string;
  monthlyHistory: MonthHistory[];
  pagosRecientes: Array<{
    id: string;
    monto: number;
    fechaPago: string;
    metodoPago: string;
    numeroReferencia?: string | null;
  }>;
};

type Summary = {
  totalOriginal: number;
  totalPendiente: number;
  totalPagado: number;
  cantidadCuentas: number;
  cantidadVencidas: number;
};

type MonthlySummaryItem = { month: string; totalPagado: number };

type Recommendation = { title: string; detail: string; priority: "alta" | "media" | "baja" };

type ApiData = {
  summary: Summary;
  monthlySummary: MonthlySummaryItem[];
  recommendations: Recommendation[];
  accounts: Account[];
};

type FormData = {
  proveedorId: string;
  numeroDocumento: string;
  tipoDocumento: string;
  fechaEmision: string;
  fechaVencimiento: string;
  concepto: string;
  montoOriginal: string;
  montoPendiente: string;
  cuotaMensual: string;
  moneda: string;
  observaciones: string;
  numeroCuotas: string;
  tipo: string;
  estado: string;
};

type FilterTab = "activas" | "pendiente" | "vencida" | "pagada" | "todas";

const emptyForm: FormData = {
  proveedorId: "",
  numeroDocumento: "",
  tipoDocumento: "factura",
  fechaEmision: new Date().toISOString().split("T")[0],
  fechaVencimiento: "",
  concepto: "",
  montoOriginal: "",
  montoPendiente: "",
  cuotaMensual: "",
  moneda: "DOP",
  observaciones: "",
  numeroCuotas: "",
  tipo: "factura",
  estado: "pendiente",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, moneda = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: moneda, minimumFractionDigits: 2 }).format(n);
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

function getEstadoBadge(estado: Account["estado"], diasVencido: number) {
  if (estado === "pagada")
    return (
      <Badge className="border border-green-300 bg-green-100 text-green-800">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Pagada
      </Badge>
    );
  if (diasVencido > 0)
    return (
      <Badge className="border border-red-300 bg-red-100 text-red-800">
        <AlertCircle className="mr-1 h-3 w-3" />
        Vencida {diasVencido}d
      </Badge>
    );
  if (estado === "parcial")
    return (
      <Badge className="border border-yellow-300 bg-yellow-100 text-yellow-800">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Parcial
      </Badge>
    );
  return (
    <Badge className="border border-blue-300 bg-blue-100 text-blue-800">
      <CreditCard className="mr-1 h-3 w-3" />
      Pendiente
    </Badge>
  );
}

function getPriorityBadge(priority: Recommendation["priority"]) {
  if (priority === "alta") return <Badge className="border border-red-300 bg-red-100 text-xs text-red-800">Alta</Badge>;
  if (priority === "media")
    return <Badge className="border border-yellow-300 bg-yellow-100 text-xs text-yellow-800">Media</Badge>;
  return <Badge className="border border-green-300 bg-green-100 text-xs text-green-800">Baja</Badge>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CuentasPorPagarPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("activas");

  const lastFetch = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < 5000) return;
    lastFetch.current = now;

    try {
      const res = await fetch("/api/contabilidad/cuentas-por-pagar", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.success) setData(json.data as ApiData);
    } catch {
      // silently ignore background refresh errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(), 30_000);
    const unsub = subscribeFinanzasUpdates(() => fetchData(true));

    const handleFocus = () => fetchData();
    const handleVisible = () => {
      if (!document.hidden) fetchData();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(interval);
      unsub();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [fetchData]);

  // ─── Form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(account: Account) {
    setEditingId(account.id);
    setForm({
      proveedorId: account.proveedorId ?? "",
      numeroDocumento: account.numeroDocumento,
      tipoDocumento: account.tipoDocumento,
      fechaEmision: account.fechaEmision,
      fechaVencimiento: account.fechaVencimiento,
      concepto: account.concepto,
      montoOriginal: String(account.montoOriginal),
      montoPendiente: String(account.montoPendiente),
      cuotaMensual: account.cuotaMensual != null ? String(account.cuotaMensual) : "",
      moneda: account.moneda,
      observaciones: account.observaciones ?? "",
      numeroCuotas: account.numeroCuotas != null ? String(account.numeroCuotas) : "",
      tipo: account.tipo,
      estado: account.estado,
    });
    setShowModal(true);
  }

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (
      !form.numeroDocumento ||
      !form.concepto ||
      !form.montoOriginal ||
      !form.fechaEmision ||
      !form.fechaVencimiento
    ) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        proveedorId: form.proveedorId || null,
        numeroDocumento: form.numeroDocumento,
        tipoDocumento: form.tipoDocumento,
        fechaEmision: form.fechaEmision,
        fechaVencimiento: form.fechaVencimiento,
        concepto: form.concepto,
        montoOriginal: form.montoOriginal,
        cuotaMensual: form.cuotaMensual || null,
        moneda: form.moneda,
        observaciones: form.observaciones || null,
        numeroCuotas: form.numeroCuotas || null,
        tipo: form.tipo,
      };

      if (editingId) {
        payload.id = editingId;
        if (form.montoPendiente !== "") payload.montoPendiente = form.montoPendiente;
        payload.estadoManual = form.estado;
      }

      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/contabilidad/cuentas-por-pagar", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Error al guardar");

      toast.success(editingId ? "Cuenta actualizada" : "Cuenta creada");
      setShowModal(false);
      await fetchData(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/contabilidad/cuentas-por-pagar?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Error al eliminar");
      toast.success("Cuenta eliminada");
      setDeleteConfirmId(null);
      await fetchData(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <p className="text-sm">Cargando cuentas por pagar...</p>
        </div>
      </div>
    );
  }

  const { summary, recommendations, accounts, monthlySummary } = data ?? {
    summary: { totalOriginal: 0, totalPendiente: 0, totalPagado: 0, cantidadCuentas: 0, cantidadVencidas: 0 },
    recommendations: [],
    accounts: [],
    monthlySummary: [],
  };

  const maxMonthly = Math.max(...(monthlySummary?.map((m) => m.totalPagado) ?? [0]), 1);

  const filteredAccounts = accounts.filter((a) => {
    if (filterTab === "todas") return true;
    if (filterTab === "pagada") return a.estado === "pagada";
    if (filterTab === "vencida") return a.diasVencido > 0 && a.montoPendiente > 0;
    if (filterTab === "pendiente") return a.estado !== "pagada" && a.diasVencido === 0;
    return a.estado !== "pagada"; // activas
  });

  const countActivas = accounts.filter((a) => a.estado !== "pagada").length;
  const countPendiente = accounts.filter((a) => a.estado !== "pagada" && a.diasVencido === 0).length;
  const countVencida = accounts.filter((a) => a.diasVencido > 0 && a.montoPendiente > 0).length;
  const countPagada = accounts.filter((a) => a.estado === "pagada").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuentas por Pagar</h1>
          <p className="text-muted-foreground text-sm">Gestión de obligaciones pendientes con proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Original</CardDescription>
            <CardTitle className="text-xl text-blue-600">{fmt(summary.totalOriginal)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">{summary.cantidadCuentas} cuenta(s) registrada(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Saldo Pendiente</CardDescription>
            <CardTitle className="text-xl text-orange-600">{fmt(summary.totalPendiente)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {summary.totalOriginal > 0
                ? `${((summary.totalPendiente / summary.totalOriginal) * 100).toFixed(1)}% del total`
                : "Sin deuda"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Pagado</CardDescription>
            <CardTitle className="text-xl text-green-600">{fmt(summary.totalPagado)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {summary.totalOriginal > 0
                ? `${((summary.totalPagado / summary.totalOriginal) * 100).toFixed(1)}% completado`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Cuentas Vencidas</CardDescription>
            <CardTitle className={`text-xl ${summary.cantidadVencidas > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.cantidadVencidas}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              {summary.cantidadVencidas > 0 ? "Requieren atención inmediata" : "Sin atrasos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Payment Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pagos por Mes (últimos 12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySummary && monthlySummary.length > 0 ? (
              <div className="flex h-32 items-end gap-1">
                {monthlySummary.map((item) => {
                  const heightPct = (item.totalPagado / maxMonthly) * 100;
                  const [year, month] = item.month.split("-");
                  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("es-DO", {
                    month: "short",
                  });
                  return (
                    <div key={item.month} className="group flex flex-1 flex-col items-center gap-1">
                      <div className="relative w-full">
                        <div
                          className="w-full rounded-sm bg-blue-500 transition-all group-hover:bg-blue-600"
                          style={{ height: `${Math.max(heightPct, item.totalPagado > 0 ? 4 : 0)}px` }}
                          title={`${item.month}: ${fmt(item.totalPagado)}`}
                        />
                      </div>
                      <span className="text-muted-foreground text-[9px]">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">Sin historial de pagos</p>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-muted/50 flex gap-2 rounded-md p-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    {getPriorityBadge(rec.priority)}
                    <span className="truncate text-xs font-medium">{rec.title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-tight">{rec.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Listado de Cuentas</CardTitle>
              <CardDescription>
                {filteredAccounts.length} de {accounts.length} cuenta(s)
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  {
                    key: "activas",
                    label: "Activas",
                    count: countActivas,
                    active: "bg-blue-600 text-white border-blue-600",
                    inactive: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
                  },
                  {
                    key: "pendiente",
                    label: "Pendiente",
                    count: countPendiente,
                    active: "bg-orange-600 text-white border-orange-600",
                    inactive: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
                  },
                  {
                    key: "vencida",
                    label: "Vencida",
                    count: countVencida,
                    active: "bg-red-600 text-white border-red-600",
                    inactive: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
                  },
                  {
                    key: "pagada",
                    label: "Pagada",
                    count: countPagada,
                    active: "bg-green-600 text-white border-green-600",
                    inactive: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                  },
                  {
                    key: "todas",
                    label: "Todas",
                    count: accounts.length,
                    active: "bg-gray-700 text-white border-gray-700",
                    inactive: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
                  },
                ] as const
              ).map(({ key, label, count, active, inactive }) => (
                <button
                  key={key}
                  onClick={() => setFilterTab(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterTab === key ? active : inactive}`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterTab === key ? "bg-white/30" : "bg-current/10"}`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No hay cuentas por pagar registradas.{" "}
              <button className="text-primary underline" onClick={openCreate}>
                Crear la primera
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No hay cuentas con el filtro seleccionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Concepto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>N° Documento</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Monto Original</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <>
                    <TableRow
                      key={account.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                    >
                      <TableCell>
                        {expandedId === account.id ? (
                          <ChevronUp className="text-muted-foreground h-4 w-4" />
                        ) : (
                          <ChevronDown className="text-muted-foreground h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">{account.concepto}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{account.proveedorNombre ?? "—"}</TableCell>
                      <TableCell className="text-sm">{account.numeroDocumento}</TableCell>
                      <TableCell className="text-sm">{fmtDate(account.fechaVencimiento)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(account.montoOriginal, account.moneda)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {account.montoPendiente > 0 ? (
                          <span className={account.diasVencido > 0 ? "text-red-600" : "text-orange-600"}>
                            {fmt(account.montoPendiente, account.moneda)}
                          </span>
                        ) : (
                          <span className="text-green-600">{fmt(0, account.moneda)}</span>
                        )}
                      </TableCell>
                      <TableCell>{getEstadoBadge(account.estado, account.diasVencido)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(account.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row: payment history */}
                    {expandedId === account.id && (
                      <TableRow key={`${account.id}-expand`} className="bg-muted/30">
                        <TableCell colSpan={9} className="p-4">
                          <div className="space-y-4">
                            {/* Account details */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              <div>
                                <p className="text-muted-foreground text-xs">Tipo</p>
                                <p className="text-sm font-medium capitalize">{account.tipo}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Tipo Documento</p>
                                <p className="text-sm font-medium capitalize">{account.tipoDocumento}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Fecha Emisión</p>
                                <p className="text-sm font-medium">{fmtDate(account.fechaEmision)}</p>
                              </div>
                              {account.cuotaMensual != null && (
                                <div>
                                  <p className="text-muted-foreground text-xs">Cuota Mensual</p>
                                  <p className="text-sm font-medium">{fmt(account.cuotaMensual, account.moneda)}</p>
                                </div>
                              )}
                              {account.numeroCuotas != null && (
                                <div>
                                  <p className="text-muted-foreground text-xs">N° Cuotas</p>
                                  <p className="text-sm font-medium">{account.numeroCuotas}</p>
                                </div>
                              )}
                              {account.observaciones && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-xs">Observaciones</p>
                                  <p className="text-sm">{account.observaciones}</p>
                                </div>
                              )}
                            </div>

                            {/* Payment progress */}
                            <div>
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-muted-foreground">Progreso de pago</span>
                                <span className="font-medium">
                                  {account.montoOriginal > 0
                                    ? `${(((account.montoOriginal - account.montoPendiente) / account.montoOriginal) * 100).toFixed(1)}%`
                                    : "0%"}
                                </span>
                              </div>
                              <div className="bg-muted h-2 overflow-hidden rounded-full">
                                <div
                                  className="h-full rounded-full bg-green-500 transition-all"
                                  style={{
                                    width:
                                      account.montoOriginal > 0
                                        ? `${Math.min(100, ((account.montoOriginal - account.montoPendiente) / account.montoOriginal) * 100)}%`
                                        : "0%",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Recent payments */}
                            {account.pagosRecientes.length > 0 && (
                              <div>
                                <p className="text-muted-foreground mb-2 text-xs font-semibold">Pagos recientes</p>
                                <div className="space-y-1">
                                  {account.pagosRecientes.map((pago) => (
                                    <div
                                      key={pago.id}
                                      className="border-border/50 flex items-center justify-between border-b py-1 text-xs last:border-0"
                                    >
                                      <span className="text-muted-foreground">{fmtDate(pago.fechaPago)}</span>
                                      <span className="text-muted-foreground capitalize">{pago.metodoPago}</span>
                                      {pago.numeroReferencia && (
                                        <span className="text-muted-foreground text-[11px]">
                                          Ref: {pago.numeroReferencia}
                                        </span>
                                      )}
                                      <span className="font-semibold text-green-700">
                                        {fmt(pago.monto, account.moneda)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Monthly history grid */}
                            <div>
                              <p className="text-muted-foreground mb-2 text-xs font-semibold">
                                Historial mensual (12 meses)
                              </p>
                              <div className="grid grid-cols-6 gap-1 md:grid-cols-12">
                                {account.monthlyHistory.map((h) => {
                                  const [y, m] = h.month.split("-");
                                  const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("es-DO", {
                                    month: "short",
                                  });
                                  return (
                                    <div
                                      key={h.month}
                                      className={`rounded p-1 text-center text-[10px] ${
                                        h.totalPagado > 0
                                          ? "bg-green-100 text-green-800"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                      title={`${h.month}: ${fmt(h.totalPagado, account.moneda)}`}
                                    >
                                      <div className="font-semibold">{label}</div>
                                      <div>
                                        {h.totalPagado > 0
                                          ? fmt(h.totalPagado, account.moneda).replace("DOP", "").trim()
                                          : "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cuenta por Pagar" : "Nueva Cuenta por Pagar"}</DialogTitle>
            <DialogDescription>Completa la información de la obligación</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setField("tipo", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factura">Factura</SelectItem>
                    <SelectItem value="prestamo">Préstamo</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Tipo Documento *</Label>
                <Select value={form.tipoDocumento} onValueChange={(v) => setField("tipoDocumento", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factura">Factura</SelectItem>
                    <SelectItem value="recibo">Recibo</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && (
              <div className="space-y-1">
                <Label>Estatus</Label>
                <Select value={form.estado} onValueChange={(v) => setField("estado", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Concepto *</Label>
              <Input
                value={form.concepto}
                onChange={(e) => setField("concepto", e.target.value)}
                placeholder="Descripción de la cuenta por pagar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>N° Documento *</Label>
                <Input
                  value={form.numeroDocumento}
                  onChange={(e) => setField("numeroDocumento", e.target.value)}
                  placeholder="FAC-001"
                />
              </div>

              <div className="space-y-1">
                <Label>Moneda</Label>
                <Select value={form.moneda} onValueChange={(v) => setField("moneda", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOP">DOP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha Emisión *</Label>
                <Input
                  type="date"
                  value={form.fechaEmision}
                  onChange={(e) => setField("fechaEmision", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha Vencimiento *</Label>
                <Input
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={(e) => setField("fechaVencimiento", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Monto Original *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.montoOriginal}
                  onChange={(e) => setField("montoOriginal", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {editingId && (
                <div className="space-y-1">
                  <Label>Monto Pendiente</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.montoPendiente}
                    onChange={(e) => setField("montoPendiente", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cuota Mensual</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cuotaMensual}
                  onChange={(e) => setField("cuotaMensual", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1">
                <Label>N° Cuotas</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.numeroCuotas}
                  onChange={(e) => setField("numeroCuotas", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea
                value={form.observaciones}
                onChange={(e) => setField("observaciones", e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Guardar cambios" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar cuenta por pagar</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar esta cuenta? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting !== null}
            >
              {deleting ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
