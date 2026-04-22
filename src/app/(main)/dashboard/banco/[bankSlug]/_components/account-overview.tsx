"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { siVisa } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, cn } from "@/lib/utils";
import { getBankData } from "../actions";

function ChipSVG() {
  return (
    <svg enableBackground="new 0 0 132 92" viewBox="0 0 132 92" xmlns="http://www.w3.org/2000/svg" className="w-14">
      <title>Chip</title>
      <rect x="0.5" y="0.5" width="131" height="91" rx="15" className="fill-accent stroke-accent" />
      <rect x="9.5" y="9.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="9.5" y="61.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="9.5" y="35.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="9.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="61.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
      <rect x="74.5" y="35.5" width="48" height="21" rx="10.5" className="fill-accent stroke-accent-foreground" />
    </svg>
  );
}

export function AccountOverview({ bankSlug }: { bankSlug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getBankData(bankSlug);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error || "Error al cargar datos");
      }
      setLoading(false);
    }
    loadData();
  }, [bankSlug]);

  const bankName = data?.bank?.nombre || "Banco";
  const balance = data?.totalBalance || 0;
  const recentTransactions = data?.recentTransactions || [];
  const allTransactions = data?.allTransactions || [];
  const latestTransactions = recentTransactions.slice(0, 4);

  const [movementFilters, setMovementFilters] = useState({
    search: "",
    method: "all",
    type: "all",
    minAmount: "",
    maxAmount: "",
    fromDate: "",
    toDate: "",
    sortBy: "date-desc",
  });

  const availableMethods = useMemo(() => {
    const methods = new Set<string>();
    allTransactions.forEach((tx: any) => {
      const method = String(tx.method || "").trim().toLowerCase();
      if (method) methods.add(method);
    });
    return Array.from(methods);
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    const minAmount = movementFilters.minAmount === "" ? null : Number(movementFilters.minAmount);
    const maxAmount = movementFilters.maxAmount === "" ? null : Number(movementFilters.maxAmount);
    const fromDate = movementFilters.fromDate ? new Date(`${movementFilters.fromDate}T00:00:00`).getTime() : null;
    const toDate = movementFilters.toDate ? new Date(`${movementFilters.toDate}T23:59:59`).getTime() : null;
    const searchQuery = movementFilters.search.trim().toLowerCase();

    const filtered = allTransactions.filter((tx: any) => {
      const txMethod = String(tx.method || "").trim().toLowerCase();
      const txType = tx.type === "debit" ? "gasto" : "ingreso";
      const amount = Number(tx.amount || 0);
      const amountText = String(tx.amountText || amount.toFixed(2));

      const txDateRaw = tx.rawDate || tx.fullDate || tx.date || tx.subtitle;
      const txDateValue = txDateRaw ? new Date(txDateRaw).getTime() : Number.NaN;
      const hasValidDate = Number.isFinite(txDateValue);

      if (movementFilters.method !== "all" && txMethod !== movementFilters.method) return false;
      if (movementFilters.type !== "all" && txType !== movementFilters.type) return false;
      if (minAmount !== null && Number.isFinite(minAmount) && amount < minAmount) return false;
      if (maxAmount !== null && Number.isFinite(maxAmount) && amount > maxAmount) return false;

      if (fromDate !== null && (!hasValidDate || txDateValue < fromDate)) return false;
      if (toDate !== null && (!hasValidDate || txDateValue > toDate)) return false;

      if (searchQuery) {
        const searchable = [
          String(tx.title || "").toLowerCase(),
          String(tx.subtitle || "").toLowerCase(),
          String(tx.fullDate || "").toLowerCase(),
          String(tx.rawDate || "").toLowerCase(),
          amountText,
          amountText.replace(".00", ""),
          txMethod,
          txType,
        ].join(" ");
        if (!searchable.includes(searchQuery)) return false;
      }

      return true;
    });

    filtered.sort((a: any, b: any) => {
      const aDate = new Date(a.rawDate || a.fullDate || a.date || a.subtitle || 0).getTime();
      const bDate = new Date(b.rawDate || b.fullDate || b.date || b.subtitle || 0).getTime();
      const aAmount = Number(a.amount || 0);
      const bAmount = Number(b.amount || 0);

      if (movementFilters.sortBy === "date-asc") return aDate - bDate;
      if (movementFilters.sortBy === "amount-desc") return bAmount - aAmount;
      if (movementFilters.sortBy === "amount-asc") return aAmount - bAmount;
      return bDate - aDate;
    });

    return filtered;
  }, [allTransactions, movementFilters]);

  const filteredIncomeTotal = useMemo(
    () =>
      filteredTransactions
        .filter((tx: any) => tx.type !== "debit")
        .reduce((acc: number, tx: any) => acc + Number(tx.amount || 0), 0),
    [filteredTransactions],
  );

  const filteredExpenseTotal = useMemo(
    () =>
      filteredTransactions
        .filter((tx: any) => tx.type === "debit")
        .reduce((acc: number, tx: any) => acc + Number(tx.amount || 0), 0),
    [filteredTransactions],
  );

  const resetFilters = () => {
    setMovementFilters({
      search: "",
      method: "all",
      type: "all",
      minAmount: "",
      maxAmount: "",
      fromDate: "",
      toDate: "",
      sortBy: "date-desc",
    });
  };

  if (loading) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center shadow-xs">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-6 text-center shadow-xs">
        <p className="text-destructive font-medium">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="items-center">
        <CardTitle>{bankName}</CardTitle>
        <CardDescription>Resumen de cuentas, balance y transacciones recientes.</CardDescription>
        <CardAction>
          <Button size="icon" variant="outline">
            <Plus className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs className="gap-4" defaultValue="main">
          <TabsList className="w-full">
            <TabsTrigger value="main">Principal</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>
          <TabsContent value="main">
            <div className="space-y-4">
              <div className="bg-primary relative aspect-8/5 w-full max-w-96 overflow-hidden rounded-xl perspective-distant">
                <div className="absolute top-6 left-6">
                  <SimpleIcon icon={siVisa} className="fill-primary-foreground size-8" />
                </div>
                <div className="absolute top-1/2 w-full -translate-y-1/2">
                  <div className="flex items-end justify-between px-6">
                    <span className="text-accent font-mono text-lg leading-none font-medium tracking-wide uppercase">
                      {bankName}
                    </span>
                    <ChipSVG />
                  </div>
                </div>
                <div className="text-primary-foreground absolute bottom-6 left-6 font-mono text-sm">balance total</div>
                <div className="text-primary-foreground absolute right-6 bottom-6 text-xl font-bold tabular-nums">
                  {formatCurrency(balance)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="font-medium">{bankName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium text-green-500">Activo</span>
                </div>
              </div>

              {(data?.bank?.cuentasBancarias || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs uppercase">Cuentas</p>
                  <div className="divide-y rounded-lg border">
                    {(data.bank.cuentasBancarias as any[]).map((cuenta: any) => (
                      <div key={cuenta.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{cuenta.tipoCuenta || "Cuenta"}</p>
                          <p className="text-muted-foreground text-xs">{cuenta.numeroCuenta || "-"}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(cuenta.balance ?? 0, { noDecimals: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h6 className="text-muted-foreground text-sm uppercase">Movimientos Recientes</h6>
                <div className="space-y-4">
                  {latestTransactions.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">No hay movimientos recientes.</p>
                  ) : (
                    latestTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center gap-2">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${transaction.type === "debit" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                        >
                          <span className="text-xs font-bold">{transaction.type === "debit" ? "-" : "+"}</span>
                        </div>
                        <div className="flex w-full items-end justify-between">
                          <div>
                            <p className="text-sm font-medium">{transaction.title}</p>
                            <p className="text-muted-foreground line-clamp-1 text-xs">{transaction.subtitle}</p>
                          </div>
                          <div>
                            <span
                              className={cn(
                                "text-sm leading-none font-medium tabular-nums",
                                transaction.type === "debit" ? "text-destructive" : "text-green-500",
                              )}
                            >
                              {formatCurrency(transaction.amount, { noDecimals: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="sm" variant="outline">
                      Todos los movimientos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>Todos los movimientos</DialogTitle>
                      <DialogDescription>
                        Historial completo de movimientos de las cuentas de {bankName}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="bg-muted/40 rounded-lg border p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal className="text-muted-foreground size-4" />
                            <p className="text-sm font-medium">Filtros de movimientos</p>
                          </div>
                          <Button size="sm" type="button" variant="ghost" onClick={resetFilters}>
                            <RotateCcw className="mr-2 size-4" />
                            Limpiar filtros
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <div className="relative lg:col-span-2">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <input
                              type="text"
                              value={movementFilters.search}
                              onChange={(e) => setMovementFilters((prev) => ({ ...prev, search: e.target.value }))}
                              placeholder="Buscar por descripción, método o fecha"
                              className="bg-background h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>

                          <select
                            value={movementFilters.method}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, method: e.target.value }))}
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="all">Todos los métodos</option>
                            {availableMethods.map((method) => (
                              <option key={method} value={method}>
                                {method.toUpperCase()}
                              </option>
                            ))}
                          </select>

                          <select
                            value={movementFilters.type}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, type: e.target.value }))}
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="all">Todos los tipos</option>
                            <option value="ingreso">Ingresos</option>
                            <option value="gasto">Gastos</option>
                          </select>

                          <input
                            type="number"
                            min="0"
                            value={movementFilters.minAmount}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                            placeholder="Monto mínimo"
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />

                          <input
                            type="number"
                            min="0"
                            value={movementFilters.maxAmount}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                            placeholder="Monto máximo"
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />

                          <input
                            type="date"
                            value={movementFilters.fromDate}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />

                          <input
                            type="date"
                            value={movementFilters.toDate}
                            onChange={(e) => setMovementFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                            className="bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="bg-background rounded-full border px-2.5 py-1">
                            Mostrando {filteredTransactions.length} de {allTransactions.length}
                          </span>
                          <span className="bg-background rounded-full border px-2.5 py-1 text-green-700">
                            Ingresos: {formatCurrency(filteredIncomeTotal, { noDecimals: true })}
                          </span>
                          <span className="bg-background rounded-full border px-2.5 py-1 text-red-700">
                            Gastos: {formatCurrency(filteredExpenseTotal, { noDecimals: true })}
                          </span>
                        </div>
                      </div>

                      <div className="max-h-[48vh] overflow-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span>Monto</span>
                                  <select
                                    value={movementFilters.sortBy}
                                    onChange={(e) => setMovementFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                                    className="bg-background h-7 rounded border px-2 text-xs"
                                  >
                                    <option value="date-desc">Recientes</option>
                                    <option value="date-asc">Antiguos</option>
                                    <option value="amount-desc">Mayor monto</option>
                                    <option value="amount-asc">Menor monto</option>
                                  </select>
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTransactions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                                  No hay movimientos que coincidan con los filtros.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredTransactions.map((transaction: any) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>{transaction.fullDate || transaction.subtitle}</TableCell>
                                  <TableCell className="max-w-[320px] truncate">{transaction.title}</TableCell>
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "font-medium",
                                        transaction.type === "debit" ? "text-destructive" : "text-green-600",
                                      )}
                                    >
                                      {transaction.type === "debit" ? "Gasto" : "Ingreso"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="uppercase">{transaction.method || "-"}</TableCell>
                                  <TableCell className="text-right font-medium tabular-nums">
                                    {formatCurrency(transaction.amount, { noDecimals: true })}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="details">
            <div className="space-y-4 py-4">
              {data?.bank?.cuentasBancarias?.map((acc: any) => (
                <div key={acc.id} className="rounded border p-3 text-sm">
                  <div className="font-medium">Cuenta {acc.tipoCuenta}</div>
                  <div className="text-muted-foreground">{acc.numeroCuenta}</div>
                  <div className="mt-2 flex justify-between">
                    <span>Moneda: {acc.moneda}</span>
                    <span className="font-bold">
                      {formatCurrency(Number(acc.balance || 0))}
                    </span>
                  </div>
                </div>
              ))}
              {(!data?.bank?.cuentasBancarias || data?.bank?.cuentasBancarias.length === 0) && (
                <p className="text-muted-foreground text-center">No hay cuentas registradas.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
