"use client";

import { useState, useEffect } from "react";
import {
  TrendingDown,
  Search,
  RefreshCw,
  Download,
  Calendar,
  ArrowDownCircle,
  DollarSign,
  Filter,
  CreditCard,
  FileText,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Expense {
  id: string;
  fecha: string;
  monto: number;
  beneficiario: string;
  concepto: string;
  tipo: "PROVEEDOR" | "FIJO" | "OTRO";
  metodoPago: string;
  referencia?: string;
  detalles?: string;
}

interface ChartData {
  date: string;
  total: number;
}

const ITEMS_PER_PAGE = 8;
const COLORS = ["#ef4444", "#f97316", "#dc2626", "#ea580c", "#b91c1c", "#c2410c"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gastos");
      const data = await res.json();

      if (data.success) {
        setExpenses(data.data);
        setDailyStats(data.dailyStats.map((s: any) => ({ ...s, total: parseFloat(s.total) })));
        setSummary(data.summary);
      } else {
        toast.error("Error al cargar gastos: " + data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      (expense.beneficiario?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (expense.concepto?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (expense.referencia?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || expense.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedItems = filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight underline decoration-red-500/30 underline-offset-8">
            Reporte de Gastos
          </h1>
          <p className="text-muted-foreground mt-2">
            Resumen detallado de egresos, pagos a proveedores y gastos operativos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-red-500/20 text-red-600 shadow-sm hover:bg-red-50"
            onClick={fetchExpenses}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button className="gap-2 bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-red-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Gastos (Mes Actual)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.total)}</div>
            <p className="mt-1 text-xs text-slate-500">Egresos del mes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Transacciones (Mes)</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
            <p className="mt-1 text-xs text-slate-500">Operaciones registradas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Promedio (Mes)</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.average)}</div>
            <p className="mt-1 text-xs text-slate-500">Ticket promedio de egreso</p>
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
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Tendencia de Gastos Diarios
                </CardTitle>
                <CardDescription>Comportamiento de los egresos durante este mes.</CardDescription>
              </div>
              <div className="rounded-full bg-red-100 p-2">
                <PieChart className="h-5 w-5 text-red-600" />
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
                    formatter={(val: number) => [`RD$ ${val.toLocaleString()}`, "Gasto"]}
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

      {/* Expenses Table Card */}
      <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
        <CardHeader className="bg-muted/5 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/10 p-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            </div>
            <CardTitle className="text-xl">Historial Detallado</CardTitle>
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
                <SelectValue placeholder="Tipo Gasto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PROVEEDOR">Proveedores</SelectItem>
                <SelectItem value="FIJO">Fijos</SelectItem>
                <SelectItem value="OTRO">Otros</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar beneficiario, concepto..."
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
                <TableHead className="font-bold">Beneficiario / Concepto</TableHead>
                <TableHead className="text-center font-bold">Tipo</TableHead>
                <TableHead className="font-bold">Método</TableHead>
                <TableHead className="text-right font-bold">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center italic">
                    Procesando datos de egresos...
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center">
                    No se encontraron registros de gastos.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((expense) => (
                  <TableRow key={expense.id} className="group transition-colors hover:bg-red-50/50">
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground text-sm font-bold">
                          {new Date(expense.fecha).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1 font-mono text-[10px] tracking-tighter uppercase">
                          <Calendar className="h-3 w-3" />{" "}
                          {new Date(expense.fecha).toLocaleDateString("es-DO", { weekday: "short" })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${expense.tipo === "PROVEEDOR" ? "bg-blue-100 text-blue-600" : expense.tipo === "FIJO" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"}`}
                        >
                          <ArrowDownRight className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-foreground text-sm leading-tight font-bold">
                            {expense.beneficiario}
                          </span>
                          <p className="text-muted-foreground max-w-[250px] truncate text-xs leading-relaxed">
                            {expense.concepto}
                          </p>
                          {expense.referencia && (
                            <span className="text-primary/60 mt-0.5 font-mono text-[10px]">
                              REF: {expense.referencia}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge
                        className={`text-[10px] font-normal uppercase shadow-none ${
                          expense.tipo === "PROVEEDOR"
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : expense.tipo === "FIJO"
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        } `}
                      >
                        {expense.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="h-5 border-red-200 bg-red-50 text-[9px] font-black text-red-700 uppercase shadow-none"
                      >
                        {expense.metodoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <span className="text-base font-bold text-red-600">- {formatCurrency(expense.monto)}</span>
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
