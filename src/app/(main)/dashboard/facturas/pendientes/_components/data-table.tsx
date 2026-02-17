"use client";

import * as React from "react";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTable as DataTableBase } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { columns } from "./columns";
import { Invoice } from "./schema";

interface DataTableProps {
  data: Invoice[];
  onDateChange: (start: string, end: string) => void;
  onBillingDayChange: (day: string) => void;
  startDate: string;
  endDate: string;
  billingDay: string;
}

export function DataTable({ data, onDateChange, onBillingDayChange, startDate, endDate, billingDay }: DataTableProps) {
  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-end justify-between gap-4 md:flex-row">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5 md:flex-none">
            <Label htmlFor="search" className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Buscar Factura o Cliente
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                id="search"
                placeholder="Nº Factura, Nombre..."
                className="h-10 pl-9 shadow-sm"
                value={(table.getState().globalFilter as string) ?? ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Desde
            </Label>
            <Input
              id="startDate"
              type="date"
              className="h-10 shadow-sm"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billingDay" className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Día Fact.
            </Label>
            <select
              id="billingDay"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={billingDay}
              onChange={(e) => onBillingDayChange(e.target.value)}
            >
              <option value="">Todos</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day.toString()}>
                  Día {day}
                </option>
              ))}
            </select>
          </div>

          {(startDate || endDate || billingDay) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-10 w-10"
              onClick={() => {
                onDateChange("", "");
                onBillingDayChange("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <DataTableBase table={table} columns={columns} />
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
