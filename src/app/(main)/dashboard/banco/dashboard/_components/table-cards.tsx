"use client";

import { ArrowDownLeft, ArrowUpRight, History, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TableCardsProps {
  recent: any[];
  transfers: any[];
}

export function TableCards({ recent, transfers }: TableCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="shadow-xs xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Movimientos Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas en bancos</CardDescription>
          </div>
          <History className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                      No hay movimientos recientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">
                        {format(new Date(m.fecha), "dd MMM, yy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium line-clamp-1">{m.descripcion}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{m.metodo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          m.tipo === "ingreso" ? "text-green-600" : "text-destructive"
                        )}>
                          {m.tipo === "ingreso" ? "+" : "-"}{formatCurrency(m.monto, { noDecimals: true })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Traspasos Bancarios</CardTitle>
            <CardDescription>Historial de transferencias entre cuentas</CardDescription>
          </div>
          <Repeat className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                      No hay traspasos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{t.bancoOrigenNombre || "Caja"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{t.bancoDestinoNombre || "Caja"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(t.monto, { noDecimals: true })}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(t.fecha), "dd MMM", { locale: es })}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
