"use client";

import { useState, useEffect } from "react";

import { format, subMonths } from "date-fns";
import { Wallet, BadgeDollarSign, FileText, TrendingUp, Landmark } from "lucide-react";
import { Area, AreaChart, Line, LineChart, Bar, BarChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn, formatCurrency } from "@/lib/utils";

// --- Interfaces ---
interface ChartDataPoint {
  fecha: string;
  ingresos: number;
  gastos: number;
}

interface CajaPrincipalData {
  balanceActual: number;
  gastosDelMes: number;
  estado: string;
  ultimosDias: ChartDataPoint[];
}

interface PapeleriaData {
  balanceActual: number;
  ventasDelMes: number;
  gastosDelMes: number;
  estado: string;
  ultimosDias: {
    fecha: string;
    ventas: number;
    gastos: number;
  }[];
}

interface BankAccountsData {
  saldoTotal: number;
  ultimosMeses: {
    mes: string;
    ingresos: number;
    gastos: number;
    balance: number;
  }[];
}

interface InvoicesStatsData {
  totalPendiente: number;
  totalParcial: number;
  stats: {
    fecha: string;
    ingresos: number;
  }[];
}

interface NetIncomeData {
  totalNetoMensual: number;
}

interface DashboardOverviewData {
  cajaPrincipal: CajaPrincipalData | null;
  papeleria: PapeleriaData | null;
  banks: BankAccountsData | null;
  invoices: InvoicesStatsData | null;
  netIncome: NetIncomeData | null;
}

// --- Shared Components ---
function StatusBadge({ status }: { status?: string }) {
  const isOpen = status === "abierta";
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase",
        isOpen
          ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20 ring-inset"
          : "bg-red-500/10 text-red-500 ring-1 ring-red-500/20 ring-inset",
      )}
    >
      <div className={cn("size-1 rounded-full", isOpen ? "animate-pulse bg-green-500" : "bg-red-500")} />
      {isOpen ? "Abierta" : "Cerrada"}
    </div>
  );
}

function LoadingCard({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex size-full items-center justify-center py-10">
        <span className="text-muted-foreground animate-pulse text-sm">Cargando...</span>
      </CardContent>
    </Card>
  );
}

// --- Specific Cards ---

const cajaPrincipalChartConfig = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
  gastos: { label: "Gastos", color: "hsl(0, 84%, 60%)" },
};

function CajaPrincipalCard({ data }: { data: CajaPrincipalData | null }) {
  if (!data) return <LoadingCard title="Caja Principal" description="ultimos dias" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Caja Principal</CardTitle>
          <CardDescription>ultimos dias</CardDescription>
        </div>
        <StatusBadge status={data.estado} />
      </CardHeader>
      <CardContent className="size-full">
        <ChartContainer className="size-full min-h-24" config={cajaPrincipalChartConfig}>
          <BarChart accessibilityLayer data={data.ultimosDias} barSize={8}>
            <XAxis dataKey="fecha" tickLine={false} tickMargin={10} axisLine={false} hide />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => `Fecha: ${label}`} />} />
            <Bar
              background={{ fill: "var(--color-background)", radius: 4, opacity: 0.07 }}
              dataKey="ingresos"
              stackId="a"
              fill="var(--color-ingresos)"
            />
            <Bar dataKey="gastos" stackId="a" fill="var(--color-gastos)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xl font-semibold tabular-nums">{formatCurrency(data.balanceActual)}</span>
        <span className="text-sm font-medium text-red-500">{formatCurrency(data.gastosDelMes)}</span>
      </CardFooter>
    </Card>
  );
}

const papeleriaChartConfig = {
  ventas: { label: "Ventas", color: "var(--chart-1)" },
  gastos: { label: "Gastos", color: "hsl(0, 84%, 60%)" },
};

function PapeleriaCard({ data }: { data: PapeleriaData | null }) {
  if (!data) return <LoadingCard title="Papeleria" description="Mes Actual" />;

  return (
    <Card className="overflow-hidden pb-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Papeleria</CardTitle>
          <CardDescription>Mes Actual</CardDescription>
        </div>
        <StatusBadge status={data.estado} />
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ChartContainer className="size-full min-h-24" config={papeleriaChartConfig}>
          <AreaChart data={data.ultimosDias} margin={{ left: 0, right: 0, top: 5 }}>
            <XAxis dataKey="fecha" tickLine={false} tickMargin={10} axisLine={false} hide />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(label) => `Fecha: ${label}`} hideIndicator />}
            />
            <Area
              dataKey="ventas"
              fill="var(--color-ventas)"
              fillOpacity={0.05}
              stroke="var(--color-ventas)"
              strokeWidth={2}
              type="monotone"
            />
            <Line dataKey="gastos" type="monotone" stroke="var(--color-gastos)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xl font-semibold tabular-nums">{formatCurrency(data.balanceActual)}</span>
        <span className="text-sm font-medium text-red-500">{formatCurrency(data.gastosDelMes)}</span>
      </CardFooter>
    </Card>
  );
}

