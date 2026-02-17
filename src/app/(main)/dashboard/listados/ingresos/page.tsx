"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Search,
  RefreshCw,
  Download,
  Calendar,
  ArrowUpCircle,
  DollarSign,
  Filter,
  ArrowLeftRight,
  CreditCard,
  FileText,
  PieChart,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Income {
  id: string;
  monto: string;
  fecha: string;
  metodo: string;
  referencia: string | null;
  cliente: string;
  tipo: "pago_cliente" | "movimiento_contable";
  descripcion: string;
}

interface ChartData {
  date: string;
  total: number;
}

const ITEMS_PER_PAGE = 10;

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [dailyStats, setDailyStats] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const fetchIncomes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ingresos");
      const data = await res.json();
      if (data.success) {
        setIncomes(data.data);
        setDailyStats(data.dailyStats.map((s: any) => ({ ...s, total: parseFloat(s.total) })));
        setSummary(data.summary);
      } else {
        toast.error("Error al cargar ingresos: " + data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.referencia?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || inc.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedItems = filteredIncomes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalPages = Math.ceil(filteredIncomes.length / ITEMS_PER_PAGE);

  // Prepare chart colors based on current theme/styles
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight underline decoration-emerald-500/30 underline-offset-8">
            Reporte de Ingresos
          </h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento detallado y visual de los flujos de entrada de capital.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-emerald-500/20 text-emerald-600 shadow-sm hover:bg-emerald-50"
            onClick={fetchIncomes}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button className="gap-2 bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Ingresos (Mes Actual)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.total)}</div>
            <p className="mt-1 text-xs text-slate-500">Facturado este mes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Transacciones (Mes)</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
            <p className="mt-1 text-xs text-slate-500">Operaciones registradas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Promedio (Mes)</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.average)}</div>
            <p className="mt-1 text-xs text-slate-500">Ticket promedio mensual</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="ring-border/50 border-none shadow-xl ring-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Visualización de Ingresos Diarios
                </CardTitle>
                <CardDescription>Tendencia de recaudación durante el mes en curso.</CardDescription>
              </div>
              <div className="rounded-full bg-emerald-100 p-2">
                <PieChart className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => new Date(val).getDate().toString()}
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `RD$ ${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(val: number) => [`RD$ ${val.toLocaleString()}`, "Ingreso"]}
                    labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString()}`}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {dailyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incomes Table Card */}
      <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
        <CardHeader className="bg-muted/5 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2">
              <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Historial de Transacciones</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Tipo Ingreso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PAGO CLIENTE">Pagos de Clientes</SelectItem>
                <SelectItem value="VENTA PAPELERIA">Ventas Papelería</SelectItem>
                <SelectItem value="OTRO INGRESO">Otros Ingresos</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente o ref..."
                className="h-9 pl-9"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Fecha</TableHead>
                <TableHead className="font-bold">Origen / Cliente</TableHead>
                <TableHead className="font-bold">Descripción</TableHead>
                <TableHead className="font-bold">Metodo</TableHead>
                <TableHead className="text-right font-bold">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center italic">
                    Procesando datos contables...
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center">
                    No se encontraron registros de ingresos.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((inc) => (
                  <TableRow key={inc.id} className="group transition-colors hover:bg-emerald-50/50">
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground text-sm font-bold">
                          {new Date(inc.fecha).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1 font-mono text-[10px] tracking-tighter uppercase">
                          <Calendar className="h-3 w-3" />{" "}
                          {new Date(inc.fecha).toLocaleDateString("es-DO", { weekday: "short" })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${inc.tipo === "pago_cliente" ? "bg-blue-500/10 text-blue-600" : "bg-violet-500/10 text-violet-600"}`}
                        >
                          {inc.tipo === "pago_cliente" ? (
                            <CreditCard className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-foreground text-sm leading-tight font-bold">{inc.cliente}</span>
                          <span className="text-muted-foreground/60 text-[10px] font-black tracking-widest uppercase">
                            {inc.tipo === "pago_cliente" ? "Cobro Servicio" : "Op. Interna"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-muted-foreground max-w-[300px] truncate text-xs leading-relaxed">
                          {inc.descripcion}
                        </p>
                        {inc.referencia && (
                          <span className="text-primary/60 font-mono text-[10px]">REF: {inc.referencia}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="h-5 border-emerald-200 bg-emerald-50 text-[9px] font-black text-emerald-700 uppercase shadow-none"
                      >
                        {inc.metodo}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <span className="text-base font-bold text-emerald-600">
                        RD$ {parseFloat(inc.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="bg-muted/5 flex items-center justify-between border-t px-6 py-4">
            <span className="text-muted-foreground text-xs font-medium">
              Mostrando página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-bold"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-bold"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
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
