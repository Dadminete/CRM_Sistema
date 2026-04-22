"use client";

import * as React from "react";

import { useSearchParams } from "next/navigation";

import { FileText, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DataTable } from "./_components/data-table";
import { Invoice } from "./_components/schema";

export default function PendingInvoicesPage() {
  const searchParams = useSearchParams();
  const clienteIdParam = searchParams.get("clienteId") || "";

  const [data, setData] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [billingDay, setBillingDay] = React.useState("");
  const [clienteId, setClienteId] = React.useState(clienteIdParam);

  const fetchData = React.useCallback(async (start?: string, end?: string, day?: string, cid?: string) => {
    setLoading(true);
    try {
      let url = "/api/facturas/pendientes";
      const params = new URLSearchParams();
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);
      if (day) params.append("billingDay", day);
      if (cid) params.append("clienteId", cid);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast.error("Error al cargar las facturas pendientes");
      }
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData(startDate, endDate, billingDay, clienteId);
  }, [fetchData, startDate, endDate, billingDay, clienteId]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleBillingDayChange = (day: string) => {
    setBillingDay(day);
  };

  const totalPendiente = data.reduce((acc, curr) => acc + Number(curr.montoPendiente), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(v);

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
            Facturas Pendientes
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Visualiza y gestiona las facturas que aún no han sido pagadas totalmente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11 gap-2 px-4 font-semibold"
            onClick={() => fetchData(startDate, endDate, billingDay, clienteId)}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-rose-500 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-black tracking-tighter uppercase">
              Deuda Total Pendiente
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{formatCurrency(totalPendiente)}</div>
            <p className="text-muted-foreground mt-1 text-[10px] font-bold uppercase italic">
              Suma de todos los balances pendientes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-black tracking-tighter uppercase">
              Facturas por Cobrar
            </CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{data.length}</div>
            <p className="text-muted-foreground mt-1 text-[10px] font-bold uppercase italic">
              Documentos con pago pendiente o parcial
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card ring-border/50 rounded-2xl border p-6 shadow-sm ring-1">
        <DataTable
          data={data}
          onDateChange={handleDateChange}
          onBillingDayChange={handleBillingDayChange}
          startDate={startDate}
          endDate={endDate}
          billingDay={billingDay}
          onInvoiceChanged={() => fetchData(startDate, endDate, billingDay)}
        />
      </div>
    </div>
  );
}
