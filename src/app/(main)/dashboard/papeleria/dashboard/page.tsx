"use client";

import React, { useEffect, useState } from "react";

import { DollarSign, Package, ShoppingCart, TrendingDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Venta = {
  id: string;
  numeroVenta: string;
  fechaVenta: string;
  cliente_nombre: string;
  total: number;
  metodoPago: string;
  estado: string;
};

type DashboardData = {
  metrics: {
    netSalesToday: number;
    salesTodayCount: number;
    netSalesMonth: number;
    salesMonthCount: number;
    totalProducts: number;
    lowStockProducts: number;
  };
  charts: {
    dailyNetSales: Array<{ fecha: string; total: number }>;
    paymentDistribution: Array<{ name: string; value: number }>;
    topProducts: Array<{ nombre: string; cantidad: number }>;
  };
  latestSales: Venta[];
};

const COLORES = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function MetricaCard({
  titulo,
  valor,
  subtitulo,
  icono: Icon,
  loading,
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
  icono: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <div className="h-4 w-4 text-blue-600">{Icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-32" /> : valor}</div>
        <p className="text-muted-foreground text-xs">{subtitulo}</p>
      </CardContent>
    </Card>
  );
}

function renderGraficoLineas(datos: Array<{ fecha: string; total: number }>, loading: boolean) {
  if (loading) return <Skeleton className="h-80 w-full" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={datos}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip formatter={(value) => `RD$ ${(Number(value) || 0).toLocaleString("es-DO", { maximumFractionDigits: 2 })}`} />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function renderGraficoBarras(datos: Array<{ nombre: string; cantidad: number }>, loading: boolean) {
  if (loading) return <Skeleton className="h-80 w-full" />;
  if (datos.length === 0) {
    return <div className="text-muted-foreground flex h-80 items-center justify-center">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nombre" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="cantidad" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PapeleriaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);

  const cargarDatos = async (days: 7 | 30 | 90) => {
    try {
      if (!data) setLoading(true);
      else setLoadingRange(true);

      const response = await fetch(`/api/papeleria/dashboard?rangeDays=${days}`, { cache: "no-store" });
      const json = (await response.json()) as { success: boolean; data: DashboardData };

      if (!json.success || !json.data) {
        throw new Error("No se pudo cargar el dashboard");
      }

      setData(json.data);
    } catch (_error) {
      toast.error("Error cargando datos del dashboard");
    } finally {
      setLoading(false);
      setLoadingRange(false);
    }
  };

  useEffect(() => {
    cargarDatos(rangeDays);
  }, [rangeDays]);

  const metricas = data?.metrics;
  const dailyNetSales = data?.charts.dailyNetSales ?? [];
  const topProducts = data?.charts.topProducts ?? [];
  const metodosPago = data?.charts.paymentDistribution ?? [];
  const ultimasVentas = data?.latestSales ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Papelería</h1>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant={rangeDays === days ? "default" : "outline"}
              disabled={loadingRange}
              onClick={() => setRangeDays(days as 7 | 30 | 90)}
            >
              {days}d
            </Button>
          ))}
          <Button onClick={() => cargarDatos(rangeDays)} disabled={loadingRange}>
            {loadingRange ? "Actualizando..." : "Refrescar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricaCard
          titulo="Ventas Netas Hoy"
          valor={
            loading
              ? "Cargando..."
              : `RD$ ${(metricas?.netSalesToday || 0).toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
          }
          subtitulo={`${metricas?.salesTodayCount || 0} venta(s) completada(s)`}
          icono={<DollarSign className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Ventas Netas Mes"
          valor={
            loading
              ? "Cargando..."
              : `RD$ ${(metricas?.netSalesMonth || 0).toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
          }
          subtitulo={`${metricas?.salesMonthCount || 0} venta(s) completada(s)`}
          icono={<TrendingDown className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Total Productos"
          valor={loading ? "Cargando..." : String(metricas?.totalProducts || 0)}
          subtitulo="Productos activos"
          icono={<Package className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Stock Bajo"
          valor={loading ? "Cargando..." : String(metricas?.lowStockProducts || 0)}
          subtitulo="Stock actual <= stock mínimo"
          icono={<ShoppingCart className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Netas Últimos {rangeDays} Días</CardTitle>
          </CardHeader>
          <CardContent>{renderGraficoLineas(dailyNetSales, loading)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Método de Pago ({rangeDays} días)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-80 w-full" />
            ) : metodosPago.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metodosPago}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => {
                      const val = Number(value) || 0;
                      return `${name}: RD$${val.toLocaleString("es-DO", { maximumFractionDigits: 2 })}`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metodosPago.map((item, idx) => (
                      <Cell key={`color-${item.name}`} fill={COLORES[idx % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const num = Number(value) || 0;
                      return `RD$ ${num.toLocaleString("es-DO", { maximumFractionDigits: 2 })}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-80 items-center justify-center">Sin datos</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Productos Más Vendidos ({rangeDays} días)</CardTitle>
          </CardHeader>
          <CardContent>{renderGraficoBarras(topProducts, loading)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas 10 Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => `skeleton-${i + 1}`).map((key) => (
                <Skeleton key={key} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Neto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimasVentas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="muted-foreground py-8 text-center">
                        No hay ventas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    ultimasVentas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">{v.numeroVenta}</TableCell>
                        <TableCell>{new Date(v.fechaVenta).toLocaleDateString("es-DO")}</TableCell>
                        <TableCell>{v.cliente_nombre}</TableCell>
                        <TableCell className="font-semibold">
                          RD$
                          {(Number(v.total) || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            {v.metodoPago}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              v.estado === "COMPLETADA"
                                ? "bg-green-100 text-green-700"
                                : v.estado === "PENDIENTE"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {v.estado}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
