"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  BadgeDollarSign,
  CreditCard,
  Download,
  Loader2,
  Network,
  RefreshCw,
  Router,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DistribucionItem = {
  total: number;
  servicio?: string;
  plan?: string;
  estado?: string;
};

type ProximoPagoItem = {
  id: string;
  numeroContrato: string;
  fechaProximoPago: string;
  precioMensual: number;
  codigoCliente: string;
  clienteNombre: string;
  clienteEstado: string;
};

type TopClienteEquipoItem = {
  id: string;
  codigoCliente: string;
  clienteNombre: string;
  equipos: number;
  clienteEstado: string;
};

type DashboardData = {
  overview: {
    totalClientes: number;
    clientesActivos: number;
    clientesSinSuscripcionActiva: number;
    suscripcionesActivas: number;
    ingresoMensualEstimado: number;
    equiposRegistrados: number;
  };
  distribucionServicios: DistribucionItem[];
  distribucionPlanes: DistribucionItem[];
  estadoClientes: DistribucionItem[];
  proximosPagos: ProximoPagoItem[];
  topClientesEquipos: TopClienteEquipoItem[];
};

const EMPTY_DATA: DashboardData = {
  overview: {
    totalClientes: 0,
    clientesActivos: 0,
    clientesSinSuscripcionActiva: 0,
    suscripcionesActivas: 0,
    ingresoMensualEstimado: 0,
    equiposRegistrados: 0,
  },
  distribucionServicios: [],
  distribucionPlanes: [],
  estadoClientes: [],
  proximosPagos: [],
  topClientesEquipos: [],
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(date);
}

function normalizePercent(total: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round((total / base) * 100);
}

function normalizeDate(date: string): string {
  return date.length ? date : "";
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="mb-2 h-8 w-28" /> : <div className="text-2xl font-bold">{value}</div>}
        <p className="text-muted-foreground text-xs">{helper}</p>
      </CardContent>
    </Card>
  );
}

