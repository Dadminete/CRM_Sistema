"use client";

import React, { useEffect, useMemo, useState } from "react";

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

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
type Venta = {
  id: string;
  numeroVenta: string;
  fechaVenta: string;
  cliente_nombre: string;
  total: number;
  metodoPago: string;
  estado: string;
};

type DetalleFila = {
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type VentaCompleta = Venta & {
  items: DetalleFila[];
};

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  categoriaId: number;
  precioVenta: number;
  stockActual: number;
};

// ────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────
const COLORES = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ────────────────────────────────────────────────────────
// Componentes Auxiliares
// ────────────────────────────────────────────────────────
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

function renderGraficoLineas(datos: unknown[], loading: boolean) {
  if (loading) return <Skeleton className="h-80 w-full" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={datos as Record<string, unknown>[]}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function renderGraficoBarras(datos: unknown[], loading: boolean) {
  if (loading) return <Skeleton className="h-80 w-full" />;
  if ((datos as Record<string, unknown>[]).length === 0) {
    return <div className="text-muted-foreground flex h-80 items-center justify-center">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos as Record<string, unknown>[]}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nombre" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="cantidad" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Dashboard Component
// ────────────────────────────────────────────────────────
export default function PapeleriaDashboard() {
  const [ventas, setVentas] = useState<VentaCompleta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Cargar datos ────────────────────────────────────
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [ventasRes, productosRes] = await Promise.all([
        fetch("/api/papeleria/ventas"),
        fetch("/api/papeleria/productos"),
      ]);

      const ventasData = (await ventasRes.json()) as { success: boolean; data: VentaCompleta[] };
      const productosData = (await productosRes.json()) as { success: boolean; data: Producto[] };

      if (ventasData.data.length > 0) {
        const ventasNormalizadas = ventasData.data.map((v) => ({
          ...v,
          total: Number(v.total) || 0,
          items: v.items.map((item) => ({
            ...item,
            cantidad: Number(item.cantidad) || 0,
            precio_unitario: Number(item.precio_unitario) || 0,
            subtotal: Number(item.subtotal) || 0,
          })),
        }));
        setVentas(ventasNormalizadas);
      }
      if (productosData.data.length > 0) {
        const productosNormalizados = productosData.data.map((p) => ({
          ...p,
          id: Number(p.id) || 0,
          precioVenta: Number(p.precioVenta) || 0,
          stockActual: Number(p.stockActual) || 0,
        }));
        setProductos(productosNormalizados);
      }
    } catch (_error) {
      toast.error("Error cargando datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ── Calcular métricas (delegado a función helper)
  const metricas = useMemo(() => calcularMetricas(ventas, productos), [ventas, productos]);

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  return renderDashboard(
    metricas,
    loading,
    cargarDatos,
    calcularVentasPorDia(metricas.ventasMes),
    calcularProductosMasVendidos(ventas),
    calcularMetodosPago(ventas),
    ventas.sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime()).slice(0, 10),
  );
}

// ────────────────────────────────────────────────────────
// Funciones Helper para Dividir Lógica
// ────────────────────────────────────────────────────────
function calcularMetricas(ventas: VentaCompleta[], productos: Producto[]) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ventasHoy = ventas.filter((v) => {
    const fechaVenta = new Date(v.fechaVenta);
    fechaVenta.setHours(0, 0, 0, 0);
    return fechaVenta.getTime() === hoy.getTime();
  });

  const totalVentasHoy = Number(
    ventasHoy.reduce((sum, v) => {
      const total = Number(v.total) || 0;
      return sum + total;
    }, 0),
  );

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ventasMes = ventas.filter((v) => {
    const fechaVenta = new Date(v.fechaVenta);
    return fechaVenta >= inicioMes && fechaVenta <= hoy;
  });

  const totalVentasMes = Number(
    ventasMes.reduce((sum, v) => {
      const total = Number(v.total) || 0;
      return sum + total;
    }, 0),
  );

  return {
    totalVentasHoy,
    ventasHoy,
    totalVentasMes,
    ventasMes,
    totalProductos: productos.length,
    productosStockBajo: productos.filter((p) => Number(p.stockActual) <= 10).length,
  };
}

function calcularVentasPorDia(ventasMes: VentaCompleta[]) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const datos = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - i);
    const key = fecha.toLocaleDateString("es-DO", { month: "short", day: "numeric" });
    datos.set(key, 0);
  }

  ventasMes.forEach((v) => {
    const fecha = new Date(v.fechaVenta);
    const key = fecha.toLocaleDateString("es-DO", { month: "short", day: "numeric" });
    if (datos.has(key)) {
      const total = Number(v.total) || 0;
      const actual = datos.get(key) ?? 0;
      datos.set(key, actual + total);
    }
  });

  return Array.from(datos.entries()).map(([fecha, total]) => ({ fecha, total: Math.round(total * 100) / 100 }));
}

