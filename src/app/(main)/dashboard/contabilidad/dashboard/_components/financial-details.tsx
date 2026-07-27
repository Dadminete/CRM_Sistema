"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowDownLeft, ArrowUpRight, ListFilter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { formatCurrency } from "@/lib/utils";

function createEmptyDashboardData(): AccountingDashboardData {
  return {
    periodLabel: "Sin datos",
    periodSummary: {
      ingresos: 0,
      gastos: 0,
      balance: 0,
      ingresosMes: 0,
      gastosMes: 0,
      balanceMes: 0,
      movimientos: 0,
      cajasSaldo: 0,
      bancosSaldo: 0,
      ahorroPct: 0,
      gastoPct: 0,
    },
    cajas: [],
    cuentasBancarias: [],
    recentMovements: [],
    categories: [],
  };
}

function buildDashboardState(json: unknown) {
  if (!json || typeof json !== "object") {
    return {
      data: createEmptyDashboardData(),
      message: "Sin datos disponibles",
    };
  }

  const response = json as {
    success?: boolean;
    data?: AccountingDashboardData;
    diagnostics?: { message?: string | null };
  };

  if (response.success) {
    return {
      data: response.data ?? createEmptyDashboardData(),
      message: response.diagnostics?.message ?? null,
    };
  }

  return {
    data: createEmptyDashboardData(),
    message: "Sin datos disponibles",
  };
}

export function FinancialDetails() {
  const [data, setData] = useState<AccountingDashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/contabilidad/dashboard", { cache: "no-store" });
        const json = await response.json();

        if (!isActive) {
          return;
        }

        const nextState = buildDashboardState(json);
        setData(nextState.data);
        setMessage(nextState.message);
      } catch {
        if (!isActive) {
          return;
        }

        setData(createEmptyDashboardData());
        setMessage("Sin datos disponibles. Revise la conexión o la base de datos.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredMovements = useMemo(() => {
    if (!data) {
      return [];
    }

    const query = search.toLowerCase();
    return data.recentMovements.filter((movement) => {
      const hayTexto = `${movement.descripcion ?? ""} ${movement.origen} ${movement.categoria ?? ""}`.toLowerCase();
      return hayTexto.includes(query);
    });
  }, [data, search]);

  const hasMovements = data?.recentMovements.length > 0;
  const showEmptyState = !isLoading && (!hasMovements || filteredMovements.length === 0);

  return (
    <Card className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-200/80 p-4 dark:border-slate-700/80">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-black tracking-widest text-slate-800 uppercase dark:text-slate-100">
              Movimientos recientes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase dark:text-slate-500">
              Detalle contable
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ListFilter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Buscar movimientos..."
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cargando movimientos...</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Recuperando la información financiera más reciente.
              </p>
            </div>
          ) : showEmptyState ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sin datos disponibles</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {search
                  ? "No hay movimientos que coincidan con la búsqueda."
                  : (message ?? "No hay movimientos registrados para este periodo.")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMovements.map((movement) => {
                const isIncome = movement.tipo.toLowerCase() === "ingreso";
                return (
                  <div
                    key={movement.id}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-slate-100 hover:bg-slate-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="group-hover:text-primary text-[11px] leading-tight font-black text-slate-800 transition-colors dark:text-slate-100">
                          {movement.descripcion ?? "Movimiento sin descripción"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold tracking-tight text-slate-400 uppercase dark:text-slate-500">
                            {new Date(movement.fecha).toLocaleString("es-DO", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                          <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                          <span className="rounded bg-slate-100 px-1.5 text-[9px] font-black tracking-tighter text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                            {movement.categoria ?? movement.origen}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-black tabular-nums ${
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(movement.monto)}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-4 border-slate-100 text-[8px] font-black text-slate-400 dark:border-slate-700 dark:text-slate-400"
                      >
                        {movement.origenTipo.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
