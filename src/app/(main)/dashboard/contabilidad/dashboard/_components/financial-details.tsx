"use client";

import { ArrowDownLeft, ArrowUpRight, Search, ListFilter, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const recentMovements = [
  { id: 1, type: "ingreso", amount: 15600, desc: "Venta Mayorista #4502", date: "Hoy, 10:24 AM", category: "Ventas" },
  { id: 2, type: "gasto", amount: 2450, desc: "Pago Internet Enero", date: "Hoy, 09:15 AM", category: "Servicios" },
  { id: 3, type: "ingreso", amount: 45, desc: "Venta Papelería #321", date: "Ayer, 05:30 PM", category: "Papelería" },
  { id: 4, type: "gasto", amount: 12000, desc: "Nómina - Juan Perez", date: "Ayer, 04:00 PM", category: "Nómina" },
  { id: 5, type: "ingreso", amount: 8200, desc: "Cobro Factura #128", date: "11 Feb, 02:15 PM", category: "Cobros" },
];

export function FinancialDetails() {
  return (
    <Card className="h-full overflow-hidden border-slate-200 bg-white shadow-xl">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-black tracking-widest text-slate-800 uppercase">
              Movimientos Recientes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase">
              Detalle contable
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400">
              <ListFilter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar movimientos..."
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-[11px] font-bold"
            />
          </div>

          <div className="space-y-2">
            {recentMovements.map((m) => (
              <div
                key={m.id}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-slate-100 hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${m.type === "ingreso" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                  >
                    {m.type === "ingreso" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="group-hover:text-primary text-[11px] leading-tight font-black text-slate-800 transition-colors">
                      {m.desc}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-tight text-slate-400 uppercase">{m.date}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="rounded bg-slate-100 px-1.5 text-[9px] font-black tracking-tighter text-slate-500 uppercase">
                        {m.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-black tabular-nums ${m.type === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {m.type === "ingreso" ? "+" : "-"}
                    {formatCurrency(m.amount)}
                  </p>
                  <Badge variant="outline" className="h-4 border-slate-100 text-[8px] font-black text-slate-400">
                    PROCESADO
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <Button variant="ghost" className="text-primary hover:bg-primary/5 w-full text-[10px] font-black uppercase">
            Ver Todo el Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
