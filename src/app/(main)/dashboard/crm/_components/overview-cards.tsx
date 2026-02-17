"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Wallet, BadgeDollarSign, FileText, TrendingUp } from "lucide-react";
import { Area, AreaChart, Line, LineChart, Bar, BarChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import {
  leadsChartData,
  leadsChartConfig,
  proposalsChartData,
  proposalsChartConfig,
  revenueChartData,
  revenueChartConfig,
} from "./crm.config";

interface CajaPrincipalData {
  balanceActual: number;
  gastosDelMes: number;
  estado: string;
  ultimosDias: {
    fecha: string;
    ingresos: number;
    gastos: number;
  }[];
}

interface PapeleriaData {
  ventasDelMes: number;
  gastosDelMes: number;
  estado: string;
  ultimosDias: {
    fecha: string;
    ventas: number;
    gastos: number;
  }[];
}

function StatusBadge({ status }: { status?: string }) {
  const isOpen = status === "abierta";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase ${
        isOpen
          ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20 ring-inset"
          : "bg-red-500/10 text-red-500 ring-1 ring-red-500/20 ring-inset"
      }`}
    >
      <div className={`size-1 rounded-full ${isOpen ? "animate-pulse bg-green-500" : "bg-red-500"}`} />
      {isOpen ? "Abierta" : "Cerrada"}
    </div>
  );
}

const cajaPrincipalChartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
  gastos: {
    label: "Gastos",
    color: "hsl(0, 84%, 60%)", // Red color for expenses
  },
  background: {
    color: "var(--primary)",
  },
};

function CajaPrincipalCard() {
  const [data, setData] = useState<CajaPrincipalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/caja-principal");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching Caja Principal data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caja Principal</CardTitle>
          <CardDescription>ultimos dias</CardDescription>
        </CardHeader>
        <CardContent className="flex size-full items-center justify-center">
          <span className="text-muted-foreground text-sm">Cargando...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caja Principal</CardTitle>
          <CardDescription>ultimos dias</CardDescription>
        </CardHeader>
        <CardContent className="flex size-full items-center justify-center">
          <span className="text-muted-foreground text-sm">No hay datos disponibles</span>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Caja Principal</CardTitle>
          <CardDescription>ultimos dias</CardDescription>
        </div>
        {!loading && data && <StatusBadge status={data.estado} />}
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
              radius={[0, 0, 0, 0]}
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
  ventas: {
    label: "Ventas",
    color: "var(--chart-1)",
  },
};

function PapeleriaCard() {
  const [data, setData] = useState<PapeleriaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/papeleria-stats");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching Papeleria data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Papeleria</CardTitle>
          <CardDescription>Mes Actual</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-24 flex-1 items-center justify-center p-0">
          <span className="text-muted-foreground text-sm">Cargando...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Papeleria</CardTitle>
          <CardDescription>Mes Actual</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-24 flex-1 items-center justify-center p-0">
          <span className="text-muted-foreground text-sm">No hay datos disponibles</span>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="overflow-hidden pb-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Papeleria</CardTitle>
          <CardDescription>Mes Actual</CardDescription>
        </div>
        {!loading && data && <StatusBadge status={data.estado} />}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ChartContainer className="size-full min-h-24" config={papeleriaChartConfig}>
          <AreaChart
            data={data.ultimosDias}
            margin={{
              left: 0,
              right: 0,
              top: 5,
            }}
          >
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
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Ventas</span>
          <span className="text-lg font-semibold tabular-nums">{formatCurrency(data.ventasDelMes)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground text-xs">Gastos</span>
          <span className="text-lg font-semibold text-red-500 tabular-nums">{formatCurrency(data.gastosDelMes)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

interface BankAccountsData {
  saldoTotal: number;
  ultimosMeses: {
    mes: string;
    ingresos: number;
    gastos: number;
  }[];
}

const bankAccountsChartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
  gastos: {
    label: "Gastos",
    color: "hsl(0, 84%, 60%)",
  },
};

function BankAccountsCard({ className }: { className?: string }) {
  const [data, setData] = useState<BankAccountsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/bank-stats?t=" + Date.now());
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching Bank Accounts data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className={cn("overflow-hidden pb-0", className)}>
        <CardHeader>
          <CardTitle>Cuentas Bancarias</CardTitle>
          <CardDescription>Ultimos 3 Meses</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-24 flex-1 items-center justify-center p-0">
          <span className="text-muted-foreground text-sm">Cargando...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn("overflow-hidden pb-0", className)}>
        <CardHeader>
          <CardTitle>Cuentas Bancarias</CardTitle>
          <CardDescription>Ultimos 3 Meses</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-24 flex-1 items-center justify-center p-0">
          <span className="text-muted-foreground text-sm">No hay datos disponibles</span>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className={cn("overflow-hidden pb-0", className)}>
      <CardHeader>
        <CardTitle>Cuentas Bancarias</CardTitle>
        <CardDescription>Ultimos 3 Meses</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-medium tabular-nums">{formatCurrency(data.saldoTotal)}</p>
        <ChartContainer config={bankAccountsChartConfig} className="mx-auto mt-4 h-24 w-[92%]">
          <LineChart
            data={data.ultimosMeses}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <XAxis dataKey="mes" tickLine={false} tickMargin={10} axisLine={false} hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              strokeWidth={2}
              dataKey="ingresos"
              stroke="var(--color-ingresos)"
              activeDot={{
                r: 4,
              }}
            />
            <Line
              type="monotone"
              strokeWidth={2}
              dataKey="gastos"
              stroke="var(--color-gastos)"
              activeDot={{
                r: 4,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">Resumen de ingresos y gastos bancarios</p>
      </CardFooter>
    </Card>
  );
}

interface InvoicesStatsData {
  totalPendiente: number;
  totalParcial: number;
  stats: {
    fecha: string;
    ingresos: number;
  }[];
}

const pendingInvoicesChartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
};

function PendingInvoicesCard() {
  const [data, setData] = useState<InvoicesStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/invoices-stats");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching Invoice stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-blue-500/10 p-2">
            <FileText className="size-5 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>Facturas Pendientes</CardTitle>
            <CardDescription>Cargando...</CardDescription>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden pb-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="w-fit rounded-lg bg-blue-500/10 p-2">
            <FileText className="size-5 text-blue-500" />
          </div>
          <div className="w-fit rounded-md bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-600">
            Pendiente Pago Parcial: {formatCurrency(data?.totalParcial || 0)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ChartContainer className="size-full min-h-24" config={pendingInvoicesChartConfig}>
          <AreaChart
            data={data?.stats || []}
            margin={{
              left: 0,
              right: 0,
              top: 5,
            }}
          >
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
        <p className="text-2xl font-medium tabular-nums">{formatCurrency(data?.totalPendiente || 0)}</p>
      </CardFooter>
    </Card>
  );
}

interface NetIncomeData {
  totalNetoMensual: number;
}

function NetMonthlyIncomeCard() {
  const [data, setData] = useState<NetIncomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/net-income");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching Net Income data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
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
            <CardDescription>Cargando...</CardDescription>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <p className="text-2xl font-medium tabular-nums">{formatCurrency(data?.totalNetoMensual || 0)}</p>
        <div className="text-primary bg-primary/10 w-fit rounded-md px-2 py-1 text-[10px] font-medium">
          Facturación Recurrente
        </div>
      </CardContent>
    </Card>
  );
}

const lastMonth = format(subMonths(new Date(), 1), "LLLL");

export function OverviewCards() {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <CajaPrincipalCard />

      <PapeleriaCard />

      <PendingInvoicesCard />
      <BankAccountsCard className="col-span-1 xl:col-span-2" />
      <NetMonthlyIncomeCard />
    </div>
  );
}
