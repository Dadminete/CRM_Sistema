"use client";

import * as React from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DashboardSummary {
  totalFacturas: number;
  montoFacturado: number;
  facturasPendientes: number;
  montoPendiente: number;
  facturasParciales: number;
  montoParcialPendiente: number;
  facturasAdelantadas: number;
  montoAdelantadoPendiente: number;
  facturasPagadas: number;
  montoPagado: number;
  facturasAnuladas: number;
  montoAnulado: number;
  cobradoMesActual: number;
  facturadoMesActual: number;
  montoPendienteGlobal: number;
  pagadasMesActual: {
    count: number;
    monto: number;
  };
}

interface TopDeudor {
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string | null;
  facturasPendientes: number;
  facturasParciales: number;
  facturasAdelantadas: number;
  deudaTotal: string | number;
}

interface FacturaReciente {
  id: string;
  numeroFactura: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string | null;
  fechaFactura: string;
  fechaVencimiento: string | null;
  estado: string;
  total: string | number;
}

interface FacturaVencida {
  id: string;
  numeroFactura: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string | null;
  fechaVencimiento: string;
  montoPendiente: string | number;
  diasVencido: number;
  estado: string;
}

interface DashboardPayload {
  resumen: DashboardSummary;
  topDeudores: TopDeudor[];
  recientes: FacturaReciente[];
  vencidas: FacturaVencida[];
}

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-DO", { year: "numeric", month: "short", day: "2-digit" }).format(date);
};

const getEstadoBadge = (estado: string) => {
  const raw = (estado || "").toLowerCase();
  if (["pagada", "pagado"].includes(raw)) return "bg-emerald-100 text-emerald-700 uppercase";
  if (["parcial", "pago parcial", "parcialmente pagada"].includes(raw))
    return "bg-orange-100 text-orange-700 border-orange-200 uppercase";
  if (["pendiente"].includes(raw)) return "bg-rose-100 text-rose-700 border-rose-200 uppercase";
  if (["adelantado", "pago adelantado", "adelantada"].includes(raw))
    return "bg-blue-100 text-blue-700 border-blue-200 uppercase";
  if (["anulada", "anulado", "cancelada", "cancelado"].includes(raw)) return "bg-slate-200 text-slate-700 uppercase";
  return "bg-slate-100 text-slate-700 uppercase";
};

