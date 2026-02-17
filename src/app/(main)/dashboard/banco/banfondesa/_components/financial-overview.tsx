"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { getBanfondesaData } from "../actions";
import { Loader2 } from "lucide-react";

const chartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
  income: {
    label: "Income",
    color: "var(--chart-3)",
  },
} as ChartConfig;

export function FinancialOverview() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await getBanfondesaData();
      if (res.success && res.data?.statsData) {
        // statsData is array of objects { month, income, expenses, scheduled }
        // We need to map it or use it directly if format matches

        // Ensure we have at least getting something, if strictly empty maybe mock
        let data = res.data.statsData;
        if (!data || data.length === 0) {
          // Fallback empty structure
          data = [];
        }
        setChartData(data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const totalIncome = chartData.reduce((acc, item) => acc + (item.income || 0), 0);
  const totalExpenses = chartData.reduce((acc, item) => acc + (item.expenses || 0), 0);
  const totalScheduled = chartData.reduce((acc, item) => acc + (item.scheduled || 0), 0);

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
        <CardDescription>Rastrea tus ingresos y gastos de un vistazo.</CardDescription>
        <CardAction>
          <Select defaultValue="ytd">
            <SelectTrigger>
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-year">Año Pasado</SelectItem>
              <SelectItem value="last-month">Mes Pasado</SelectItem>
              <SelectItem value="ytd">Este Año</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Separator />
        <div className="flex flex-col items-start justify-between gap-2 py-5 md:flex-row md:items-stretch md:gap-0">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
              <ArrowDownLeft className="stroke-chart-1 size-6" />
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
              <CalendarCheck className="stroke-chart-3 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Programado</p>
              <p className="font-medium tabular-nums">{formatCurrency(totalScheduled, { noDecimals: true })}</p>
            </div>
          </div>
        </div>
        <Separator />
        <ChartContainer className="max-h-72 w-full" config={chartConfig}>
          <BarChart margin={{ left: -25, right: 0, top: 25, bottom: 0 }} accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value >= 1000 ? value / 1000 + "k" : value}`}
              // domain={[0, 'auto']}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="scheduled" stackId="a" fill={chartConfig.scheduled.color} />
            <Bar dataKey="expenses" stackId="a" fill={chartConfig.expenses.color} />
            <Bar dataKey="income" stackId="a" fill={chartConfig.income.color} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
