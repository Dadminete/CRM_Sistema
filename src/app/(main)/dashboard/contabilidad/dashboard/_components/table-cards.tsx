"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { formatCurrency } from "@/lib/utils";

export function TableCards() {
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

  const rows = [
    ...data.cajas.map((caja) => ({
      id: caja.id,
      nombre: caja.nombre,
      tipo: "Caja",
      saldo: caja.saldoActual,
      ingresos: caja.ingresosMes,
      gastos: caja.gastosMes,
      movimientos: caja.movimientos,
    })),
    ...data.cuentasBancarias.map((cuenta) => ({
      id: cuenta.id,
      nombre: `${cuenta.banco} · ${cuenta.numeroCuenta}`,
      tipo: "Cuenta bancaria",
      saldo: cuenta.saldoActual,
      ingresos: cuenta.ingresosMes,
      gastos: cuenta.gastosMes,
      movimientos: cuenta.movimientos,
    })),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Detalle consolidado de cajas y bancos</CardTitle>
          <CardDescription>Resumen con saldos, ingresos, gastos y movimientos por origen financiero.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Saldo</th>
                <th className="px-3 py-2">Ingresos</th>
                <th className="px-3 py-2">Gastos</th>
                <th className="px-3 py-2">Movimientos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{row.nombre}</td>
                  <td className="px-3 py-2">{row.tipo}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(row.saldo)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(row.ingresos)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrency(row.gastos)}</td>
                  <td className="px-3 py-2 tabular-nums">{row.movimientos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
