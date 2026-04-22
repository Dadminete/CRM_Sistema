"use client";

import { useState, useEffect } from "react";

import { Download } from "lucide-react";
import z from "zod";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { recentMovementsColumns } from "./columns.crm";
import { recentMovementSchema } from "./schema";

export function TableCards() {
  const [data, setData] = useState<z.infer<typeof recentMovementSchema>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData(isInitial = false) {
      try {
        if (isInitial) {
          setLoading(true);
        }

        const response = await fetch("/api/recent-movements?t=" + Date.now(), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching recent movements:", error);
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    }

    // Fetch inicial
    fetchData(true);

    // Configurar polling cada 10 segundos para actualizaciones automáticas
    const interval = setInterval(() => fetchData(false), 10000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, []);

  const table = useDataTableInstance({
    data,
    columns: recentMovementsColumns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Seguimiento de los movimientos contables registrados este mes.</CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por fecha, descripción, monto..."
                value={(table.getState().globalFilter as string) ?? ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="h-9 w-64 lg:w-80"
              />
              <DataTableViewOptions table={table} />
              <Button variant="outline" size="sm">
                <Download />
                <span className="hidden lg:inline">Exportar</span>
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex size-full flex-col gap-4">
          <div className="overflow-hidden rounded-md border">
            <DataTable table={table} columns={recentMovementsColumns} loading={loading} />
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