function DistributionList({
  title,
  rows,
  total,
  labelKey,
  loading,
}: {
  title: string;
  rows: DistribucionItem[];
  total: number;
  labelKey: "servicio" | "plan" | "estado";
  loading: boolean;
}) {
  const getLabel = (row: DistribucionItem): string => {
    if (labelKey === "servicio") return String(row.servicio ?? "Sin dato");
    if (labelKey === "plan") return String(row.plan ?? "Sin dato");
    return String(row.estado ?? "Sin dato");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {!loading && rows.length === 0 && <p className="text-muted-foreground text-sm">Sin datos disponibles.</p>}
        {!loading &&
          rows.map((row) => {
            const label = getLabel(row);
            const percent = normalizePercent(row.total, total);
            return (
              <div key={`${title}-${label}`} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{label}</span>
                  <span className="font-medium">{row.total}</span>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

export default function DashboardClientesPage() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const res = await fetch("/api/clientes/dashboard", { cache: "no-store" });
      const body = await res.json();

      if (!res.ok || !body.success) {
        toast.error(body.error ?? "No se pudo cargar el dashboard de clientes");
        setData(EMPTY_DATA);
        return;
      }

      setData(body.data as DashboardData);
    } catch (_error) {
      toast.error("Error de conexion al cargar dashboard de clientes");
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalServicios = useMemo(
    () => data.distribucionServicios.reduce((acc, item) => acc + item.total, 0),
    [data.distribucionServicios],
  );

  const totalPlanes = useMemo(
    () => data.distribucionPlanes.reduce((acc, item) => acc + item.total, 0),
    [data.distribucionPlanes],
  );

  const totalEstados = useMemo(
    () => data.estadoClientes.reduce((acc, item) => acc + item.total, 0),
    [data.estadoClientes],
  );

  const filteredProximosPagos = useMemo(() => {
    return data.proximosPagos.filter((item) => {
      const estado = (item.clienteEstado || "sin_estado").toLowerCase();
      const matchesEstado = estadoFiltro === "todos" ? true : estado === estadoFiltro;
      const fecha = normalizeDate(item.fechaProximoPago).slice(0, 10);
      const matchesDesde = fechaDesde ? fecha >= fechaDesde : true;
      const matchesHasta = fechaHasta ? fecha <= fechaHasta : true;
      return matchesEstado && matchesDesde && matchesHasta;
    });
  }, [data.proximosPagos, estadoFiltro, fechaDesde, fechaHasta]);

  const filteredTopClientes = useMemo(() => {
    return data.topClientesEquipos.filter((item) => {
      const estado = (item.clienteEstado || "sin_estado").toLowerCase();
      return estadoFiltro === "todos" ? true : estado === estadoFiltro;
    });
  }, [data.topClientesEquipos, estadoFiltro]);

  const exportCsv = () => {
    const lines: string[] = [];
    const metricRows: Array<[string, number]> = [
      ["Total Clientes", data.overview.totalClientes],
      ["Clientes Activos", data.overview.clientesActivos],
      ["Clientes Sin Suscripcion Activa", data.overview.clientesSinSuscripcionActiva],
      ["Suscripciones Activas", data.overview.suscripcionesActivas],
      ["Ingreso Mensual Estimado", data.overview.ingresoMensualEstimado],
      ["Equipos Registrados", data.overview.equiposRegistrados],
    ];

    lines.push("DASHBOARD CLIENTES");
    lines.push("");
    lines.push(["Metrica", "Valor"].map(csvEscape).join(","));
    metricRows.forEach((row) => {
      lines.push(row.map(csvEscape).join(","));
    });

    lines.push("");
    lines.push("PROXIMOS PAGOS (FILTRADOS)");
    const pagosHeader = [
      "Cliente",
      "Codigo Cliente",
      "Estado Cliente",
      "Contrato",
      "Fecha Proximo Pago",
      "Precio Mensual",
    ];
    lines.push(pagosHeader.map(csvEscape).join(","));

    filteredProximosPagos.forEach((item) => {
      const row = [
        item.clienteNombre,
        item.codigoCliente,
        item.clienteEstado,
        item.numeroContrato,
        item.fechaProximoPago,
        item.precioMensual,
      ];
      lines.push(row.map(csvEscape).join(","));
    });

    lines.push("");
    lines.push("TOP CLIENTES POR EQUIPOS (FILTRADOS)");
    lines.push(["Cliente", "Codigo Cliente", "Estado Cliente", "Equipos"].map(csvEscape).join(","));
    filteredTopClientes.forEach((item) => {
      lines.push([item.clienteNombre, item.codigoCliente, item.clienteEstado, item.equipos].map(csvEscape).join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vista consolidada de clientes, suscripciones, equipos, servicios y planes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium">Estado Cliente</p>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
                <option value="sin_estado">Sin estado</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Fecha desde (próximo pago)</p>
              <Input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Fecha hasta (próximo pago)</p>
              <Input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setEstadoFiltro("todos");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total Clientes"
          value={String(data.overview.totalClientes)}
          helper="Registrados en el sistema"
          icon={Users}
          loading={loading}
        />
        <MetricCard
          title="Clientes Activos"
          value={String(data.overview.clientesActivos)}
          helper="Con suscripción activa"
          icon={UserCheck}
          loading={loading}
        />
        <MetricCard
          title="Clientes Sin Suscripción Activa"
          value={String(data.overview.clientesSinSuscripcionActiva)}
          helper="Pendientes por activar"
          icon={UserX}
          loading={loading}
        />
        <MetricCard
          title="Suscripciones Activas"
          value={String(data.overview.suscripcionesActivas)}
          helper="Contratos vigentes"
          icon={CreditCard}
          loading={loading}
        />
        <MetricCard
          title="Ingreso Mensual Estimado"
          value={formatMoney(data.overview.ingresoMensualEstimado)}
          helper="Suma de precios mensuales activos"
          icon={BadgeDollarSign}
          loading={loading}
        />
        <MetricCard
          title="Equipos Registrados"
          value={String(data.overview.equiposRegistrados)}
          helper="Inventario instalado"
          icon={Router}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DistributionList
          title="Distribución por Servicio"
          rows={data.distribucionServicios}
          total={totalServicios}
          labelKey="servicio"
          loading={loading}
        />
        <DistributionList
          title="Distribución por Plan"
          rows={data.distribucionPlanes}
          total={totalPlanes}
          labelKey="plan"
          loading={loading}
        />
        <DistributionList
          title="Estado de Clientes"
          rows={data.estadoClientes}
          total={totalEstados}
          labelKey="estado"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : filteredProximosPagos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay pagos próximos registrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProximosPagos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.clienteNombre}</div>
                        <div className="text-muted-foreground text-xs">{item.codigoCliente}</div>
                      </TableCell>
                      <TableCell>{item.numeroContrato}</TableCell>
                      <TableCell>{formatDate(item.fechaProximoPago)}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.precioMensual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Clientes por Equipos</CardTitle>
            <Network className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : filteredTopClientes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay equipos registrados.</p>
            ) : (
              <div className="space-y-2">
                {filteredTopClientes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">{item.clienteNombre}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.codigoCliente} · {item.clienteEstado}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeDollarSign className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm font-semibold">{item.equipos}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
