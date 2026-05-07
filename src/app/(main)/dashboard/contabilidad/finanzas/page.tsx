"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTriangle, CheckCircle2, RefreshCcw, Target } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { subscribeFinanzasUpdates } from "@/lib/finanzas-sync";

type InsightItem = {
  title: string;
  detail: string;
  metric?: string;
};

type RecommendationItem = {
  title: string;
  action: string;
  priority: "alta" | "media" | "baja";
};

type FinanceApiResponse = {
  success: boolean;
  data?: {
    rules: {
      sourceDocument: string;
      version: string;
      goals: {
        targetSavingsRate: number;
        maxExpenseRatio: number;
        maxReceivablesOverdueRatio: number;
        maxDebtPressureRatio: number;
      };
    };
    period: {
      days: number;
      start: string;
      end: string;
    };
    kpis: {
      ingresos: number;
      gastos: number;
      balance: number;
      savingsRate: number;
      expenseRatio: number;
      debtPressureRatio: number;
      receivablesOverdueRatio: number;
      receivablesOpenAmount: number;
      receivablesOverdueAmount: number;
    };
    summary: {
      healthScore: number;
      estadoFinanciero: "saludable" | "estable" | "en_riesgo";
      targetSavingsRate: number;
      maxExpenseRatio: number;
    };
    strengths: InsightItem[];
    weaknesses: InsightItem[];
    recommendations: RecommendationItem[];
    alerts: string[];
    monthlyPatterns: {
      title: string;
      detail: string;
      type: "positive" | "warning";
    }[];
    monthlyCategoryTrends: {
      categoria: string;
      total: number;
      lastMonth: number;
      previousMonth: number;
      change: number;
      changePct: number;
      increasing3m: boolean;
      decreasing3m: boolean;
      series: number[];
    }[];
    topExpenseCategories: {
      id: string;
      codigo: string | null;
      nombre: string;
      total: number;
      percentage: number;
    }[];
    monthlyTrend: {
      month: string;
      ingresos: number;
      gastos: number;
      balance: number;
    }[];
  };
  error?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 2 }).format(value);

const ingresoChartConfig = {
  ingresos: { label: "Ingresos", color: "hsl(145 72% 40%)" },
};

const gastoChartConfig = {
  gastos: { label: "Gastos", color: "hsl(0 72% 52%)" },
};

const balanceChartConfig = {
  balance: { label: "Balance", color: "hsl(210 85% 52%)" },
};

