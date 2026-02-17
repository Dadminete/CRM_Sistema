"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Receipt,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });

const getMetodoPagoLabel = (metodo: string) => {
  const labels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    cheque: "Cheque",
  };
  return labels[metodo] || metodo;
};

export default function FacturasPagasPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFactura, setSelectedFactura] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/facturas/pagas");
      const data = await res.json();

      if (data.success) {
        setFacturas(data.data);
      } else {
        toast.error("Error al cargar facturas pagadas");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredFacturas = facturas.filter(
    (f) =>
      f.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteApellidos.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPagado = filteredFacturas.reduce((sum, f) => sum + Number(f.total || 0), 0);

  const selectedIndex = selectedFactura ? filteredFacturas.findIndex((f) => f.id === selectedFactura.id) : -1;
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex < filteredFacturas.length - 1;

  const goToPrevious = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedFactura(filteredFacturas[selectedIndex - 1]);
    }
  }, [selectedIndex, filteredFacturas]);

  const goToNext = useCallback(() => {
    if (selectedIndex < filteredFacturas.length - 1) {
      setSelectedFactura(filteredFacturas[selectedIndex + 1]);
    }
  }, [selectedIndex, filteredFacturas]);

  // Obtener todas las facturas del mismo cliente (ordenadas por fecha descendente)
  const clienteFacturas = selectedFactura
    ? facturas
        .filter((f) => f.clienteId === selectedFactura.clienteId && f.id !== selectedFactura.id)
        .sort((a, b) => new Date(b.fechaFactura).getTime() - new Date(a.fechaFactura).getTime())
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFactura) return;
      
      if (e.key === "ArrowLeft" && canGoPrev) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight" && canGoNext) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFactura, canGoPrev, canGoNext, goToPrevious, goToNext]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground animate-pulse p-12 text-center">
        Cargando facturas pagadas...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in bg-background mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6 duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold tracking-tight">
              <CheckCircle2 className="text-primary h-8 w-8" />
              Facturas Pagadas
            </h1>
            <p className="text-muted-foreground mt-1">Registro histórico de facturas cobradas y canceladas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">Total Cobrado</div>
            <div className="text-primary text-2xl font-black">{formatCurrency(totalPagado)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Invoice List */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border shadow-sm">
            <CardHeader className="border-b p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Receipt className="text-primary h-4 w-4" /> Historial de Facturas
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {facturas.length} FACTURAS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-6">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por cliente o nº factura..."
                  className="h-10 bg-slate-50/50 pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="custom-scrollbar max-h-[600px] space-y-3 overflow-y-auto pr-2">
                {filteredFacturas.length === 0 ? (
                  <div className="space-y-3 py-16 text-center opacity-40">
                    <Receipt className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="text-muted-foreground text-sm font-medium">
                      {searchTerm ? "No se encontraron resultados" : "No hay facturas pagadas"}
                    </p>
                  </div>
                ) : (
                  filteredFacturas.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFactura(f)}
                      className={cn(
                        "group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all",
                        selectedFactura?.id === f.id
                          ? "border-primary bg-primary/5 ring-primary ring-1"
                          : "border-slate-100 bg-white hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-primary text-[10px] font-black tracking-tighter uppercase">
                            {f.numeroFactura}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold leading-tight text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {f.clienteNombre} {f.clienteApellidos}
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="h-5 bg-emerald-500 px-2 py-0 text-[9px] font-black uppercase hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                          PAGADA
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span className="text-[10px] font-medium">
                            Facturada: {formatDate(f.fechaFactura)}
                          </span>
                        </div>
                        {f.fechaPago && (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-[10px] font-bold">Pagada: {formatDate(f.fechaPago)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          {f.metodoPago && (
                            <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                              <CreditCard className="h-3 w-3 text-slate-500" />
                              <span className="text-[9px] font-bold text-slate-600 uppercase">
                                {getMetodoPagoLabel(f.metodoPago)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-lg font-black text-slate-900">{formatCurrency(f.total)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Historial del Cliente */}
          {selectedFactura && clienteFacturas.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-slate-50 px-6 py-4 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <History className="text-primary h-4 w-4" /> 
                      Historial del Cliente
                    </CardTitle>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Todas las facturas de {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {clienteFacturas.length + 1} FACTURAS
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="custom-scrollbar max-h-[400px] space-y-3 overflow-y-auto pr-2">
                  {clienteFacturas.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFactura(f)}
                      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-primary text-[10px] font-black tracking-tighter uppercase">
                            {f.numeroFactura}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            Facturada: {formatDate(f.fechaFactura)}
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="h-5 bg-emerald-500 px-2 py-0 text-[9px] font-black uppercase hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                          PAGADA
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-[9px] font-medium text-slate-500 uppercase dark:text-slate-400">Subtotal</div>
                          <div className="text-sm font-bold text-slate-700 dark:text-white">
                            {formatCurrency(f.subtotal || 0)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] font-medium text-slate-500 uppercase dark:text-slate-400">ITBIS</div>
                          <div className="text-sm font-bold text-slate-700 dark:text-white">
                            {formatCurrency(f.itbis || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t pt-3">
                        <div className="flex items-center gap-2">
                          {f.metodoPago && (
                            <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-700">
                              <CreditCard className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-600 uppercase dark:text-slate-300">
                                {getMetodoPagoLabel(f.metodoPago)}
                              </span>
                            </div>
                          )}
                          {f.updatedAt && (
                            <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {formatDate(f.updatedAt)}
                            </div>
                          )}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(f.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-6 lg:col-span-4">
          {selectedFactura ? (
            <>
              <Card className="overflow-hidden border shadow-md">
                <CardHeader className="bg-slate-900 px-5 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                      <FileText className="h-3.5 w-3.5" /> Detalles de Factura
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-slate-800 hover:text-white"
                        onClick={goToPrevious}
                        disabled={!canGoPrev}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-[10px] font-medium text-slate-300">
                        {selectedIndex + 1} / {filteredFacturas.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-slate-800 hover:text-white"
                        onClick={goToNext}
                        disabled={!canGoNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground text-xs font-medium">Nº Factura:</span>
                      <span className="text-primary text-right text-xs font-black">
                        {selectedFactura.numeroFactura}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground text-xs font-medium">Cliente:</span>
                      <span className="max-w-[180px] text-right text-xs font-bold text-slate-800 dark:text-white">
                        {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                      </span>
                    </div>
                    {selectedFactura.clienteEmail && (
                      <div className="flex items-start justify-between">
                        <span className="text-muted-foreground text-xs font-medium">Email:</span>
                        <span className="max-w-[180px] truncate text-right text-xs text-slate-600 dark:text-white">
                          {selectedFactura.clienteEmail}
                        </span>
                      </div>
                    )}
                    {selectedFactura.clienteTelefono && (
                      <div className="flex items-start justify-between">
                        <span className="text-muted-foreground text-xs font-medium">Teléfono:</span>
                        <span className="text-right text-xs text-slate-600 dark:text-white">{selectedFactura.clienteTelefono}</span>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium text-slate-700 dark:text-white">
                        {formatCurrency(selectedFactura.subtotal || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Descuento:</span>
                      <span className="font-medium text-slate-700 dark:text-white">
                        -{formatCurrency(selectedFactura.descuento || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">ITBIS:</span>
                      <span className="font-medium text-slate-700 dark:text-white">
                        {formatCurrency(selectedFactura.itbis || 0)}
                      </span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs font-black tracking-tighter text-slate-800 uppercase">Total:</span>
                      <span className="text-primary text-xl font-black">{formatCurrency(selectedFactura.total)}</span>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fecha Factura:</span>
                      <span className="font-medium text-slate-700 dark:text-white">{formatDate(selectedFactura.fechaFactura)}</span>
                    </div>
                    {selectedFactura.updatedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Fecha Pago:</span>
                        <span className="font-bold text-emerald-600">{formatDate(selectedFactura.updatedAt)}</span>
                      </div>
                    )}
                    {selectedFactura.metodoPago && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Método de Pago:</span>
                        <span className="font-bold text-slate-700 dark:text-white">
                          {getMetodoPagoLabel(selectedFactura.metodoPago)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button variant="outline" size="sm" className="h-10 gap-2 text-xs font-bold">
                      <Eye className="h-3.5 w-3.5" />
                      Ver PDF
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 gap-2 text-xs font-bold">
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Estado
                </div>
                <p className="text-[10px] font-medium leading-relaxed text-emerald-700">
                  Esta factura ha sido pagada completamente y el registro está disponible para consulta y auditoría.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-slate-700 uppercase dark:text-slate-300">
                  <ChevronLeft className="h-3 w-3" />
                  <ChevronRight className="h-3 w-3" />
                  Navegación
                </div>
                <p className="text-[9px] font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  Use las flechas del teclado ← → o los botones en el header para navegar entre facturas.
                </p>
              </div>
            </>
          ) : (
            <Card className="border shadow-md">
              <CardContent className="space-y-3 py-16 text-center opacity-40">
                <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase">Seleccione una Factura</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
