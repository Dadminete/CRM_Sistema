"use client";

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, CreditCard, Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface OverviewCardsProps {
  data: {
    totalBalance: string | number;
    ingresosHoy: string | number;
    gastosHoy: string | number;
    activeAccounts: number;
  };
  history: any[];
}

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
  gastos: {
    label: "Gastos",
    color: "var(--chart-2)",
  },
} as ChartConfig;

export function OverviewCards({ data, history }: OverviewCardsProps) {
  const chartData = useMemo(() => {
    return Array.isArray(history) ? history : [];
  }, [history]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
        <Card className="shadow-xs bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <Landmark className="size-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(Number(data.totalBalance))}
            </div>
            <p className="text-primary-foreground/70 text-xs">Suma de todas las cuentas activas</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas Activas</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeAccounts}</div>
            <p className="text-muted-foreground text-xs">Cuentas bancarias operativas</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <ArrowDownLeft className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500 tabular-nums">
              {formatCurrency(Number(data.ingresosHoy))}
            </div>
            <p className="text-muted-foreground text-xs">Total recibido hoy</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Hoy</CardTitle>
            <ArrowUpRight className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive tabular-nums">
              {formatCurrency(Number(data.gastosHoy))}
            </div>
            <p className="text-muted-foreground text-xs">Total pagado hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3 shadow-xs">
        <CardHeader>
          <CardTitle>Tendencia de Movimientos</CardTitle>
          <CardDescription>Ingresos vs Gastos en los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${value >= 1000 ? value / 1000 + "k" : value}`}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                dataKey="ingresos"
                type="natural"
                fill="url(#fillIngresos)"
                fillOpacity={0.4}
                stroke="var(--chart-1)"
                stackId="a"
              />
              <Area
                dataKey="gastos"
                type="natural"
                fill="url(#fillGastos)"
                fillOpacity={0.4}
                stroke="var(--chart-2)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
