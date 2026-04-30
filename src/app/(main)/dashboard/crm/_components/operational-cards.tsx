"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Clock, UserPlus, AlertTriangle, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

type RecentClient = {
  id: string;
  nombre: string;
  apellidos: string;
  fechaIngreso: string;
  estado: string;
  codigoCliente: string;
  fotoUrl: string | null;
};

type SystemAlert = {
  id: string;
  accion: string;
  resultado: string;
  mensajeError: string;
  fechaHora: string;
  tabla: string;
};

type SalesPoint = {
  period: string;
  label: string;
  total: number;
};

type PapeleriaSalesResponse = {
  success: boolean;
  data?: {
    monthly: SalesPoint[];
    biweekly: SalesPoint[];
  };
};

const papeleriaSalesChartConfig = {
  total: {
    label: "Ventas",
    color: "var(--chart-1)",
  },
} as ChartConfig;

export function OperationalCards() {
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [salesView, setSalesView] = useState<"monthly" | "biweekly">("monthly");
  const [papeleriaSales, setPapeleriaSales] = useState<{ monthly: SalesPoint[]; biweekly: SalesPoint[] }>({
    monthly: [],
    biweekly: [],
  });
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    fetch("/api/crm/recent-clients")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setRecentClients(json.data);
      })
      .finally(() => setLoadingClients(false));

    fetch("/api/crm/system-alerts")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSystemAlerts(json.data);
      })
      .finally(() => setLoadingAlerts(false));

    fetch("/api/crm/papeleria-sales", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: PapeleriaSalesResponse) => {
        if (json.success && json.data) {
          setPapeleriaSales({
            monthly: json.data.monthly ?? [],
            biweekly: json.data.biweekly ?? [],
          });
        }
      })
      .finally(() => setLoadingSales(false));
  }, []);

  const formatFecha = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const activeSalesData = salesView === "monthly" ? papeleriaSales.monthly : papeleriaSales.biweekly;
  const totalSales = activeSalesData.reduce((acc, row) => acc + Number(row.total || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Ventas Papaleria</CardTitle>
            <Tabs value={salesView} onValueChange={(value) => setSalesView(value as "monthly" | "biweekly") }>
              <TabsList className="h-8">
                <TabsTrigger value="monthly" className="px-2 text-xs">
                  Mensual
                </TabsTrigger>
                <TabsTrigger value="biweekly" className="px-2 text-xs">
                  Quincenal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="size-full">
          {loadingSales ? (
            <p className="text-muted-foreground text-sm">Cargando ventas de papeleria...</p>
          ) : activeSalesData.length ? (
            <ChartContainer config={papeleriaSalesChartConfig} className="size-full min-h-56">
              <BarChart data={activeSalesData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  height={salesView === "biweekly" ? 56 : 30}
                  angle={salesView === "biweekly" ? -30 : 0}
                  textAnchor={salesView === "biweekly" ? "end" : "middle"}
                  tick={{ fontSize: salesView === "biweekly" ? 10 : 11 }}
                  tickFormatter={(value: string) =>
                    salesView === "biweekly" ? value.replace("1ra", "Q1").replace("2da", "Q2") : value
                  }
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={70} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `Periodo: ${label}`}
                      formatter={(value) => [formatCurrency(Number(value)), "Ventas"]}
                    />
                  }
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No hay ventas de papeleria para el periodo seleccionado.</p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            Ventas netas {salesView === "monthly" ? "mensuales" : "quincenales"}: {formatCurrency(totalSales)}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Últimos Clientes Registrados</CardTitle>
            <UserPlus className="text-muted-foreground h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-4">
              {loadingClients ? (
                <p className="text-muted-foreground text-sm">Cargando clientes...</p>
              ) : recentClients.length > 0 ? (
                recentClients.map((client) => (
                  <div
                    key={client.id}
                    className="border-border/40 flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        {client.fotoUrl && <AvatarImage src={client.fotoUrl} alt={client.nombre} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                          {client.nombre.charAt(0)}
                          {client.apellidos.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm leading-none font-medium">
                          {client.nombre} {client.apellidos}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {client.codigoCliente} • <span className="capitalize">{client.estado}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs font-medium">{formatFecha(client.fechaIngreso)}</div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No hay clientes recientes.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-destructive text-sm font-semibold">Alertas del Sistema</CardTitle>
            <ShieldAlert className="text-destructive h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-4">
              {loadingAlerts ? (
                <p className="text-muted-foreground text-sm">Cargando alertas...</p>
              ) : systemAlerts.length > 0 ? (
                systemAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/dashboard/crm/alertas/${alert.id}`}
                    className="group border-destructive/20 bg-destructive/5 hover:bg-destructive/10 focus-visible:ring-destructive block space-y-2 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive h-3.5 w-3.5" />
                        <span className="text-destructive text-xs font-bold tracking-tight uppercase">
                          {alert.accion}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px] font-medium">
                        {formatFecha(alert.fechaHora)}
                      </span>
                    </div>
                    <p className="text-foreground line-clamp-2 text-xs font-medium">
                      {alert.mensajeError || "Error desconocido en " + alert.tabla}
                    </p>
                    <div className="flex items-center gap-1">
                      <Clock className="text-muted-foreground h-3 w-3" />
                      <span className="text-muted-foreground text-[10px] font-semibold">Registro: {alert.id}</span>
                      <span className="text-destructive/80 ml-auto text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        Ver detalle
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No se detectaron errores recientes.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
