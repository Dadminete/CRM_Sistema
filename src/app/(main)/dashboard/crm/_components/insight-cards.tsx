"use client";

import { useEffect, useMemo, useState } from "react";

import { XAxis, Label, Pie, PieChart, Bar, BarChart, CartesianGrid, LabelList, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { leadsBySourceChartConfig } from "./crm.config";

type CajaStatsResponse = {
  success: boolean;
  data?: {
    saldoTotal: number;
    ultimosMeses: Array<{ mes: string; ingresos: number; gastos: number }>;
  };
};

type TopClientesCumplidosResponse = {
  success: boolean;
  data?: Array<{ name: string; pagos: number; fill: string }>;
};

type TopClientesCumplidosDetalleResponse = {
  success: boolean;
  data?: Array<{
    clienteId: string;
    nombre: string;
    apellidos: string;
    pagosATiempo: number;
    ultimasFechasPago: string[];
  }>;
};

const ingresosGastosChartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
  gastos: {
    label: "Gastos",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--primary-foreground)",
  },
} as ChartConfig;

export function InsightCards() {
  const [topClientes, setTopClientes] = useState<Array<{ name: string; pagos: number; fill: string }>>([]);
  const totalPagos = topClientes.reduce((acc, curr) => acc + (curr.pagos || 0), 0);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleData, setDetalleData] = useState<
    Array<{
      clienteId: string;
      nombre: string;
      apellidos: string;
      pagosATiempo: number;
      ultimasFechasPago: string[];
    }>
  >([]);

  const [ingresosGastosData, setIngresosGastosData] = useState<
    Array<{ name: string; ingresos: number; gastos: number }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/caja-stats", { cache: "no-store" });
        const json = (await response.json()) as CajaStatsResponse;

        if (!cancelled && json?.success && json.data?.ultimosMeses) {
          setIngresosGastosData(
            json.data.ultimosMeses.map((row) => ({
              name: row.mes,
              ingresos: Number(row.ingresos || 0),
              gastos: Number(row.gastos || 0),
            })),
          );
        }
      } catch {
        if (!cancelled) setIngresosGastosData([]);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetalle() {
      if (!detalleOpen) return;
      if (detalleData.length) return;

      setDetalleLoading(true);
      try {
        const response = await fetch("/api/top-clientes-cumplidos/detalle", { cache: "no-store" });
        const json = (await response.json()) as TopClientesCumplidosDetalleResponse;
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setDetalleData(
            json.data.map((row) => ({
              clienteId: row.clienteId,
              nombre: row.nombre,
              apellidos: row.apellidos,
              pagosATiempo: Number(row.pagosATiempo || 0),
              ultimasFechasPago: Array.isArray(row.ultimasFechasPago) ? row.ultimasFechasPago : [],
            })),
          );
        }
      } catch {
        if (!cancelled) setDetalleData([]);
      } finally {
        if (!cancelled) setDetalleLoading(false);
      }
    }

    loadDetalle();

    return () => {
      cancelled = true;
    };
  }, [detalleOpen, detalleData.length]);

  const formatFecha = (value?: string) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return value;
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadTopClientes() {
      try {
        const response = await fetch("/api/top-clientes-cumplidos", { cache: "no-store" });
        const json = (await response.json()) as TopClientesCumplidosResponse;

        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setTopClientes(
            json.data.map((row) => ({
              name: row.name,
              pagos: Number(row.pagos || 0),
              fill: row.fill,
            })),
          );
        }
      } catch {
        if (!cancelled) setTopClientes([]);
      }
    }

    loadTopClientes();

    return () => {
      cancelled = true;
    };
  }, []);

  const xDomainMax = useMemo(() => {
    if (!ingresosGastosData.length) return 0;
    return ingresosGastosData.reduce((max, row) => Math.max(max, row.ingresos, row.gastos), 0);
  }, [ingresosGastosData]);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-5">
      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Top Clientes Cumplidos</CardTitle>
        </CardHeader>
        <CardContent className="max-h-48">
          <ChartContainer config={leadsBySourceChartConfig} className="size-full">
            <PieChart
              className="m-0"
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={topClientes}
                dataKey="pagos"
                nameKey="name"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                cornerRadius={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold tabular-nums"
                          >
                            {totalPagos.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground">
                            Pagos
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                content={() => (
                  <ul className="ml-8 flex flex-col gap-3">
                    {topClientes.map((item) => (
                      <li key={item.name} className="flex w-36 items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: item.fill }} />
                          <span className="line-clamp-1">{item.name}</span>
                        </span>
                        <span className="tabular-nums">{item.pagos}</span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm" variant="outline" className="basis-1/2" onClick={() => setDetalleOpen(true)}>
            Ver reporte completo
          </Button>
          <Button size="sm" variant="outline" className="basis-1/2">
            Download CSV
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Top 20 clientes cumplidos</DialogTitle>
            <DialogDescription>
              Clientes con más pagos confirmados antes (o en) su fecha de vencimiento. Se muestran las fechas de los
              últimos 3 pagos a tiempo.
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Pagos a tiempo</TableHead>
                <TableHead className="text-right">Último</TableHead>
                <TableHead className="text-right">2do</TableHead>
                <TableHead className="text-right">3ro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalleLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : detalleData.length ? (
                detalleData.map((row) => (
                  <TableRow key={row.clienteId}>
                    <TableCell className="font-medium">
                      {row.nombre} {row.apellidos}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.pagosATiempo}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatFecha(row.ultimasFechasPago?.[0])}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatFecha(row.ultimasFechasPago?.[1])}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatFecha(row.ultimasFechasPago?.[2])}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                    No hay datos para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Card className="col-span-1 xl:col-span-3">
        <CardHeader>
          <CardTitle>Ingresos vs Gastos (Mensuales)</CardTitle>
        </CardHeader>
        <CardContent className="size-full max-h-52">
          <ChartContainer config={ingresosGastosChartConfig} className="size-full">
            <BarChart accessibilityLayer data={ingresosGastosData} layout="vertical">
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
                hide
              />
              <XAxis type="number" hide domain={[0, xDomainMax || 0]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="ingresos" layout="vertical" fill="var(--color-ingresos)">
                <LabelList
                  dataKey="name"
                  position="insideLeft"
                  offset={8}
                  className="fill-primary-foreground text-xs"
                />
                <LabelList
                  dataKey="ingresos"
                  position="insideRight"
                  offset={8}
                  className="fill-primary-foreground text-xs tabular-nums"
                />
              </Bar>
              <Bar dataKey="gastos" layout="vertical" fill="var(--color-gastos)" radius={[0, 6, 6, 0]}>
                <LabelList
                  dataKey="gastos"
                  position="insideRight"
                  offset={8}
                  className="fill-primary-foreground text-xs tabular-nums"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Average progress: 78% · 2 projects above target</p>
        </CardFooter>
      </Card>
    </div>
  );
}