export default function FacturasDashboardPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facturas/dashboard");
      const result = await res.json();
      if (!result?.success) {
        toast.error("No se pudo cargar el dashboard de facturas");
        return;
      }
      setData(result.data);
    } catch {
      toast.error("Error de conexión al cargar dashboard de facturas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resumen = data?.resumen;

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
            Dashboard Facturas
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Panorama general de facturacion, cobros, deuda pendiente y seguimiento de vencimientos.
          </p>
        </div>
        <Button variant="outline" className="h-11 gap-2 px-4 font-semibold" onClick={fetchData}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Facturado Mes Actual"
          value={formatCurrency(resumen?.facturadoMesActual ?? 0)}
          subtitle={`Total histórico: ${formatCurrency(resumen?.montoFacturado ?? 0)}`}
          icon={<FileText className="h-4 w-4 text-blue-600" />}
          accent="border-l-blue-500"
        />
        <MetricCard
          title="Pendiente Total"
          value={formatCurrency(resumen?.montoPendienteGlobal ?? 0)}
          subtitle={`${
            (resumen?.facturasPendientes ?? 0) + (resumen?.facturasParciales ?? 0) + (resumen?.facturasAdelantadas ?? 0)
          } facturas con balance`}
          icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
          accent="border-l-rose-500"
        />
        <MetricCard
          title="Cobrado Mes Actual"
          value={formatCurrency(resumen?.cobradoMesActual ?? 0)}
          subtitle={`Facturado mes: ${formatCurrency(resumen?.facturadoMesActual ?? 0)}`}
          icon={<Wallet className="h-4 w-4 text-emerald-600" />}
          accent="border-l-emerald-500"
        />
        <MetricCard
          title="Facturas Pagadas Mes"
          value={`${resumen?.pagadasMesActual?.count ?? 0}`}
          subtitle={`${formatCurrency(resumen?.pagadasMesActual?.monto ?? 0)} (Total: ${resumen?.facturasPagadas ?? 0})`}
          icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />}
          accent="border-l-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <MetricCard
          title="Pagos Parciales"
          value={formatCurrency(resumen?.montoParcialPendiente ?? 0)}
          subtitle={`${resumen?.facturasParciales ?? 0} facturas con abonos`}
          icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
          accent="border-l-orange-500"
        />
        <MetricCard
          title="Facturas Adelantadas"
          value={formatCurrency(resumen?.montoAdelantadoPendiente ?? 0)}
          subtitle={`${resumen?.facturasAdelantadas ?? 0} facturas generadas por adelantado`}
          icon={<ArrowUpRight className="h-4 w-4 text-blue-600" />}
          accent="border-l-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Top 10 Clientes con Mayor Deuda</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-muted-foreground py-10 text-center">Cargando...</div>
            ) : (data?.topDeudores?.length || 0) === 0 ? (
              <div className="text-muted-foreground py-10 text-center">Sin deuda pendiente registrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="py-2 pl-4 text-xs font-bold uppercase">Cliente</TableHead>
                    <TableHead className="py-2 text-xs font-bold uppercase">Estado</TableHead>
                    <TableHead className="py-2 pr-4 text-right text-xs font-bold uppercase">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topDeudores.map((item) => {
                    const colorClass =
                      item.facturasPendientes > 0
                        ? "text-rose-600"
                        : item.facturasParciales > 0
                          ? "text-orange-600"
                          : "text-blue-600";

                    return (
                      <TableRow key={item.clienteId} className="hover:bg-muted/30">
                        <TableCell className="py-3 pl-4">
                          <Link
                            href={`/dashboard/facturas/pendientes?clienteId=${item.clienteId}`}
                            className="hover:text-primary text-sm font-bold transition-colors hover:underline"
                          >
                            {item.clienteNombre} {item.clienteApellidos || ""}
                          </Link>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-row flex-wrap gap-1.5 py-1">
                            {item.facturasPendientes > 0 && (
                              <Badge
                                variant="outline"
                                className="h-5 border-rose-200 bg-rose-50 text-[10px] text-rose-600"
                              >
                                {item.facturasPendientes} {item.facturasPendientes === 1 ? "Pendiente" : "Pendientes"}
                              </Badge>
                            )}
                            {item.facturasParciales > 0 && (
                              <Badge
                                variant="outline"
                                className="h-5 border-orange-200 bg-orange-50 text-[10px] text-orange-600"
                              >
                                {item.facturasParciales}{" "}
                                {item.facturasParciales === 1 ? "Pago Parcial" : "Pagos Parciales"}
                              </Badge>
                            )}
                            {item.facturasAdelantadas > 0 && (
                              <Badge
                                variant="outline"
                                className="h-5 border-blue-200 bg-blue-50 text-[10px] text-blue-600"
                              >
                                {item.facturasAdelantadas}{" "}
                                {item.facturasAdelantadas === 1 ? "Adelantada" : "Adelantadas"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("py-3 pr-4 text-right font-black", colorClass)}>
                          {formatCurrency(item.deudaTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-base font-bold">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertLine
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              label="Facturas vencidas"
              value={`${data?.vencidas.length || 0}`}
            />
            <AlertLine
              icon={<TrendingUp className="h-4 w-4 text-rose-600" />}
              label="Total Pendientes"
              value={`${resumen?.facturasPendientes || 0}`}
            />
            <AlertLine
              icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
              label="Pagos parciales"
              value={`${resumen?.facturasParciales || 0}`}
            />
            <AlertLine
              icon={<ArrowUpRight className="h-4 w-4 text-blue-600" />}
              label="Facturas adelantadas"
              value={`${resumen?.facturasAdelantadas || 0}`}
            />
            <AlertLine
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              label="Anuladas/Canceladas"
              value={`${resumen?.facturasAnuladas || 0}`}
            />
            <div className="pt-2">
              <Link
                href="/dashboard/facturas/pendientes"
                className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                Ver detalle de facturas pendientes <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Ultimas Facturas Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">No.</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recientes || []).map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-semibold">{f.numeroFactura}</td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/dashboard/facturas/pendientes?clienteId=${f.clienteId}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {f.clienteNombre} {f.clienteApellidos || ""}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{formatDate(f.fechaFactura)}</td>
                      <td className="py-2 pr-3">
                        <Badge className={cn("font-semibold capitalize", getEstadoBadge(f.estado))}>{f.estado}</Badge>
                      </td>
                      <td className="py-2 text-right font-bold">{formatCurrency(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Facturas Vencidas (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">No.</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Vence</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 text-right">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.vencidas || []).map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-semibold">{f.numeroFactura}</td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/dashboard/facturas/pendientes?clienteId=${f.clienteId}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {f.clienteNombre} {f.clienteApellidos || ""}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{formatDate(f.fechaVencimiento)}</td>
                      <td className="py-2 pr-3">
                        <Badge className={cn("items-center gap-1 px-2 py-0.5 text-[10px]", getEstadoBadge(f.estado))}>
                          {f.estado}
                          {f.diasVencido > 0 && <span className="ml-1 opacity-70">({f.diasVencido}d)</span>}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-bold text-rose-600">{formatCurrency(f.montoPendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className={cn("border-l-4 shadow-sm", accent)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-xs font-black tracking-tighter uppercase">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground mt-1 text-[10px] font-bold uppercase">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AlertLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/20 flex items-center justify-between rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
