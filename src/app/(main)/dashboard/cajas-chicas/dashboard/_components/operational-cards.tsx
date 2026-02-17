"use client";

import { Wallet, Landmark } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, cn } from "@/lib/utils";

interface OperationalCardsProps {
  boxes: any[];
  discrepancias?: number;
}

export function OperationalCards({ boxes, discrepancias = 0 }: OperationalCardsProps) {
  const safeBoxes = Array.isArray(boxes) ? boxes : [];
  const totalBalance = safeBoxes.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Estado de Cajas Chicas</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            Balance Consolidado: {formatCurrency(totalBalance)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {safeBoxes.map((box) => (
              <div key={box.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {box.type === "banco" ? (
                      <Landmark className="size-4 text-blue-500" />
                    ) : (
                      <Wallet className="size-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">{box.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(parseFloat(box.balance || 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={totalBalance > 0 ? (parseFloat(box.balance || 0) / totalBalance) * 100 : 0} />
                  <span className="text-muted-foreground text-[10px] font-medium tabular-nums">
                    {totalBalance > 0 ? ((parseFloat(box.balance || 0) / totalBalance) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="hover:bg-muted/50 cursor-default space-y-2 rounded-md border px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <span className="text-sm font-medium">Caja Principal abierta</span>
                <span className="ml-auto rounded-md bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-yellow-600 uppercase dark:text-yellow-400">
                  Aviso
                </span>
              </div>
              <div className="text-muted-foreground text-xs leading-relaxed font-medium">
                Sesión activa hace más de 8 horas. Requiere revisión.
              </div>
            </div>

            <div className="hover:bg-muted/50 cursor-default space-y-2 rounded-md border px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-sm font-medium">Cierre pendiente</span>
                <span className="ml-auto rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                  Info
                </span>
              </div>
              <div className="text-muted-foreground text-xs leading-relaxed font-medium">
                El usuario "Admin" no ha cerrado su turno del día de hoy.
              </div>
            </div>

            {discrepancias === 0 ? (
              <div className="cursor-default space-y-2 rounded-md border border-emerald-200/50 bg-emerald-50/10 px-3 py-2.5 transition-all hover:bg-emerald-50/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-sm font-bold font-medium">Sistema Balanceado</span>
                  <span className="ml-auto rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    OK
                  </span>
                </div>
                <div className="text-xs leading-relaxed font-medium text-emerald-600 dark:text-emerald-400">
                  Todos los cierres están cuadrados. No hay discrepancias pendientes.
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer space-y-2 rounded-md border border-red-200/50 bg-red-50/10 px-3 py-2.5 transition-all hover:bg-red-50/20 active:scale-[0.98]"
                onClick={() => (window.location.href = "/dashboard/cajas-chicas/discrepancias")}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-sm font-bold font-medium">Diferencia Crítica</span>
                  <span className="ml-auto rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-red-600 uppercase dark:text-red-400">
                    Critico
                  </span>
                </div>
                <div className="text-xs leading-relaxed font-medium text-red-600 dark:text-red-400">
                  Se detectaron {discrepancias} {discrepancias === 1 ? "discrepancia" : "discrepancias"} en los cierres.
                  Haz clic para resolver.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
