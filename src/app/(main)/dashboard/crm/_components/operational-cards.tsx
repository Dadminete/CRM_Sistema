"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Clock, UserPlus, AlertTriangle, ShieldAlert } from "lucide-react";
import { FunnelChart, Funnel, LabelList } from "recharts";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

import { salesPipelineChartData, salesPipelineChartConfig } from "./crm.config";

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

export function OperationalCards() {
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

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

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-card stroke-2" dataKey="value" data={salesPipelineChartData}>
                <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={10} />
                <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={10} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Leads increased by 18.2% since last month.</p>
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