const bankAccountsChartConfig = {
  balance: { label: "Estado", color: "var(--primary)" },
};

function BankAccountsCard({ data, className }: { data: BankAccountsData | null; className?: string }) {
  if (!data) return <LoadingCard title="Cuentas Bancarias" description="Ultimos 3 Meses" />;

  return (
    <Card className={cn("flex flex-col overflow-hidden pb-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Cuentas Bancarias</CardTitle>
          <CardDescription>Estados por Meses</CardDescription>
        </div>
        <div className="bg-primary/10 w-fit rounded-lg p-2">
          <Landmark className="text-primary size-5" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight tabular-nums">{formatCurrency(data.saldoTotal)}</p>
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Total</span>
        </div>
        <ChartContainer config={bankAccountsChartConfig} className="mt-auto h-32 w-full">
          <AreaChart data={data.ultimosMeses} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 10 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `Mes: ${label}`}
                  formatter={(value) => [formatCurrency(Number(value)), "Balance"]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--color-balance)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBalance)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <p className="text-muted-foreground text-[10px] italic">* Saldo proyectado en base a movimientos históricos</p>
      </CardFooter>
    </Card>
  );
}

function PendingInvoicesCard({ data }: { data: InvoicesStatsData | null }) {
  if (!data) return <LoadingCard title="Facturas Pendientes" />;

  return (
    <Card className="overflow-hidden pb-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="w-fit rounded-lg bg-blue-500/10 p-2">
            <FileText className="size-5 text-blue-500" />
          </div>
          <div className="w-fit rounded-md bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-600">
            Parciales: {formatCurrency(data.totalParcial)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ChartContainer
          className="size-full min-h-24"
          config={{ ingresos: { label: "Ingresos", color: "var(--chart-1)" } }}
        >
          <AreaChart data={data.stats} margin={{ left: 0, right: 0, top: 5 }}>
            <XAxis dataKey="fecha" tickLine={false} tickMargin={10} axisLine={false} hide />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(label) => `Fecha: ${label}`} hideIndicator />}
            />
            <Area
              dataKey="ingresos"
              fill="var(--color-ingresos)"
              fillOpacity={0.05}
              stroke="var(--color-ingresos)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1 pb-4">
        <CardDescription>Facturas Pendientes</CardDescription>
        <p className="text-2xl font-medium tabular-nums">{formatCurrency(data.totalPendiente)}</p>
      </CardFooter>
    </Card>
  );
}

function NetMonthlyIncomeCard({ data }: { data: NetIncomeData | null }) {
  if (!data) return <LoadingCard title="Ingresos Neto Mensual" />;

  return (
    <Card>
      <CardHeader>
        <div className="w-fit rounded-lg bg-green-500/10 p-2">
          <TrendingUp className="size-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent className="flex size-full flex-col justify-between">
        <div className="space-y-1.5">
          <CardTitle>Ingresos Neto Mensual</CardTitle>
          <CardDescription>Suscripciones Activas</CardDescription>
        </div>
        <p className="text-2xl font-medium tabular-nums">{formatCurrency(data.totalNetoMensual)}</p>
        <div className="text-primary bg-primary/10 w-fit rounded-md px-2 py-1 text-[10px] font-medium">
          Facturación Recurrente
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Container ---

export function OverviewCards() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/crm/overview?t=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard overview:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15000); // 15 seconds for aggregated fetch
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <CajaPrincipalCard data={data?.cajaPrincipal ?? null} />
      <PapeleriaCard data={data?.papeleria ?? null} />
      <PendingInvoicesCard data={data?.invoices ?? null} />
      <BankAccountsCard data={data?.banks ?? null} className="col-span-1 xl:col-span-2" />
      <NetMonthlyIncomeCard data={data?.netIncome ?? null} />
    </div>
  );
}
