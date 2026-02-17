"use client";

import { ArrowRightLeft } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

const chartData = [
  { time: "09:00", rate: 58.45 },
  { time: "10:00", rate: 58.48 },
  { time: "11:00", rate: 58.52 },
  { time: "12:00", rate: 58.5 },
  { time: "13:00", rate: 58.49 },
  { time: "14:00", rate: 58.55 },
  { time: "15:00", rate: 58.6 },
];

const chartConfig = {
  rate: {
    label: "Rate (USD/DOP)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function CurrencyExchange() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambio de Divisas</CardTitle>
        <CardDescription>Tasa de cambio USD a DOP en tiempo real.</CardDescription>
        <CardAction>
          <Button size="icon" variant="outline">
            <ArrowRightLeft className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold tabular-nums">58.60</p>
            <p className="text-muted-foreground text-sm">USD a DOP</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-green-500 tabular-nums">+0.25%</p>
            <p className="text-muted-foreground text-xs">Desce ayer</p>
          </div>
        </div>

        <div className="h-32 w-full">
          <ChartContainer config={chartConfig}>
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-rate)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-rate)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={["dataMin - 0.1", "dataMax + 0.1"]} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Area
                dataKey="rate"
                type="natural"
                fill="url(#fillRate)"
                fillOpacity={0.4}
                stroke="var(--color-rate)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase">Venta</p>
            <p className="font-medium tabular-nums">58.85</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase">Compra</p>
            <p className="font-medium tabular-nums">58.35</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
