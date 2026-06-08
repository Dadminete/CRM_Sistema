"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarCheck2, CheckCircle2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTHS = [
  { value: 1, short: "Ene" },
  { value: 2, short: "Feb" },
  { value: 3, short: "Mar" },
  { value: 4, short: "Abr" },
  { value: 5, short: "May" },
  { value: 6, short: "Jun" },
  { value: 7, short: "Jul" },
  { value: 8, short: "Ago" },
  { value: 9, short: "Sep" },
  { value: 10, short: "Oct" },
  { value: 11, short: "Nov" },
  { value: 12, short: "Dic" },
];

const MONTH_FILTER_OPTIONS = [{ value: "all", short: "Todos" }, ...MONTHS.map((month) => ({ value: String(month.value), short: month.short }))];

type MonthStatus = {
  pagado: boolean;
  pagos: number;
  monto: string;
  estado: string;
};

type ClientCalendar = {
  clienteId: string;
  nombreCompleto: string;
  meses: Record<string, MonthStatus>;
};

export default function PagosMesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [month, setMonth] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<string>("30");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<ClientCalendar[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("year", year);
        params.set("page", String(page));
        params.set("limit", limit);
        if (month !== "all") params.set("month", month);
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(`/api/contabilidad/pagos-mes?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
          setClients([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        setClients(Array.isArray(result.data?.clients) ? result.data.clients : []);
        setTotal(Number(result.data?.pagination?.total ?? 0));
        setTotalPages(Number(result.data?.pagination?.totalPages ?? 1));
      } catch {
        setClients([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();

    return () => controller.abort();
  }, [year, month, search, page, limit]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => String(currentYear - 3 + index));
  }, [currentYear]);

  useEffect(() => {
    setPage(1);
  }, [year, month, search, limit]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CalendarCheck2 className="h-6 w-6" />
            Pagos Mensuales por Cliente
          </CardTitle>
          <CardDescription>
            Vista calendario: cada columna es un mes y se marca cuando el cliente tiene pagos confirmados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar cliente por nombre o código..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger>
                <SelectValue placeholder="Clientes por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
                <SelectItem value="200">200 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Cliente</TableHead>
                  {MONTHS.map((month) => (
                    <TableHead key={month.value} className="text-center">
                      {month.short}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-muted-foreground py-10 text-center">
                      Cargando pagos...
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-muted-foreground py-10 text-center">
                      No hay clientes o pagos para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.clienteId}>
                      <TableCell className="font-medium">{client.nombreCompleto}</TableCell>
                      {MONTHS.map((month) => {
                        const status = client.meses[String(month.value)] ?? {
                          pagado: false,
                          pagos: 0,
                          monto: "0",
                          estado: "ninguno",
                        };
                        const isPartial = status.estado === "parcial";

                        return (
                          <TableCell key={`${client.clienteId}-${month.value}`} className="text-center">
                            {status.pagado ? (
                              <Badge
                                variant="secondary"
                                className={[
                                  "inline-flex items-center gap-1 border-0 text-white",
                                  isPartial ? "bg-orange-500 hover:bg-orange-500" : "bg-blue-600 hover:bg-blue-600",
                                ].join(" ")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {status.pagos}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && clients.length > 0 ? (
            <div className="text-muted-foreground text-xs">
              Nota: se muestran clientes activos y cada mes se marca según pagos confirmados asociados a facturas con estado pago, pagado, pagada o parcial.
            </div>
          ) : null}

          {!isLoading ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground text-sm">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong> · Total clientes: <strong>{total}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}