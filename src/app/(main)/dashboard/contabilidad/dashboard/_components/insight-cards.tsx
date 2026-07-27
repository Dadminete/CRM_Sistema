"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { formatCurrency } from "@/lib/utils";

export function InsightCards() {
  const [data, setData] = useState<AccountingDashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/contabilidad/dashboard", { cache: "no-store" });
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      }
    };

    void load();
  }, []);

  if (!data) {
    return null;
  }

  const topCategories = data.categories.slice(0, 6);
  const totalCategories = data.categories.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-5">
      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Distribución por categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topCategories.map((category) => {
            const percentage = totalCategories > 0 ? (category.total / totalCategories) * 100 : 0;
            return (
              <div key={`${category.nombre}-${category.tipo}`} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.nombre}</span>
                  <span className="tabular-nums">{formatCurrency(category.total)}</span>
                </div>
                <Progress value={Math.min(100, percentage)} />
                <p className="text-muted-foreground text-xs">
                  {category.count} movimientos · {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Los montos se toman desde los movimientos del periodo actual.</p>
        </CardFooter>
      </Card>

      <Card className="col-span-1 xl:col-span-3">
        <CardHeader>
          <CardTitle>Resumen financiero detallado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Ingresos</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.periodSummary.ingresosMes)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Gastos</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.periodSummary.gastosMes)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Balance</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.periodSummary.balanceMes)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">Movimientos</p>
            <p className="text-xl font-semibold tabular-nums">{data.periodSummary.movimientos}</p>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">Incluye movimientos asociados a cajas y cuentas bancarias.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
