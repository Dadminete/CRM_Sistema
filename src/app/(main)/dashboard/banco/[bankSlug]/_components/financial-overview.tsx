"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { getBankData } from "../actions";

const chartConfig = {
  scheduled: {
    label: "Monto actual",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Gastos",
    color: "var(--chart-2)",
  },
  income: {
    label: "Ingresos",
    color: "var(--chart-3)",
  },
} as ChartConfig;

const currentYear = new Date().getFullYear();

export function FinancialOverview({ bankSlug }: { bankSlug: string }) {
  const [allData, setAllData] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [period, setPeriod] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getBankData(bankSlug);
      if (res.success && res.data?.statsData) {
        setAllData(res.data.statsData);
        setTotalBalance(Number(res.data.totalBalance || 0));
        setError(null);
      } else {
        setAllData([]);
        setTotalBalance(0);
        setError(res.error || "No se pudieron cargar los datos financieros.");
      }
      setLoading(false);
    }
    loadData();
  }, [bankSlug]);

  const chartData = useMemo(() => {
    if (period === "ytd") return allData.filter((d) => d.year === currentYear);
    if (period === "last-year") return allData.filter((d) => d.year === currentYear - 1);
    return allData; // "all" — historial completo
  }, [period, allData]);

  const totalIncome = chartData.reduce((acc, item) => acc + (item.income || 0), 0);
  const totalExpenses = chartData.reduce((acc, item) => acc + (item.expenses || 0), 0);

  if (loading) {
    return (
      <Card className="flex min-h-[350px] items-center justify-center shadow-xs">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Resumen Financiero</CardTitle>
        <CardDescription>Historial de ingresos y gastos.</CardDescription>
        <CardAction>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el Historial</SelectItem>
              <SelectItem value="ytd">Este Año</SelectItem>
              <SelectItem value="last-year">Año Pasado</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Separator />
        <div className="flex flex-col items-start justify-between gap-2 py-5 md:flex-row md:items-stretch md:gap-0">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
              <ArrowDownLeft className="stroke-chart-3 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Ingresos</p>
              <p className="font-medium tabular-nums">{formatCurrency(totalIncome, { noDecimals: true })}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
              <ArrowUpRight className="stroke-chart-2 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Gastos</p>
              <p className="font-medium tabular-nums">{formatCurrency(totalExpenses, { noDecimals: true })}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
              <CalendarCheck className="stroke-chart-1 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Monto actual</p>
              <p className="font-medium tabular-nums">{formatCurrency(totalBalance, { noDecimals: true })}</p>
            </div>
          </div>
        </div>
        <Separator />
        {chartData.length === 0 ? (
          <div className="text-muted-foreground py-10 text-center text-sm">
            {error || "No hay movimientos históricos para el período seleccionado."}
          </div>
        ) : (
          <ChartContainer className="max-h-72 w-full" config={chartConfig}>
            <BarChart margin={{ left: -25, right: 0, top: 25, bottom: 0 }} accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value >= 1000 ? value / 1000 + "k" : value}`}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="scheduled" stackId="a" fill={chartConfig.scheduled.color} />
              <Bar dataKey="expenses" stackId="a" fill={chartConfig.expenses.color} />
              <Bar dataKey="income" stackId="a" fill={chartConfig.income.color} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
