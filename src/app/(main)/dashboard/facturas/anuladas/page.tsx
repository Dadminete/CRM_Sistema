"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeft, Calendar, FileText, Receipt, Search, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EstadoFiltro = "todas" | "anuladas" | "canceladas";

type FacturaAnulada = {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  fechaVencimiento: string | null;
  total: string | number;
  estado: string;
  subtotal: string | number;
  descuento: string | number;
  itbis: string | number;
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  fechaPago: string | null;
  metodoPago: string | null;
  totalPagado: string | null;
};

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(value || 0));

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function getEstadoBadge(estado: string) {
  const normalized = estado.trim().toLowerCase();
  const esAnulada = normalized.includes("anulad");

  if (esAnulada) {
    return <Badge className="border-red-200 bg-red-100 text-red-700 hover:bg-red-100">ANULADA</Badge>;
  }

  return <Badge className="border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-100">CANCELADA</Badge>;
}

export default function FacturasAnuladasPage() {
  const [facturas, setFacturas] = useState<FacturaAnulada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todas");
  const [selectedFacturaId, setSelectedFacturaId] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const handleReactivar = async (facturaId: string) => {
    if (!confirm("¿Está seguro de reactivar esta factura?")) return;
    setIsReactivating(true);
    try {
      const response = await fetch(`/api/facturas/${facturaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "reactivar" }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || "Error al reactivar la factura");
      } else {
        toast.success("Factura reactivada con éxito");
        fetchData();
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setIsReactivating(false);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/facturas/anuladas?estado=${estadoFiltro}`);
      const payload = await response.json();

      if (!payload.success) {
        toast.error("Error al cargar facturas anuladas/canceladas");
        setFacturas([]);
        setSelectedFacturaId(null);
        return;
      }

      const data: FacturaAnulada[] = Array.isArray(payload.data) ? payload.data : [];
      setFacturas(data);

      if (data.length === 0) {
        setSelectedFacturaId(null);
        return;
      }

      const selectedStillExists = data.some((factura) => factura.id === selectedFacturaId);
      if (!selectedStillExists) {
        setSelectedFacturaId(data[0].id);
      }
    } catch (_error) {
      toast.error("Error de conexión");
      setFacturas([]);
      setSelectedFacturaId(null);
    } finally {
      setIsLoading(false);
    }
  }, [estadoFiltro, selectedFacturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredFacturas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return facturas;

    return facturas.filter((factura) => {
      const numero = (factura.numeroFactura || "").toLowerCase();
      const nombre = (factura.clienteNombre || "").toLowerCase();
      const apellidos = (factura.clienteApellidos || "").toLowerCase();
      const nombreCompleto = `${nombre} ${apellidos}`.trim();

      return (
        numero.includes(term) || nombre.includes(term) || apellidos.includes(term) || nombreCompleto.includes(term)
      );
    });
  }, [facturas, searchTerm]);

  const selectedFactura =
    filteredFacturas.find((factura) => factura.id === selectedFacturaId) ??
    (filteredFacturas.length > 0 ? filteredFacturas[0] : null);

  useEffect(() => {
    if (selectedFactura && selectedFactura.id !== selectedFacturaId) {
      setSelectedFacturaId(selectedFactura.id);
    }
  }, [selectedFactura, selectedFacturaId]);

  if (isLoading) {
    return <div className="text-muted-foreground animate-pulse p-8 text-center">Cargando facturas...</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Facturas Anuladas / Canceladas</h1>
            <p className="text-muted-foreground mt-1">Consulta y revisión de facturas no vigentes.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="border shadow-sm">
            <CardHeader className="border-b p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Receipt className="h-4 w-4" /> Facturas
                </CardTitle>

                <Badge variant="secondary" className="text-[10px] font-bold">
                  {filteredFacturas.length} REGISTROS
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="relative md:col-span-2">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Buscar por factura o cliente..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <Select value={estadoFiltro} onValueChange={(value) => setEstadoFiltro(value as EstadoFiltro)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="anuladas">Anuladas</SelectItem>
                    <SelectItem value="canceladas">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {filteredFacturas.length === 0 ? (
                  <div className="text-muted-foreground py-16 text-center text-sm">
                    No se encontraron facturas con los filtros actuales.
                  </div>
                ) : (
                  filteredFacturas.map((factura) => (
                    <div
                      key={factura.id}
                      onClick={() => setSelectedFacturaId(factura.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all",
                        selectedFactura?.id === factura.id
                          ? "border-primary bg-primary/5 ring-primary ring-1"
                          : "border-slate-100 hover:border-slate-300",
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-primary text-[11px] font-black tracking-wide uppercase">
                            {factura.numeroFactura}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {factura.clienteNombre} {factura.clienteApellidos}
                          </div>
                        </div>

                        {getEstadoBadge(factura.estado)}
                      </div>

                      <div className="flex items-center justify-between border-t pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(factura.fechaFactura)}
                        </div>
                        <div className="text-lg font-black text-slate-900">{formatCurrency(factura.total)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          {selectedFactura ? (
            <Card className="overflow-hidden border shadow-md">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-900 px-5 py-4 text-white">
                <CardTitle className="flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                  <FileText className="h-3.5 w-3.5" /> Detalle de Factura
                </CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReactivar(selectedFactura.id)}
                  disabled={isReactivating}
                  className="h-7 text-xs font-bold"
                >
                  Reactivar
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">N Factura</span>
                    <span className="text-primary font-black">{selectedFactura.numeroFactura}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="max-w-[190px] text-right font-semibold">
                      {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Estado</span>
                    <span>{getEstadoBadge(selectedFactura.estado)}</span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedFactura.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Descuento</span>
                    <span>-{formatCurrency(selectedFactura.descuento)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ITBIS</span>
                    <span>{formatCurrency(selectedFactura.itbis)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm font-black">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(selectedFactura.total)}</span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Fecha factura</span>
                    <span>{formatDate(selectedFactura.fechaFactura)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Fecha vencimiento</span>
                    <span>{formatDate(selectedFactura.fechaVencimiento)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ultimo pago</span>
                    <span>{formatDate(selectedFactura.fechaPago)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Metodo de pago</span>
                    <span>{selectedFactura.metodoPago || "-"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total pagado</span>
                    <span>{formatCurrency(selectedFactura.totalPagado)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-md">
              <CardContent className="text-muted-foreground py-16 text-center text-sm">
                Selecciona una factura para ver su detalle
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
