"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { siVisa } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, cn } from "@/lib/utils";
import { getBanfondesaData } from "../actions";
import { Loader2 } from "lucide-react";

function ChipSVG() {
  return (
    <svg enableBackground="new 0 0 132 92" viewBox="0 0 132 92" xmlns="http://www.w3.org/2000/svg" className="w-14">
      <title>Chip</title>
      <rect x="0.5" y="0.5" width="131" height="91" rx="15" className="fill-accent stroke-accent" />
      <rect x="9.5" y="9.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="9.5" y="61.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="9.5" y="35.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="9.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="61.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="35.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
    </svg>
  );
}

export function AccountOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await getBanfondesaData();
      if (res.success) {
        setData(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </Card>
    );
  }

  const bankName = data?.bank?.nombre || "Banfondesa";
  const balance = data?.totalBalance || 0;
  const recentTransactions = data?.recentTransactions || [];

  return (
    <Card className="shadow-xs">
      <CardHeader className="items-center">
        <CardTitle>{bankName}</CardTitle>
        <CardDescription>Resumen de cuentas, balance y transacciones recientes.</CardDescription>
        <CardAction>
          <Button size="icon" variant="outline">
            <Plus className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs className="gap-4" defaultValue="main">
          <TabsList className="w-full">
            <TabsTrigger value="main">Principal</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>
          <TabsContent value="main">
            <div className="space-y-4">
              <div className="bg-primary relative aspect-8/5 w-full max-w-96 overflow-hidden rounded-xl perspective-distant">
                <div className="absolute top-6 left-6">
                  {/* Using Visa icon as generic bank card icon */}
                  <SimpleIcon icon={siVisa} className="fill-primary-foreground size-8" />
                </div>
                <div className="absolute top-1/2 w-full -translate-y-1/2">
                  <div className="flex items-end justify-between px-6">
                    <span className="text-accent font-mono text-lg leading-none font-medium tracking-wide uppercase">
                      {bankName}
                    </span>
                    <ChipSVG />
                  </div>
                </div>
                <div className="text-primary-foreground absolute bottom-6 left-6 font-mono text-sm">balance total</div>
                <div className="text-primary-foreground absolute right-6 bottom-6 text-xl font-bold tabular-nums">
                  {formatCurrency(balance)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="font-medium">{bankName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium text-green-500">Activo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cuentas Asociadas</span>
                  <span className="font-medium tabular-nums">{data?.bank?.cuentasBancarias?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Balance Disponible</span>
                  <span className="font-medium tabular-nums">{formatCurrency(balance)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h6 className="text-muted-foreground text-sm uppercase">Movimientos Recientes</h6>

                <div className="space-y-4">
                  {recentTransactions.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">No hay movimientos recientes.</p>
                  ) : (
                    recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center gap-2">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${transaction.type === "debit" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        >
                          {/* Simple icon or initial based on transaction */}
                          <span className="text-xs font-bold">{transaction.type === "debit" ? "-" : "+"}</span>
                        </div>
                        <div className="flex w-full items-end justify-between">
                          <div>
                            <p className="text-sm font-medium">{transaction.title}</p>
                            <p className="text-muted-foreground line-clamp-1 text-xs">{transaction.subtitle}</p>
                          </div>
                          <div>
                            <span
                              className={cn(
                                "text-sm leading-none font-medium tabular-nums",
                                transaction.type === "debit" ? "text-destructive" : "text-green-500",
                              )}
                            >
                              {formatCurrency(transaction.amount, { noDecimals: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button className="w-full" size="sm" variant="outline">
                  Ver Todos los Movimientos
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="details">
            <div className="space-y-4 py-4">
              {data?.bank?.cuentasBancarias?.map((acc: any) => (
                <div key={acc.id} className="rounded border p-3 text-sm">
                  <div className="font-medium">Cuenta {acc.tipoCuenta}</div>
                  <div className="text-muted-foreground">{acc.numeroCuenta}</div>
                  <div className="mt-2 flex justify-between">
                    <span>Moneda: {acc.moneda}</span>
                    <span className="font-bold">
                      {acc.cuentasContable?.saldoActual ? formatCurrency(Number(acc.cuentasContable.saldoActual)) : "-"}
                    </span>
                  </div>
                </div>
              ))}
              {(!data?.bank?.cuentasBancarias || data?.bank?.cuentasBancarias.length === 0) && (
                <p className="text-muted-foreground text-center">No hay cuentas registradas.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
