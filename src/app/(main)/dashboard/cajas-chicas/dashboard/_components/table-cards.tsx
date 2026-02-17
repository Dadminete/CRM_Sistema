"use client";

import { Download, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TableCardsProps {
  recent: any[];
}

export function TableCards({ recent }: TableCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Últimas transacciones registradas en todas las cajas.</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              <Download className="mr-2" />
              Exportar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Descripción</th>
                  <th className="px-4 py-3 text-left font-medium">Método</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(recent) ? recent : []).map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 border-b transition-colors last:border-0">
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {format(new Date(m.fecha), "dd MMM HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {m.tipo === "ingreso" ? (
                          <ArrowUpCircle className="size-4 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="text-destructive size-4" />
                        )}
                        <span className="font-medium">{m.descripcion || "Sin descripción"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground capitalize">{m.metodo}</span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-bold tabular-nums",
                        m.tipo === "ingreso" ? "text-green-600" : "text-destructive",
                      )}
                    >
                      {m.tipo === "ingreso" ? "+" : "-"}
                      {formatCurrency(parseFloat(m.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