function calcularProductosMasVendidos(ventas: VentaCompleta[]) {
  const mapa = new Map<string, number>();
  ventas.forEach((v) => {
    v.items.forEach((item) => {
      const cantidad = Number(item.cantidad) || 0;
      const actual = mapa.get(item.producto_nombre) ?? 0;
      mapa.set(item.producto_nombre, actual + cantidad);
    });
  });

  return Array.from(mapa.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
}

function calcularMetodosPago(ventas: VentaCompleta[]) {
  const mapa = new Map<string, number>();
  ventas.forEach((v) => {
    const total = Number(v.total) || 0;
    const actual = mapa.get(v.metodoPago) ?? 0;
    mapa.set(v.metodoPago, actual + total);
  });

  return Array.from(mapa.entries())
    .map(([metodo, total]) => ({
      name: metodo,
      value: Math.round(total * 100) / 100,
    }))
    .filter((item) => !isNaN(item.value) && item.value > 0);
}

function renderDashboard(
  metricas: ReturnType<typeof calcularMetricas>,
  loading: boolean,
  cargarDatos: () => Promise<void>,
  ventasPorDia: ReturnType<typeof calcularVentasPorDia>,
  productosMasVendidos: ReturnType<typeof calcularProductosMasVendidos>,
  metodosPago: ReturnType<typeof calcularMetodosPago>,
  ultimasVentas: VentaCompleta[],
) {
  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Papelería</h1>
        <Button onClick={cargarDatos}>Refrescar</Button>
      </div>

      {/* Métricas Clave */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricaCard
          titulo="Ventas Hoy"
          valor={
            loading
              ? "Cargando..."
              : `RD$ ${isNaN(metricas.totalVentasHoy) ? "0.00" : metricas.totalVentasHoy.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          subtitulo={`${metricas.ventasHoy.length} venta(s)`}
          icono={<DollarSign className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Ventas Mes"
          valor={
            loading
              ? "Cargando..."
              : `RD$ ${isNaN(metricas.totalVentasMes) ? "0.00" : metricas.totalVentasMes.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          subtitulo={`${metricas.ventasMes.length} venta(s)`}
          icono={<TrendingDown className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Total Productos"
          valor={loading ? "Cargando..." : String(metricas.totalProductos)}
          subtitulo="En catálogo"
          icono={<Package className="h-4 w-4" />}
          loading={loading}
        />
        <MetricaCard
          titulo="Stock Bajo"
          valor={loading ? "Cargando..." : String(metricas.productosStockBajo)}
          subtitulo="Productos ≤ 10 unidades"
          icono={<ShoppingCart className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ventas por Día */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>{renderGraficoLineas(ventasPorDia, loading)}</CardContent>
        </Card>

        {/* Métodos de Pago */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Método de Pago</CardTitle>
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
                    {metodosPago.map((item) => (
                      <Cell key={`color-${item.name}`} fill={COLORES[metodosPago.indexOf(item) % COLORES.length]} />
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

        {/* Productos Más Vendidos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>{renderGraficoBarras(productosMasVendidos, loading)}</CardContent>
        </Card>
      </div>

      {/* Últimas Ventas */}
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
                    <TableHead>Total</TableHead>
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
