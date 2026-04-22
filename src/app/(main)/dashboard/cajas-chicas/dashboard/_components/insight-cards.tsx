"use client";

import { XAxis, Label, Pie, PieChart, Bar, BarChart, CartesianGrid, LabelList, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart";

interface InsightCardsProps {
  distribution: any[];
}

export function InsightCards({ distribution }: InsightCardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);

  const chartData = Array.isArray(distribution)
    ? distribution.map((d, i) => ({
        source: d.source,
        value: parseFloat(d.value || 0),
        fill: `var(--chart-${(i % 5) + 1})`,
      }))
    : [];

  const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-5">
      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Ingresos por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="max-h-48">
          <ChartContainer config={{}} className="size-full">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="source"
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
                            className="fill-foreground text-xl font-bold tabular-nums"
                          >
                            {formatCurrency(totalValue)}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            Total
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
                  <ul className="ml-8 flex flex-col gap-2">
                    {chartData.map((item) => (
                      <li key={item.source} className="flex w-32 items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: item.fill }} />
                          {item.source}
                        </span>
                        <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-1 xl:col-span-3">
        <CardHeader>
          <CardTitle>Distribución de Ingresos</CardTitle>
        </CardHeader>
        <CardContent className="size-full max-h-52">
          <ChartContainer config={{}} className="size-full">
            <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 60, right: 10 }}>
              <CartesianGrid horizontal={false} />
              <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} hide />
              <XAxis dataKey="value" type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="value" layout="vertical" fill="var(--chart-1)" radius={[0, 6, 6, 0]}>
                <LabelList
                  dataKey="value"
                  position="left"
                  offset={10}
                  className="fill-foreground text-[10px] font-bold tabular-nums"
                  formatter={(v: any) => formatCurrency(Number(v || 0))}
                />
                <LabelList dataKey="source" position="insideRight" offset={8} className="fill-white text-[10px]" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
