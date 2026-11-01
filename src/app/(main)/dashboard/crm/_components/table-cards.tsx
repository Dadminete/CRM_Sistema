"use client";

import { useState, useEffect } from "react";

import type { FilterFn } from "@tanstack/react-table";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
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

type RecentMovement = z.infer<typeof recentMovementSchema>;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const recentMovementsGlobalFilter: FilterFn<RecentMovement> = (row, _columnId, filterValue) => {
  const query = normalizeSearchValue(String(filterValue ?? ""));
  if (!query) return true;

  const movement = row.original;
  const date = new Date(movement.fecha);
  const dateValues = isValid(date)
    ? [
        movement.fecha,
        format(date, "dd/MM/yyyy", { locale: es }),
        format(date, "d MMMM yyyy", { locale: es }),
        format(date, "d 'de' MMMM 'de' yyyy", { locale: es }),
      ]
    : [movement.fecha];
  const values = [
    ...dateValues,
    movement.descripcion ?? "",
    String(movement.monto),
    movement.tipo,
    movement.metodo,
    movement.banco ?? "",
    movement.categoria ?? "",
  ];

  return values.some((value) => normalizeSearchValue(value).includes(query));
};

export function TableCards() {
  const [data, setData] = useState<RecentMovement[]>([]);
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
    globalFilterFn: recentMovementsGlobalFilter,
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Busca y consulta movimientos contables de cualquier fecha.</CardDescription>
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
