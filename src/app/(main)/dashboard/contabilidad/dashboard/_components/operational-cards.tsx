"use client";

import { useEffect, useState } from "react";

import { Banknote, BriefcaseBusiness } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { formatCurrency } from "@/lib/utils";

export function OperationalCards() {
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

  const totalCajas = data.cajas.reduce((sum, caja) => sum + caja.saldoActual, 0);
  const totalBancos = data.cuentasBancarias.reduce((sum, cuenta) => sum + cuenta.saldoActual, 0);
  const totalMovimientos = data.periodSummary.movimientos;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Detalle de cajas</CardTitle>
          <CardDescription>Saldo total operativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Saldo combinado</span>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(totalCajas)}</span>
          </div>
          <div className="space-y-2">
            {data.cajas.slice(0, 4).map((caja) => (
              <div key={caja.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{caja.nombre}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(caja.saldoActual)}</span>
                </div>
                <Progress value={Math.min(100, (caja.saldoActual / Math.max(totalCajas, 1)) * 100)} />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            Se consideran los saldos actuales más los movimientos del mes.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas bancarias</CardTitle>
          <CardDescription className="font-medium tabular-nums">{formatCurrency(totalBancos)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {data.cuentasBancarias.slice(0, 4).map((cuenta) => (
              <div key={cuenta.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {cuenta.banco} - {cuenta.numeroCuenta}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(cuenta.saldoActual)}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  Ingresos: {formatCurrency(cuenta.ingresosMes)} · Gastos: {formatCurrency(cuenta.gastosMes)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-muted-foreground flex justify-between gap-1 text-xs">
            <span>{data.cuentasBancarias.length} cuentas</span>
            <span>•</span>
            <span>{totalMovimientos} movimientos</span>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen operativo</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            <li className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-emerald-600" />
                <span className="text-sm font-medium">Ingresos del periodo</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(data.periodSummary.ingresosMes)}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 text-rose-600" />
                <span className="text-sm font-medium">Gastos del periodo</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(data.periodSummary.gastosMes)}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
