/* eslint-disable complexity, max-lines */

"use client";

import { useEffect, useState } from "react";

import {
  ArrowDownCircle,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";

interface Expense {
  id: string;
  fecha: string;
  monto: number;
  beneficiario: string;
  concepto: string;
  tipo: string;
  metodoPago: string;
  referencia: string | null;
  detalles: string | null;
  categoria: string;
}

interface ChartData {
  date: string;
  total: number;
}

interface BreakdownStat {
  category?: string;
  method?: string;
  total: number;
}

interface FilterOptions {
  types: string[];
  methods: string[];
  categories: string[];
}

interface Summary {
  total: number;
  count: number;
  average: number;
  range: {
    startDate: string;
    endDate: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: Expense[];
  dailyStats: ChartData[];
  categoryStats: BreakdownStat[];
  methodStats: BreakdownStat[];
  filterOptions: FilterOptions;
  summary: Summary;
  error?: string;
}

const ITEMS_PER_PAGE = 10;
const emptySummary: Summary = {
  total: 0,
  count: 0,
  average: 0,
  range: { startDate: "", endDate: "" },
};
const emptyFilterOptions: FilterOptions = { types: [], methods: [], categories: [] };

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`,
  };
}

function getDelayUntilNextMonth() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 5, 0);
  return Math.max(nextMonth.getTime() - now.getTime(), 1_000);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", options);
}

function buildCsv(items: Expense[]) {
  const headers = ["Fecha", "Beneficiario", "Tipo", "Categoria", "Metodo", "Monto", "Referencia", "Concepto"];
  const rows = items.map((item) => [
    item.fecha,
    item.beneficiario,
    item.tipo,
    item.categoria,
    item.metodoPago,
    item.monto.toFixed(2),
    item.referencia ?? "",
    item.concepto.replace(/\s+/g, " ").trim(),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function getTypeLabel(value: string) {
  if (value === "PROVEEDOR") return "Pago a proveedor";
  if (value === "FIJO") return "Gasto fijo";
  if (value === "OTRO") return "Gasto general";
  return value;
}

export default function ExpensesPage() {
  const defaultRange = getCurrentMonthRange();
  const { resolvedTheme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyStats, setDailyStats] = useState<ChartData[]>([]);
  const [categoryStats, setCategoryStats] = useState<BreakdownStat[]>([]);
  const [methodStats, setMethodStats] = useState<BreakdownStat[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(emptyFilterOptions);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const debouncedMinAmount = useDebounce(minAmount, 350);
  const debouncedMaxAmount = useDebounce(maxAmount, 350);
  const isDarkTheme = resolvedTheme === "dark";
  const chartGridStroke = isDarkTheme ? "rgba(148,163,184,0.16)" : "#e5d7d7";
  const chartCursorFill = isDarkTheme ? "rgba(239,68,68,0.12)" : "rgba(239, 68, 68, 0.06)";
  const tooltipStyle = {
    borderRadius: 16,
    border: isDarkTheme ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(239,68,68,0.12)",
    backgroundColor: isDarkTheme ? "rgba(2, 6, 23, 0.94)" : "rgba(255, 255, 255, 0.96)",
    color: isDarkTheme ? "#e2e8f0" : "#0f172a",
    boxShadow: isDarkTheme ? "0 18px 40px -24px rgba(0,0,0,0.75)" : "0 18px 40px -24px rgba(15,23,42,0.35)",
  };
  const expenseBarFill = isDarkTheme ? "#fb7185" : "#fca5a5";
  const expenseAreaStroke = isDarkTheme ? "#fb7185" : "#dc2626";
  const expenseLineStroke = isDarkTheme ? "#fecdd3" : "#b91c1c";

  useEffect(() => {
    const currentRange = getCurrentMonthRange();
    const isViewingCurrentMonth = startDate === currentRange.startDate && endDate === currentRange.endDate;

    if (!isViewingCurrentMonth) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const nextRange = getCurrentMonthRange();
      setStartDate(nextRange.startDate);
      setEndDate(nextRange.endDate);
    }, getDelayUntilNextMonth());

    return () => window.clearTimeout(timerId);
  }, [startDate, endDate]);

  const fetchExpenses = async (signal?: AbortSignal) => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (debouncedMinAmount.trim()) params.set("minAmount", debouncedMinAmount.trim());
      if (debouncedMaxAmount.trim()) params.set("maxAmount", debouncedMaxAmount.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const query = params.toString();
      const response = await fetch(`/api/gastos${query ? `?${query}` : ""}`, { signal, cache: "no-store" });
      const data: ApiResponse = await response.json();

      if (!data.success) {
        toast.error(`Error al cargar gastos: ${data.error ?? "Error desconocido"}`);
        return;
      }

      setExpenses(data.data);
      setDailyStats(data.dailyStats);
      setCategoryStats(data.categoryStats);
      setMethodStats(data.methodStats);
      setFilterOptions(data.filterOptions);
      setSummary(data.summary);
      setCurrentPage(1);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error(error);
        toast.error("Error de conexión al cargar gastos");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchExpenses(controller.signal);
    return () => controller.abort();
  }, [
    debouncedSearchTerm,
    debouncedMinAmount,
    debouncedMaxAmount,
    typeFilter,
    methodFilter,
    categoryFilter,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  const paginatedItems = expenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);
  const topCategory = categoryStats[0];
  const topMethod = methodStats[0];
  const peakDay = dailyStats.reduce<ChartData | null>((current, item) => {
    if (!current || item.total > current.total) return item;
    return current;
  }, null);
  const hasActiveFilters =
    !!searchTerm ||
    typeFilter !== "all" ||
    methodFilter !== "all" ||
    categoryFilter !== "all" ||
    !!minAmount ||
    !!maxAmount ||
    !!startDate ||
    !!endDate ||
    sortBy !== "date" ||
    sortOrder !== "desc";

  const handleExport = () => {
    if (!expenses.length) {
      toast.error("No hay gastos para exportar");
      return;
    }

    const blob = new Blob([buildCsv(expenses)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-gastos-${summary.range.startDate || "actual"}-${summary.range.endDate || "actual"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setMethodFilter("all");
    setCategoryFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
    setSortBy("date");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <Card className="overflow-hidden border border-red-500/10 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_45%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(254,242,242,0.98))] shadow-xl ring-1 ring-red-500/10 dark:border-red-400/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_40%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(127,29,29,0.3))] dark:ring-red-400/10">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border border-red-500/15 bg-red-500/10 text-red-700 hover:bg-red-500/10 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Panel de precisión
            </Badge>
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">Reporte de Gastos</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Filtros por fechas, montos, método, categorías y tipos con indicadores exactos y distribución de egresos
                sobre el mismo universo filtrado.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Badge
                variant="outline"
                className="border-red-200 bg-white/70 text-red-700 dark:border-red-400/20 dark:bg-slate-950/40 dark:text-red-200"
              >
                Rango: {summary.range.startDate || "-"} a {summary.range.endDate || "-"}
              </Badge>
              <Badge
                variant="outline"
                className="border-red-200 bg-white/70 text-red-700 dark:border-red-400/20 dark:bg-slate-950/40 dark:text-red-200"
              >
                Registros: {summary.count}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-red-500/20 bg-white/70 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:bg-slate-950/40 dark:text-red-200 dark:hover:bg-red-500/10"
              onClick={() => void fetchExpenses()}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
            <Button className="gap-2 bg-red-600 shadow-lg shadow-red-500/20 hover:bg-red-700" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-none shadow-md ring-1 ring-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Gastos filtrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(summary.total)}</div>
            <p className="mt-1 text-xs text-slate-500">Suma exacta del filtro actual</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md ring-1 ring-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
            <p className="mt-1 text-xs text-slate-500">Egresos dentro del rango y filtros</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md ring-1 ring-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Ticket promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.average)}</div>
            <p className="mt-1 text-xs text-slate-500">Promedio por egreso</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md ring-1 ring-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pico diario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">
              {peakDay ? formatCompactCurrency(peakDay.total) : formatCurrency(0)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {peakDay ? formatDate(peakDay.date) : "Sin datos en el rango"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <Card className="border-none shadow-xl ring-1 ring-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Tendencia diaria de gastos
            </CardTitle>
            <CardDescription>
              Vista combinada para identificar picos de salida y cambios reales del gasto en el rango filtrado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyStats} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expense-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => formatDate(value, { day: "2-digit", month: "short" })}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                    width={88}
                  />
                  <Tooltip
                    cursor={{ fill: chartCursorFill }}
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatCurrency(value), "Gasto del día"]}
                    labelFormatter={(label) => formatDate(label, { day: "2-digit", month: "long", year: "numeric" })}
                  />
                  <Bar
                    dataKey="total"
                    fill={expenseBarFill}
                    opacity={isDarkTheme ? 0.38 : 0.32}
                    radius={[10, 10, 0, 0]}
                    maxBarSize={32}
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke={expenseAreaStroke}
                    fill="url(#expense-fill)"
                    strokeWidth={3}
                  />
                  <Line dataKey="total" type="monotone" stroke={expenseLineStroke} strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/95 border border-slate-200/70 shadow-xl ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-950/70 dark:ring-slate-800/80">
          <CardHeader>
            <CardTitle className="text-xl">Distribución del filtro</CardTitle>
            <CardDescription>Lectura directa de categorías y métodos del mismo conjunto filtrado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Categorías</h3>
                <Badge
                  variant="outline"
                  className="border-red-200 text-red-700 dark:border-red-400/20 dark:text-red-200"
                >
                  Top {Math.min(categoryStats.length, 5)}
                </Badge>
              </div>
              {categoryStats.slice(0, 5).map((item) => {
                const percent = summary.total > 0 ? (item.total / summary.total) * 100 : 0;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-100">{item.category}</span>
                      <span className="text-slate-500 dark:text-slate-300">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!categoryStats.length && (
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Sin datos de categoría para el filtro actual.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                <DollarSign className="h-4 w-4 text-red-600" />
                Lectura rápida
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Mayor categoría:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {topCategory?.category ?? "Sin datos"}
                  </span>
                </p>
                <p>
                  Método dominante:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {topMethod?.method ?? "Sin datos"}
                  </span>
                </p>
                <p>
                  Día más alto:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {peakDay ? `${formatDate(peakDay.date)} · ${formatCurrency(peakDay.total)}` : "Sin datos"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/95 border border-slate-200/70 shadow-md ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-950/70 dark:ring-slate-800/80">
        <CardHeader className="border-b bg-slate-50/70 pb-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-red-600" />
            <CardTitle className="text-base">Filtros avanzados</CardTitle>
          </div>
          <CardDescription>
            La tabla, los totales y la gráfica se recalculan desde la API usando los mismos criterios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
              placeholder="Buscar beneficiario, concepto, categoría, método..."
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {filterOptions.types.map((option) => (
                <SelectItem key={option} value={option}>
                  {getTypeLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {filterOptions.categories.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              {filterOptions.methods.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            placeholder="Monto mínimo"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            placeholder="Monto máximo"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Ordenar por fecha</SelectItem>
              <SelectItem value="amount">Ordenar por monto</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 xl:col-span-2">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Sentido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descendente</SelectItem>
                <SelectItem value="asc">Ascendente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex-1" disabled={!hasActiveFilters} onClick={resetFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/95 overflow-hidden border border-slate-200/70 shadow-md ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-950/70 dark:ring-slate-800/80">
        <CardHeader className="flex flex-col gap-4 border-b bg-slate-50/70 pb-5 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/10 p-2 dark:bg-red-400/10">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Historial de egresos</CardTitle>
              <CardDescription>{summary.count} movimientos encontrados con los criterios activos.</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-red-200 bg-white text-red-700 dark:border-red-400/20 dark:bg-slate-950/40 dark:text-red-200"
          >
            {formatCurrency(summary.total)} acumulados
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/70">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Beneficiario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center text-slate-500 italic dark:text-slate-300">
                    Recalculando gastos con los filtros aplicados...
                  </TableCell>
                </TableRow>
              ) : !paginatedItems.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center text-slate-500 dark:text-slate-300">
                    No se encontraron gastos con los criterios actuales.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-red-50/40 dark:hover:bg-red-500/5">
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {formatDate(expense.fecha)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(expense.fecha, { weekday: "short" })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-xl p-2 ${expense.tipo === "PROVEEDOR" ? "bg-blue-500/10 text-blue-700" : expense.tipo === "FIJO" ? "bg-amber-500/10 text-amber-700" : "bg-slate-200/70 text-slate-700"}`}
                        >
                          <ArrowDownRight className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">{expense.beneficiario}</p>
                          <p className="text-xs tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            {getTypeLabel(expense.tipo)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200"
                      >
                        {expense.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="max-w-[360px] truncate text-sm text-slate-600 dark:text-slate-300">
                          {expense.concepto}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {expense.referencia
                            ? `Ref. ${expense.referencia}`
                            : (expense.detalles ?? "Sin referencia adicional")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {expense.metodoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-semibold text-red-700">
                      {formatCurrency(expense.monto)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
              Página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-semibold"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-semibold"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