const saludChartConfig = {
  score: { label: "Salud", color: "hsl(270 75% 52%)" },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function FinanzasPage() {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceApiResponse["data"] | null>(null);

  const fetchFinance = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }

    try {
      const parsedDays = Number(days);
      const safeDays = Number.isFinite(parsedDays) ? Math.min(Math.max(Math.floor(parsedDays), 7), 365) : 30;
      const res = await fetch(`/api/contabilidad/finanzas?days=${safeDays}`, { cache: "no-store" });
      const json: FinanceApiResponse = await res.json();

      if (!json.success || !json.data) {
        if (!silent) {
          toast.error(json.error ?? "No se pudo cargar el analisis financiero");
          setData(null);
        }
        return;
      }

      setData(json.data);
    } catch {
      if (!silent) {
        toast.error("Error de conexion al cargar finanzas");
        setData(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [days]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchFinance({ silent: true });
    }, 60000);

    const onFocus = () => {
      fetchFinance({ silent: true });
    };

    const onVisibility = () => {
      if (!document.hidden) {
        fetchFinance({ silent: true });
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const unsubscribe = subscribeFinanzasUpdates(() => {
      fetchFinance({ silent: true });
    });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, [fetchFinance]);

  const estadoLabel = useMemo(() => {
    if (!data) return "Sin datos";
    if (data.summary.estadoFinanciero === "saludable") return "Saludable";
    if (data.summary.estadoFinanciero === "estable") return "Estable";
    return "En riesgo";
  }, [data]);

  const monthlyChartData = useMemo(
    () => (data?.monthlyTrend ?? []).map((m) => ({ month: m.month, ingresos: m.ingresos, gastos: m.gastos, balance: m.balance })),
    [data],
  );

  const monthlyHealthData = useMemo(() => {
    if (!data) return [];

    const targetSavingsRate = data.summary.targetSavingsRate;
    const maxExpenseRatio = data.summary.maxExpenseRatio;
    const maxReceivablesOverdueRatio = data.rules.goals.maxReceivablesOverdueRatio;

    return data.monthlyTrend.map((m) => {
      const savingsRate = m.ingresos > 0 ? ((m.balance / m.ingresos) * 100) : 0;
      const expenseRatio = m.ingresos > 0 ? ((m.gastos / m.ingresos) * 100) : m.gastos > 0 ? 100 : 0;
      const score = clampScore(
        40 +
          (savingsRate >= targetSavingsRate ? 20 : -15) +
          (expenseRatio <= maxExpenseRatio ? 20 : -20) +
          (data.kpis.receivablesOverdueRatio <= maxReceivablesOverdueRatio ? 10 : -10) +
          (m.balance >= 0 ? 10 : -10),
      );

      return {
        month: m.month,
        score,
      };
    });
  }, [data]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground text-sm">
            Monitoreo de desempeno financiero, puntos de mejora y recomendaciones accionables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={days}
            onChange={(e) => setDays(e.target.value)}
            inputMode="numeric"
            placeholder="Dias"
            className="w-24"
          />
          <Button onClick={fetchFinance} disabled={loading} variant="outline">
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos</CardDescription>
            <CardTitle>{loading || !data ? "..." : formatCurrency(data.kpis.ingresos)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-20 w-full" config={ingresoChartConfig}>
              <AreaChart data={monthlyChartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} hide />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area type="monotone" dataKey="ingresos" stroke="var(--color-ingresos)" fill="var(--color-ingresos)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos</CardDescription>
            <CardTitle>{loading || !data ? "..." : formatCurrency(data.kpis.gastos)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-20 w-full" config={gastoChartConfig}>
              <AreaChart data={monthlyChartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} hide />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area type="monotone" dataKey="gastos" stroke="var(--color-gastos)" fill="var(--color-gastos)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Balance</CardDescription>
            <CardTitle>{loading || !data ? "..." : formatCurrency(data.kpis.balance)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-20 w-full" config={balanceChartConfig}>
              <AreaChart data={monthlyChartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} hide />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" fill="var(--color-balance)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Salud Financiera</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {loading || !data ? "..." : `${data.summary.healthScore}/100`}
              {!loading && data && <Badge variant="outline">{estadoLabel}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={loading || !data ? 0 : data.summary.healthScore} />
            <ChartContainer className="mt-3 h-20 w-full" config={saludChartConfig}>
              <AreaChart data={monthlyHealthData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} hide />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area type="monotone" dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="text-emerald-600" size={18} />
              Donde lo estas haciendo bien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && data?.strengths?.length ? (
              data.strengths.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    {item.metric ? <Badge variant="secondary">{item.metric}</Badge> : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{item.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">{loading ? "Cargando..." : "Sin fortalezas detectadas."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="text-amber-600" size={18} />
              Donde estas fallando
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && data?.weaknesses?.length ? (
              data.weaknesses.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    {item.metric ? <Badge variant="destructive">{item.metric}</Badge> : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{item.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">{loading ? "Cargando..." : "Sin debilidades detectadas."}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target size={18} />
              Que debes hacer para mejorar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && data?.recommendations?.length ? (
              data.recommendations.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="outline" className="uppercase">
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{item.action}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">{loading ? "Cargando..." : "No hay recomendaciones por ahora."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias de mayor gasto</CardTitle>
            <CardDescription>Te muestra donde se concentra tu salida de dinero.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && data?.topExpenseCategories?.length ? (
                    data.topExpenseCategories.map((row) => (
                      <TableRow key={row.id || row.nombre}>
                        <TableCell>{row.nombre}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                        <TableCell className="text-right">{row.percentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center">
                        {loading ? "Cargando..." : "Sin datos para este periodo."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patrones mensuales detectados</CardTitle>
            <CardDescription>Analisis inteligente de comportamiento reciente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && data?.monthlyPatterns?.length ? (
              data.monthlyPatterns.map((pattern, index) => (
                <div key={`${pattern.title}-${index}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{pattern.title}</p>
                    <Badge variant={pattern.type === "positive" ? "secondary" : "destructive"}>
                      {pattern.type === "positive" ? "Positivo" : "Alerta"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{pattern.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">{loading ? "Cargando..." : "Sin patrones relevantes detectados."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia por categoria</CardTitle>
            <CardDescription>Comparacion del ultimo mes vs el mes anterior.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Cambio</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && data?.monthlyCategoryTrends?.length ? (
                    data.monthlyCategoryTrends.map((row) => (
                      <TableRow key={row.categoria}>
                        <TableCell>{row.categoria}</TableCell>
                        <TableCell className="text-right">{row.changePct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.increasing3m ? "destructive" : row.decreasing3m ? "secondary" : "outline"}>
                            {row.increasing3m ? "Sube 3M" : row.decreasing3m ? "Baja 3M" : "Mixto"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center">
                        {loading ? "Cargando..." : "Sin datos de tendencia por categoria."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
