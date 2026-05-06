"use client";

import { useEffect, useMemo, useState } from "react";

import { ShoppingBasket, TramFront, Ellipsis } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

import { getBankData } from "../../banco/[bankSlug]/actions";

const chartData = [{ period: "last-week", groceries: 380, transport: 120, other: 80 }];

const chartConfig = {
  cat1: {
    label: "Categoría 1",
    color: "var(--chart-1)",
  },
  cat2: {
    label: "Categoría 2",
    color: "var(--chart-2)",
  },
  cat3: {
    label: "Categoría 3",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type ExpenseSummaryProps = {
  bankSlug?: string;
};

type TopCategory = {
  name: string;
  amount: number;
};

type PeriodStats = {
  key: string;
  label: string;
  topCategories: TopCategory[];
  totalExpenses: number;
};

const defaultCategories: TopCategory[] = [
  { name: "Compras", amount: chartData[0].groceries },
  { name: "Transporte", amount: chartData[0].transport },
  { name: "Otros", amount: chartData[0].other },
];

export function ExpenseSummary({ bankSlug }: ExpenseSummaryProps) {
  const [topCategories, setTopCategories] = useState<TopCategory[]>(defaultCategories);
  const [periodLabel, setPeriodLabel] = useState("mes actual");
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");

  useEffect(() => {
    // eslint-disable-next-line complexity
    async function loadExpenseSummary() {
      if (!bankSlug) {
        setTopCategories(defaultCategories);
        setPeriodLabel("mes actual");
        return;
      }

      const response = await getBankData(bankSlug);
      if (response.success && response.data?.expenseStats?.periods) {
        const responsePeriods = response.data.expenseStats.periods;

        const normalizeCategories = (rawCategories: { name?: unknown; amount?: unknown }[]) => {
          const categories = rawCategories.slice(0, 3).map((item) => ({
            name: String(item?.name ?? "Sin categoría"),
            amount: Number(item?.amount ?? 0),
          }));

          while (categories.length < 3) {
            categories.push({ name: "Sin datos", amount: 0 });
          }

          return categories;
        };

        const normalizedPeriods: Record<string, PeriodStats> = {
          "current-month": {
            key: "current-month",
            label: String(responsePeriods.currentMonth?.label ?? "mes actual"),
            topCategories: normalizeCategories(responsePeriods.currentMonth?.topCategories ?? []),
            totalExpenses: Number(responsePeriods.currentMonth?.totalExpenses ?? 0),
          },
          "last-month": {
            key: "last-month",
            label: String(responsePeriods.lastMonth?.label ?? "mes pasado"),
            topCategories: normalizeCategories(responsePeriods.lastMonth?.topCategories ?? []),
            totalExpenses: Number(responsePeriods.lastMonth?.totalExpenses ?? 0),
          },
          "year-to-date": {
            key: "year-to-date",
            label: String(responsePeriods.ytd?.label ?? "este año"),
            topCategories: normalizeCategories(responsePeriods.ytd?.topCategories ?? []),
            totalExpenses: Number(responsePeriods.ytd?.totalExpenses ?? 0),
          },
        };

        const activePeriod = normalizedPeriods[selectedPeriod] ?? normalizedPeriods["current-month"];

        setTopCategories(activePeriod.topCategories);
        setPeriodLabel(activePeriod.label);
      } else if (response.success && response.data?.expenseStats?.topCategories) {
        const categories = response.data.expenseStats.topCategories
          .slice(0, 3)
          .map((item: { name?: unknown; amount?: unknown }) => ({
            name: String(item?.name ?? "Sin categoría"),
            amount: Number(item?.amount ?? 0),
          }));

        while (categories.length < 3) {
          categories.push({ name: "Sin datos", amount: 0 });
        }

        setTopCategories(categories);
        setPeriodLabel(String(response.data.expenseStats.periodLabel ?? "mes actual"));
      } else {
        setTopCategories(defaultCategories);
        setPeriodLabel("mes actual");
      }
    }

    loadExpenseSummary();
  }, [bankSlug, selectedPeriod]);

  const chartData = useMemo(
    () => [
      {
        period: "month",
        cat1: topCategories[0]?.amount || 0,
        cat2: topCategories[1]?.amount || 0,
        cat3: topCategories[2]?.amount || 0,
      },
    ],
    [topCategories],
  );

  const totalExpenses = chartData[0].cat1 + chartData[0].cat2 + chartData[0].cat3;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Gastos</CardTitle>
        <div className="max-w-[220px]">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mes actual</SelectItem>
              <SelectItem value="last-month">Mes pasado</SelectItem>
              <SelectItem value="year-to-date">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />

        <div className="h-32">
          <ChartContainer config={chartConfig}>
            <RadialBarChart
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              data={chartData}
              endAngle={180}
              innerRadius={80}
              outerRadius={130}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) - 16}
                            className="fill-foreground text-2xl font-bold tabular-nums"
                          >
                            {formatCurrency(totalExpenses, { noDecimals: true })}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 4} className="fill-muted-foreground">
                            Gastado
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="cat3"
                stackId="a"
                cornerRadius={4}
                fill="var(--color-cat3)"
                className="stroke-card stroke-4"
              />
              <RadialBar
                dataKey="cat2"
                stackId="a"
                cornerRadius={4}
                fill="var(--color-cat2)"
                className="stroke-card stroke-4"
              />
              <RadialBar
                dataKey="cat1"
                stackId="a"
                cornerRadius={4}
                fill="var(--color-cat1)"
                className="stroke-card stroke-4"
              />
            </RadialBarChart>
          </ChartContainer>
        </div>
        <Separator />
        <div className="flex justify-between gap-4">
          <div className="flex flex-1 flex-col items-center space-y-2">
            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
              <ShoppingBasket className="stroke-chart-1 size-5" />
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-muted-foreground text-xs uppercase">{topCategories[0]?.name || "Sin datos"}</p>
              <p className="font-medium tabular-nums">{formatCurrency(chartData[0].cat1, { noDecimals: true })}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 flex-col items-center space-y-2">
            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
              <TramFront className="stroke-chart-2 size-5" />
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-muted-foreground text-xs uppercase">{topCategories[1]?.name || "Sin datos"}</p>
              <p className="font-medium tabular-nums">{formatCurrency(chartData[0].cat2, { noDecimals: true })}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 flex-col items-center space-y-2">
            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
              <Ellipsis className="stroke-chart-3 size-5" />
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-muted-foreground text-xs uppercase">{topCategories[2]?.name || "Sin datos"}</p>
              <p className="font-medium tabular-nums">{formatCurrency(chartData[0].cat3, { noDecimals: true })}</p>
            </div>
          </div>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          Top 3 categorías con mayor gasto en {periodLabel}
        </span>
      </CardContent>
    </Card>
  );
}
