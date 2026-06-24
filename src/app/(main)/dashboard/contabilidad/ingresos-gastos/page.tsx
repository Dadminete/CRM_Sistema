"use client";

import { useState, useEffect, useCallback, Suspense } from "react";

import { useSearchParams } from "next/navigation";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Landmark,
  CreditCard,
  Wallet,
  CalendarDays,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { notifyFinanzasDataChanged } from "@/lib/finanzas-sync";
import { cn } from "@/lib/utils";

// ─── Tipos ───
interface Movimiento {
  id: string;
  tipo: string;
  monto: string;
  categoriaId: string;
  categoriaNombre: string | null;
  categoriaCodigo: string | null;
  metodo: string;
  cajaId: string | null;
  cajaNombre: string | null;
  bankId: string | null;
  bankNombre: string | null;
  cuentaBancariaId: string | null;
  cuentaBancariaNombre: string | null;
  descripcion: string | null;
  fecha: string;
  usuarioId: string;
  cuentaPorPagarId: string | null;
  createdAt: string;
}

interface LookupData {
  categorias: { id: string; nombre: string; codigo?: string }[];
  bancos: { id: string; nombre: string }[];
  cuentasBancarias: { id: string; numeroCuenta: string; bankNombre?: string; bankId?: string }[];
  cajas: { id: string; nombre: string }[];
  cuentasPorPagar: { id: string; numeroDocumento: string; proveedorNombre?: string; montoPendiente: string | number }[];
}

interface GastoFijo {
  id: string;
  nombre: string;
  monto: number;
  activo: boolean;
}

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
];

const EMPTY_FORM = {
  monto: "",
  categoriaId: "",
  metodo: "",
  cajaId: "",
  bankId: "",
  cuentaBancariaId: "",
  descripcion: "",
  fecha: new Date().toISOString().split("T")[0],
  cuentaPorPagarId: "",
  pagoFijoId: "",
};

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;

// ─── Helpers ───
const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });

const metodoIcon = (m: string) => {
  switch (m) {
    case "efectivo":
      return <Wallet className="h-3.5 w-3.5" />;
    case "transferencia":
      return <Landmark className="h-3.5 w-3.5" />;
    case "cheque":
      return <DollarSign className="h-3.5 w-3.5" />;
    case "tarjeta":
      return <CreditCard className="h-3.5 w-3.5" />;
    default:
      return null;
  }
};

// ─── Página Principal con Suspense ───
export default function IngresosGastosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <IngresosGastosPageContent />
    </Suspense>
  );
}

