"use client";

import { useEffect, useState } from "react";

import { BadgeDollarSign, Wallet2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { formatCurrency } from "@/lib/utils";

export function OverviewCards() {
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

  const { periodSummary, cajas, cuentasBancarias } = data;
  const cajasActivas = cajas.length;
  const cuentasActivas = cuentasBancarias.length;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos del mes</CardTitle>
          <CardDescription>{data.periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(periodSummary.ingresosMes)}</p>
          <p className="text-muted-foreground text-sm">Movimientos registrados del periodo</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gastos del mes</CardTitle>
          <CardDescription>{data.periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(periodSummary.gastosMes)}</p>
          <p className="text-muted-foreground text-sm">{periodSummary.gastoPct}% del ingreso mensual</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-green-500/10 p-2">
            <Wallet2 className="size-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Balance del mes</CardTitle>
            <CardDescription>Ingresos menos gastos</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">{formatCurrency(periodSummary.balanceMes)}</p>
          <div className="w-fit rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
            {periodSummary.ahorroPct}% ahorro
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="bg-destructive/10 w-fit rounded-lg p-2">
            <BadgeDollarSign className="text-destructive size-5" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Saldo en cajas</CardTitle>
            <CardDescription>Valor operativo actual</CardDescription>
          </div>
          <p className="text-2xl font-medium tabular-nums">{formatCurrency(periodSummary.cajasSaldo)}</p>
          <div className="text-destructive bg-destructive/10 w-fit rounded-md px-2 py-1 text-xs font-medium">
            {cajasActivas} cajas activas
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Saldo en bancos</CardTitle>
          <CardDescription>Detalle de cuentas financieras</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(periodSummary.bancosSaldo)}</p>
          <p className="text-muted-foreground mt-2 text-sm">{cuentasActivas} cuentas bancarias activas</p>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">Se incluyen saldos iniciales + movimientos del mes</p>
        </CardFooter>
      </Card>
    </div>
  );
}
