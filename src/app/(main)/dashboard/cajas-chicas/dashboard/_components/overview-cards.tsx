"use client";

import { format, subMonths } from "date-fns";
import { Wallet, BadgeDollarSign, ArrowUpCircle, ArrowDownCircle, Users, Repeat } from "lucide-react";
import { Area, AreaChart, Line, LineChart, Bar, BarChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface OverviewCardsProps {
  data: {
    totalBalance: string;
    ingresosHoy: string;
    gastosHoy: string;
    sesionesHoy: number;
  };
  history: any[];
}

export function OverviewCards({ data, history }: OverviewCardsProps) {
  // Map history to chart format
  const chartData = Array.isArray(history)
    ? history.map((h) => ({
        date: h.date,
        ingresos: parseFloat(h.ingresos || 0),
        gastos: parseFloat(h.gastos || 0),
      }))
    : [];

  const lastMonth = format(new Date(), "MMM");

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Hoy</CardTitle>
          <CardDescription>{lastMonth}</CardDescription>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer
            className="size-full min-h-24"
            config={{
              ingresos: { label: "Ingresos", color: "var(--chart-1)" },
            }}
          >
            <BarChart accessibilityLayer data={chartData.slice(-5)} barSize={8}>
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums">{formatCurrency(parseFloat(data.ingresosHoy))}</span>
        </CardFooter>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Tendencia Semanal</CardTitle>
          <CardDescription>Ultimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ChartContainer
            className="size-full min-h-24"
            config={{
              ingresos: { label: "Ingresos", color: "var(--chart-1)" },
            }}
          >
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 5 }}>
              <XAxis dataKey="date" hide />
              <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
              <Area
                dataKey="ingresos"
                fill="var(--color-ingresos)"
                fillOpacity={0.1}
                stroke="var(--color-ingresos)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-green-500/10 p-2">
            <Wallet className="size-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Balance Total</CardTitle>
            <CardDescription>Todas las cajas</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">{formatCurrency(parseFloat(data.totalBalance))}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="bg-destructive/10 w-fit rounded-lg p-2">
            <ArrowDownCircle className="text-destructive size-5" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Gastos Hoy</CardTitle>
            <CardDescription>Salidas registradas</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">{formatCurrency(parseFloat(data.gastosHoy))}</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Flujo de Caja</CardTitle>
          <CardDescription>Ingresos vs Gastos (Semana)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              ingresos: { label: "Ingresos", color: "var(--chart-1)" },
              gastos: { label: "Gastos", color: "var(--chart-2)" },
            }}
            className="h-24 w-full"
          >
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" strokeWidth={2} dataKey="ingresos" stroke="var(--color-ingresos)" dot={false} />
              <Line type="monotone" strokeWidth={2} dataKey="gastos" stroke="var(--color-gastos)" dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">{data.sesionesHoy} sesiones activas hoy</p>
        </CardFooter>
      </Card>
    </div>
  );
}