function IngresosGastosPageContent() {
  const searchParams = useSearchParams();
  const facturaId = searchParams.get("facturaId");

  const [activeTab, setActiveTab] = useState<"gasto" | "ingreso">("gasto");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [lookup, setLookup] = useState<LookupData>({
    categorias: [],
    bancos: [],
    cuentasBancarias: [],
    cajas: [],
    cuentasPorPagar: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [filterCategoriaId, setFilterCategoriaId] = useState("");
  const [filterMetodo, setFilterMetodo] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeSession, setActiveSession] = useState<{ cajaId?: string; cajaNombre?: string } | null>(null);
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);

  // ─── Data fetching ───
  const fetchMovimientos = useCallback(
    async (tipo: string, targetPage = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          tipo,
          page: String(targetPage),
          limit: String(pageSize),
        });

        if (debouncedSearchTerm.trim()) {
          params.set("search", debouncedSearchTerm.trim());
        }
        if (filterCategoriaId) {
          params.set("categoriaId", filterCategoriaId);
        }
        if (filterMetodo) {
          params.set("metodo", filterMetodo);
        }
        if (filterStartDate) {
          params.set("startDate", filterStartDate);
        }
        if (filterEndDate) {
          params.set("endDate", filterEndDate);
        }

        const res = await fetch(`/api/contabilidad/movimientos?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setMovimientos(data.data ?? []);
          const pagination = data.pagination ?? {};
          setTotal(Number(pagination.total ?? 0));
          setPage(Number(pagination.page ?? targetPage));
          setTotalPages(Number(pagination.totalPages ?? 1));
        } else {
          toast.error("Error al cargar movimientos");
        }
      } catch {
        toast.error("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearchTerm, filterCategoriaId, filterMetodo, filterStartDate, filterEndDate, pageSize],
  );

  const fetchLookup = useCallback(async (tipoCategoria: string) => {
    try {
      const res = await fetch(`/api/contabilidad/lookup?tipoCategoria=${tipoCategoria}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setLookup(data.data);
      }
    } catch {
      console.error("Error fetching lookup data");
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/cajas/sesiones");
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.activeSession);
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }, []);

  const fetchGastosFijos = useCallback(async () => {
    try {
      const res = await fetch("/api/contabilidad/gastos-fijos", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) {
        const fixed = (data?.data?.fixedExpenses ?? []) as Array<{
          id: string;
          nombre: string;
          monto: number;
          activo: boolean;
        }>;
        setGastosFijos(fixed.filter((f) => f.activo));
      }
    } catch (error) {
      console.error("Error cargando gastos fijos:", error);
    }
  }, []);

  useEffect(() => {
    fetchMovimientos(activeTab, 1);
    fetchLookup(activeTab);
    if (activeTab === "gasto") {
      fetchGastosFijos();
    }

    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        const currentUserId = (res?.data?.profile?.id as string) ?? "";
        if (currentUserId) {
          setUsuarioId(currentUserId);
        }
        checkSession();
      })
      .catch((err) => {
        console.error(err);
        checkSession();
      });
  }, [activeTab, debouncedSearchTerm, fetchMovimientos, fetchLookup, checkSession, fetchGastosFijos]);

  // Pre-poblar si viene facturaId
  useEffect(() => {
    if (facturaId && !isLoading && lookup.categorias.length > 0) {
      const fetchFacturaDetail = async () => {
        try {
          const res = await fetch(`/api/facturas/detalle?id=${facturaId}`);
          const result = await res.json();
          if (result.success) {
            const inv = result.data;
            setActiveTab("ingreso");
            setForm({
              ...EMPTY_FORM,
              monto: inv.total, // O el monto pendiente si se prefiere
              descripcion: `Pago de factura ${inv.numeroFactura} - ${inv.clienteNombre}`,
              fecha: new Date().toISOString().split("T")[0],
            });
            // Intentar buscar una categoría de ingresos por defecto
            const catIngreso = lookup.categorias.find(
              (c) => c.nombre.toLowerCase().includes("venta") || c.nombre.toLowerCase().includes("ingreso"),
            );
            if (catIngreso) {
              setForm((prev) => ({ ...prev, categoriaId: catIngreso.id }));
            }
            setIsDialogOpen(true);
          }
        } catch (error) {
          console.error("Error fetching factura details:", error);
        }
      };
      fetchFacturaDetail();
    }
  }, [facturaId, isLoading, lookup.categorias]);

  // ─── Handlers ───
  const handleTabChange = (val: string) => {
    setActiveTab(val as "gasto" | "ingreso");
    setPage(1);
    setFilterCategoriaId("");
    setFilterMetodo("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setIsDialogOpen(true);
  };

  const openEdit = (m: Movimiento) => {
    setEditingId(m.id);
    setForm({
      monto: m.monto,
      categoriaId: m.categoriaId,
      metodo: m.metodo,
      cajaId: m.cajaId ?? "",
      bankId: m.bankId ?? "",
      cuentaBancariaId: m.cuentaBancariaId ?? "",
      descripcion: m.descripcion ?? "",
      fecha: m.fecha ? m.fecha.split("T")[0] : "",
      cuentaPorPagarId: m.cuentaPorPagarId ?? "",
      pagoFijoId: "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.monto || !form.categoriaId || !form.metodo) {
      toast.error("Completa los campos requeridos: Monto, Categoría y Método de pago");
      return;
    }

    if (Number(form.monto) <= 0) {
      toast.error("El monto debe ser mayor que cero");
      return;
    }

    if (form.metodo === "efectivo" && !form.cajaId) {
      toast.error("Debes seleccionar una caja para pagos en efectivo");
      return;
    }

    if (form.metodo !== "efectivo" && (!form.bankId || !form.cuentaBancariaId)) {
      toast.error("Debes seleccionar banco y cuenta bancaria para movimientos no efectivos");
      return;
    }

    // Doble validación de Sesión de Caja para pagos en efectivo
    let currentSession = activeSession;
    if (form.metodo === "efectivo" && !currentSession) {
      // Re-verificar sesión por si acaso o si se abrió en otra pestaña
      try {
        const url = form.cajaId ? `/api/cajas/sesiones?cajaId=${form.cajaId}` : "/api/cajas/sesiones";
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.activeSession) {
          currentSession = data.activeSession;
          setActiveSession(data.activeSession);
        }
      } catch (_e) {
        console.error("Error al re-verificar sesión:", _e);
      }
    }

    if (form.metodo === "efectivo" && !currentSession) {
      toast.error("Caja Cerrada: Debe abrir una sesión de caja para registrar movimientos en efectivo.");
      return;
    }

    try {
      // Logic to include current time if the selected date is today
      let fechaISO = form.fecha;
      const now = new Date();
      const todayUTC = now.toISOString().split("T")[0];

      // If the form date matches today (UTC date part), use the full current timestamp
      // This ensures transactions made "now" are after the session opening time
      if (form.fecha === todayUTC) {
        fechaISO = now.toISOString();
      } else {
        // Otherwise ensure it's a valid ISO string (defaults to midnight)
        // Note: new Date("YYYY-MM-DD") is UTC midnight
        fechaISO = new Date(form.fecha).toISOString();
      }

      const body: { [key: string]: unknown } = {
        ...form,
        fecha: fechaISO,
        tipo: activeTab,
        usuarioId: usuarioId || undefined,
      };

      if (editingId) body.id = editingId;

      const res = await fetch("/api/contabilidad/movimientos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Movimiento actualizado" : "Movimiento registrado");
        notifyFinanzasDataChanged();
        setIsDialogOpen(false);
        setPage(1);
        fetchMovimientos(activeTab, 1);
      } else {
        toast.error("Error: " + data.error);
      }
    } catch {
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      const res = await fetch(`/api/contabilidad/movimientos?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Movimiento eliminado");
        notifyFinanzasDataChanged();
        setPage(1);
        fetchMovimientos(activeTab, 1);
      } else {
        toast.error("Error: " + data.error);
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "metodo") {
        if (value === "efectivo") {
          next.bankId = "";
          next.cuentaBancariaId = "";
        } else {
          next.cajaId = "";
        }
      }
      if (key === "bankId") {
        next.cuentaBancariaId = "";
      }
      return next;
    });
  };

  useEffect(() => {
    if (filterCategoriaId && !lookup.categorias.some((item) => item.id === filterCategoriaId)) {
      setFilterCategoriaId("");
    }

    if (form.categoriaId && !lookup.categorias.some((item) => item.id === form.categoriaId)) {
      setForm((prev) => ({ ...prev, categoriaId: "" }));
    }
  }, [filterCategoriaId, form.categoriaId, lookup.categorias]);

  // ─── Derived ───
  const cuentasBancariasFiltradas = form.bankId
    ? lookup.cuentasBancarias.filter((c) => c.bankId === form.bankId)
    : lookup.cuentasBancarias;

  const categoriasOrdenadas = [...lookup.categorias].sort((a, b) =>
    String(a?.nombre ?? "").localeCompare(String(b?.nombre ?? ""), "es", { sensitivity: "base" }),
  );

  const totalMes = movimientos.reduce((acc, m) => acc + Number(m.monto), 0);

  const isGasto = activeTab === "gasto";

  // ─── Render ───
  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
            Ingresos y Gastos
          </h1>
          <p className="text-muted-foreground mt-2">Registra y administra los movimientos contables de la empresa.</p>
        </div>
        {!activeSession && (
          <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Wallet className="h-6 w-6 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-black tracking-tight text-amber-800 uppercase">Caja Cerrada</div>
              <p className="text-xs font-medium text-amber-700">
                Los movimientos en efectivo están deshabilitados hasta que abra una sesión de caja.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-amber-200 bg-white font-bold text-amber-700 shadow-sm"
              onClick={() => (window.location.href = "/dashboard/cajas-chicas/apertura-cierre")}
            >
              Abrir Caja Ahora
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl p-1 sm:w-[360px]">
            <TabsTrigger
              value="gasto"
              className="gap-2 rounded-lg font-semibold transition-all data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <TrendingDown className="h-4 w-4" /> Gastos
            </TabsTrigger>
            <TabsTrigger
              value="ingreso"
              className="gap-2 rounded-lg font-semibold transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <TrendingUp className="h-4 w-4" /> Ingresos
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setPage(1);
                fetchLookup(activeTab);
                fetchMovimientos(activeTab, 1);
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
            <Button
              className={cn(
                "gap-2 text-white shadow-lg transition-all",
                isGasto
                  ? "bg-rose-600 shadow-rose-600/20 hover:bg-rose-700"
                  : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700",
              )}
              onClick={openNew}
            >
              <Plus className="h-4 w-4" />
              {isGasto ? "Nuevo Gasto" : "Nuevo Ingreso"}
            </Button>
          </div>
        </div>

        <Card className="border-border/70">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs font-bold uppercase">Categoría</Label>
              <Select
                value={filterCategoriaId || "all"}
                onValueChange={(v) => setFilterCategoriaId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categoriasOrdenadas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs font-bold uppercase">Método</Label>
              <Select value={filterMetodo || "all"} onValueChange={(v) => setFilterMetodo(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs font-bold uppercase">Desde</Label>
              <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs font-bold uppercase">Hasta</Label>
              <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterCategoriaId("");
                  setFilterMetodo("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setSearchTerm("");
                  setPage(1);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className={cn("border-l-4", isGasto ? "border-l-rose-500" : "border-l-emerald-500")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
                {isGasto ? "Total Gastos" : "Total Ingresos"}
              </CardTitle>
              {isGasto ? (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", isGasto ? "text-rose-600" : "text-emerald-600")}>
                {formatCurrency(totalMes)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Registros</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{total > 0 ? total : movimientos.length}</div>
              {total > movimientos.length && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Mostrando {movimientos.length} de {total}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Promedio</CardTitle>
              <DollarSign className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {movimientos.length > 0 ? formatCurrency(totalMes / movimientos.length) : "$0.00"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        <TabsContent value="gasto" className="mt-0">
          <MovimientosTable
            data={movimientos}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            onEdit={openEdit}
            onDelete={handleDelete}
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
              void fetchMovimientos(activeTab, 1);
            }}
            onPageChange={(nextPage) => fetchMovimientos(activeTab, nextPage)}
            isGasto
          />
        </TabsContent>
        <TabsContent value="ingreso" className="mt-0">
          <MovimientosTable
            data={movimientos}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            onEdit={openEdit}
            onDelete={handleDelete}
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
              void fetchMovimientos(activeTab, 1);
            }}
            onPageChange={(nextPage) => fetchMovimientos(activeTab, nextPage)}
            isGasto={false}
          />
        </TabsContent>
      </Tabs>

      {/* ─── Dialog Form ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGasto ? (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-rose-500" /> {editingId ? "Editar Gasto" : "Nuevo Gasto"}
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-emerald-500" />{" "}
                  {editingId ? "Editar Ingreso" : "Nuevo Ingreso"}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isGasto ? "Registra un gasto en el sistema contable." : "Registra un ingreso en el sistema contable."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Monto + Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                  Monto *
                </Label>
                <div className="relative">
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-9"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={(e) => updateForm("monto", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                  Fecha
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => updateForm("fecha", e.target.value)}
                />
              </div>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">Categoría *</Label>
              <Select value={form.categoriaId} onValueChange={(v) => updateForm("categoriaId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasOrdenadas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Método de Pago *
              </Label>
              <Select value={form.metodo} onValueChange={(v) => updateForm("metodo", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caja (si es efectivo) */}
            {form.metodo === "efectivo" && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-2 duration-200">
                <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">Caja</Label>
                <Select value={form.cajaId} onValueChange={(v) => updateForm("cajaId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookup.cajas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Banco + Cuenta Bancaria (si NO es efectivo) */}
            {form.metodo && form.metodo !== "efectivo" && (
              <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-4 duration-200">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">Banco</Label>
                  <Select value={form.bankId} onValueChange={(v) => updateForm("bankId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookup.bancos.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    Cuenta Bancaria
                  </Label>
                  <Select value={form.cuentaBancariaId} onValueChange={(v) => updateForm("cuentaBancariaId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasBancariasFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numeroCuenta} {c.bankNombre ? `(${c.bankNombre})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Cuenta por Pagar (solo gastos) */}
            {isGasto && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    Cuenta por Pagar (opcional)
                  </Label>
                  <Select
                    value={form.cuentaPorPagarId || "none"}
                    onValueChange={(v) => updateForm("cuentaPorPagarId", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {lookup.cuentasPorPagar.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numeroDocumento} — {c.proveedorNombre ?? "Sin proveedor"} (
                          {formatCurrency(c.montoPendiente)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    Vincular a Gasto Fijo (opcional)
                  </Label>
                  <Select
                    value={form.pagoFijoId || "none"}
                    onValueChange={(v) => updateForm("pagoFijoId", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {gastosFijos.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nombre} ({formatCurrency(g.monto)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-2">
              <Label
                htmlFor="descripcion"
                className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
              >
                Descripción
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Detalle del movimiento..."
                rows={3}
                value={form.descripcion}
                onChange={(e) => updateForm("descripcion", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className={cn(
                "text-white shadow-lg",
                isGasto
                  ? "bg-rose-600 shadow-rose-600/20 hover:bg-rose-700"
                  : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700",
              )}
            >
              {editingId ? "Guardar Cambios" : isGasto ? "Registrar Gasto" : "Registrar Ingreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-component: Tabla de Movimientos ───
function MovimientosTable({
  data,
  isLoading,
  searchTerm,
  onSearch,
  onEdit,
  onDelete,
  page,
  totalPages,
  total,
  pageSize,
  onPageSizeChange,
  onPageChange,
  isGasto,
}: {
  data: Movimiento[];
  isLoading: boolean;
  searchTerm: string;
  onSearch: (v: string) => void;
  onEdit: (m: Movimiento) => void;
  onDelete: (id: string) => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
  isGasto: boolean;
}) {
  return (
    <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
      <CardHeader className="bg-muted/5 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-full p-2", isGasto ? "bg-rose-500/10" : "bg-emerald-500/10")}>
            {isGasto ? (
              <ArrowDownCircle className="h-5 w-5 text-rose-600" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <CardTitle className="text-xl">{isGasto ? "Listado de Gastos" : "Listado de Ingresos"}</CardTitle>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Buscar movimiento..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">Fecha</TableHead>
              <TableHead className="font-bold">Monto</TableHead>
              <TableHead className="font-bold">Categoría</TableHead>
              <TableHead className="font-bold">Método</TableHead>
              <TableHead className="font-bold">Descripción</TableHead>
              <TableHead className="text-right font-bold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-20 text-center">
                  Cargando movimientos...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-20 text-center italic">
                  No hay movimientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              data.map((m) => (
                <TableRow key={m.id} className="hover:bg-primary/5 group transition-colors">
                  <TableCell className="text-muted-foreground text-sm font-medium">{formatDate(m.fecha)}</TableCell>
                  <TableCell>
                    <span className={cn("text-sm font-bold", isGasto ? "text-rose-600" : "text-emerald-600")}>
                      {formatCurrency(m.monto)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-bold">{m.categoriaNombre ?? "—"}</span>
                      {m.categoriaCodigo && (
                        <span className="text-primary/70 font-mono text-[10px] font-bold tracking-tight">
                          {m.categoriaCodigo}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 text-xs capitalize">
                      {metodoIcon(m.metodo)} {m.metodo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                    {m.descripcion ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(m)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50 focus:text-red-700"
                          onClick={() => onDelete(m.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Mostrando hasta {pageSize} registros por página. Página {page} de {Math.max(totalPages, 1)} ({total}{" "}
            registros)
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="h-8 w-[96px]">
                <SelectValue placeholder="Filas" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} filas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
