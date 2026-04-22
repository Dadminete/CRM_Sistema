"use client";

import { useState, useEffect, useCallback } from "react";

import {
  Search,
  AlertCircle,
  ArrowLeft,
  Calendar,
  User,
  Printer,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wallet,
  Landmark,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const detectServiceType = (detail: any) => {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (items.length === 0) return "Servicio no especificado";
  const conceptos = items.map((item: any) => String(item?.concepto || "").toLowerCase());
  const hasInternetService = conceptos.some(
    (concepto: string) =>
      concepto.includes("internet") ||
      concepto.includes("fibra") ||
      concepto.includes("wifi") ||
      concepto.includes("contrato"),
  );
  if (hasInternetService) return "Servicio de internet";
  const firstConcept = String(items[0]?.concepto || "Servicio").trim();
  return firstConcept.split("-")[0]?.trim() || firstConcept;
};

const getMetodoPagoLabel = (metodo: string) => {
  const labels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    cheque: "Cheque",
  };
  return labels[metodo] || metodo;
};

export default function PagosParcialesPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFactura, setSelectedFactura] = useState<any>(null);

  // Admin role state
  const [isAdmin, setIsAdmin] = useState(false);

  // Payment dialog state
  const [pagoOpen, setPagoOpen] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagoForm, setPagoForm] = useState({
    monto: "",
    descuento: "0",
    metodoPago: "efectivo",
    cajaId: "",
    referencia: "",
    observaciones: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/facturas/pagos-parciales");
      const data = await res.json();

      if (data.success) {
        setFacturas(data.data);
      } else {
        toast.error("Error al cargar facturas con pago parcial");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCajas = useCallback(async () => {
    try {
      const res = await fetch("/api/contabilidad/lookup?tipoCategoria=ingreso");
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.cajas)) {
        setCajas(data.data.cajas);
        const primera = data.data.cajas[0];
        if (primera) {
          setPagoForm((prev) => ({ ...prev, cajaId: primera.id }));
        }
      }
    } catch {
      // Silently ignore
    }
  }, []);

  const fetchRole = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me-role");
      const data = await res.json();
      if (data.success) {
        setIsAdmin(data.data.isAdmin === true);
      }
    } catch {
      // Silently ignore — defaults to non-admin
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCajas();
    fetchRole();
  }, [fetchData, fetchCajas, fetchRole]);

  const filteredFacturas = facturas.filter(
    (f) =>
      f.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteApellidos.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    if (filteredFacturas.length === 0) {
      if (selectedFactura) setSelectedFactura(null);
      return;
    }

    const selectedStillVisible = selectedFactura ? filteredFacturas.some((f) => f.id === selectedFactura.id) : false;

    if (!selectedStillVisible) {
      setSelectedFactura(filteredFacturas[0]);
    }
  }, [filteredFacturas, selectedFactura]);

  const totalPendiente = filteredFacturas.reduce((sum, f) => sum + Number(f.montoPendiente || 0), 0);
  const totalFacturado = filteredFacturas.reduce((sum, f) => sum + Number(f.total || 0), 0);

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

  const openPagoDialog = useCallback((factura: any) => {
    setSelectedFactura(factura);
    const pendiente = Number(factura?.montoPendiente || 0);
    setPagoForm((prev) => ({
      ...prev,
      monto: pendiente > 0 ? String(pendiente) : "",
      descuento: "0",
      referencia: "",
      observaciones: "",
    }));
    setPagoOpen(true);
  }, []);

  const handlePagoSubmit = useCallback(async () => {
    if (!selectedFactura) return;

    const monto = Number(pagoForm.monto);
    const descuento = Number(pagoForm.descuento || 0);
    const pendiente = Number(selectedFactura.montoPendiente || 0);

    if (monto <= 0 && descuento <= 0) {
      toast.error("El monto o descuento debe ser mayor a 0");
      return;
    }
    if (!isAdmin && monto + descuento > pendiente) {
      toast.error(`El total aplicado (RD$ ${monto + descuento}) supera el pendiente (${formatCurrency(pendiente)})`);
      return;
    }
    if (pagoForm.metodoPago === "efectivo" && !pagoForm.cajaId) {
      toast.error("Debe seleccionar una caja para pagos en efectivo");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/facturas/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaId: selectedFactura.id,
          clienteId: selectedFactura.clienteId,
          monto,
          descuento,
          metodoPago: pagoForm.metodoPago,
          cajaId: pagoForm.metodoPago === "efectivo" ? pagoForm.cajaId : undefined,
          numeroReferencia: pagoForm.referencia || undefined,
          observaciones: pagoForm.observaciones || undefined,
          adminOverride: isAdmin,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Pago registrado exitosamente");
        setPagoOpen(false);
        await fetchData();
      } else {
        toast.error(result.error || "Error al registrar el pago");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFactura, pagoForm, fetchData]);

  const handlePrintSelectedFactura = useCallback(async () => {
    if (!selectedFactura) {
      toast.error("Seleccione una factura para imprimir");
      return;
    }

    let detail: any = null;
    try {
      const detailRes = await fetch(`/api/facturas/detalle?id=${selectedFactura.id}`);
      const detailData = await detailRes.json();
      if (!detailData?.success) {
        toast.error(detailData?.error || "No se pudo cargar el detalle de la factura");
        return;
      }
      detail = detailData.data;
    } catch (error) {
      console.error("Error fetching factura detail for print:", error);
      toast.error("Error de conexión al preparar la impresión");
      return;
    }

    let printedBy = "Usuario del sistema";
    try {
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      if (profileData?.success && profileData?.data?.profile) {
        const profile = profileData.data.profile;
        const fullName = `${profile.nombre || ""} ${profile.apellido || ""}`.trim();
        printedBy = fullName || profile.username || printedBy;
      }
    } catch (error) {
      console.error("Error fetching print user profile:", error);
    }

    const popup = window.open("", `thermal-print-${selectedFactura.id}`, "width=420,height=900");
    if (!popup) {
      toast.error("Permite ventanas emergentes para imprimir la factura");
      return;
    }

    const clienteNombre = `${detail?.clienteNombre || ""} ${detail?.clienteApellidos || ""}`.trim();
    const lineItems = Array.isArray(detail?.items) ? detail.items : [];
    const tipoServicio = detectServiceType(detail);
    const planCliente = String(detail?.planNombre || "").trim() || "No especificado";

    const itemsHtml = lineItems
      .map((item: any) => {
        const concepto = escapeHtml(String(item?.concepto || "Concepto"));
        const cantidad = Number(item?.cantidad || 0);
        const totalItem = formatCurrency(Number(item?.total || 0));
        return `
          <div class="item">
            <div class="item-concepto">${concepto}</div>
            <div class="item-meta">
              <span>x${cantidad}</span>
              <span>${totalItem}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const numeroFactura = escapeHtml(String(detail?.numeroFactura || selectedFactura.numeroFactura || "N/A"));
    const fechaPagoTicket = selectedFactura.fechaPago || selectedFactura.updatedAt || detail?.fechaFactura;
    const fechaMostrar = fechaPagoTicket ? formatDate(fechaPagoTicket) : formatDate(selectedFactura.fechaFactura);
    const subtotal = formatCurrency(Number(detail?.subtotal || selectedFactura.subtotal || 0));
    const itbis = formatCurrency(Number(detail?.itbis || selectedFactura.itbis || 0));
    const descuento = formatCurrency(Number(detail?.descuento || selectedFactura.descuento || 0));
    const total = formatCurrency(Number(detail?.total || selectedFactura.total || 0));
    const pendienteMonto = Number(selectedFactura?.montoPendiente || 0);
    const pendiente = formatCurrency(pendienteMonto);
    const pagado = formatCurrency(Number(selectedFactura?.totalPagado || selectedFactura.total - pendienteMonto || 0));

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Factura ${numeroFactura}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 2mm;
            }
            body {
              width: 76mm;
              margin: 0;
              font-family: "Courier New", monospace;
              font-size: 11px;
              color: #000;
            }
            .ticket {
              width: 100%;
            }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; }
            .item { margin-bottom: 4px; }
            .item-concepto { word-break: break-word; }
            .item-meta { display: flex; justify-content: space-between; }
            .totals .row { margin: 2px 0; }
            .footer { margin-top: 10px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="center bold">Tecnologica Del Este</div>
            <div class="center bold">FACTURA CLIENTE (PAGO PARCIAL)</div>
            <div class="center">${numeroFactura}</div>
            <div class="line"></div>

            <div><span class="bold">Cliente:</span> ${escapeHtml(clienteNombre || "N/A")}</div>
            <div><span class="bold">Servicio:</span> ${escapeHtml(tipoServicio)}</div>
            <div><span class="bold">Plan:</span> ${escapeHtml(planCliente)}</div>
            <div><span class="bold">Fecha:</span> ${escapeHtml(fechaMostrar)}</div>
            <div><span class="bold">Estado:</span> PAGO PARCIAL</div>

            <div class="line"></div>
            <div class="bold">Conceptos</div>
            ${itemsHtml || '<div class="item">Sin conceptos detallados</div>'}

            <div class="line"></div>
            <div class="totals">
              <div class="row"><span>Subtotal</span><span>${subtotal}</span></div>
              <div class="row"><span>ITBIS</span><span>${itbis}</span></div>
              <div class="row"><span>Descuento</span><span>- ${descuento}</span></div>
              <div class="row bold"><span>TOTAL</span><span>${total}</span></div>
              <div class="row"><span>Pagado</span><span>${pagado}</span></div>
              <div class="row" style="color: #d32f2f;"><span>PENDIENTE</span><span>${pendiente}</span></div>
            </div>

            <div class="line"></div>
            <div>Impreso por: ${escapeHtml(printedBy)}</div>
            <div class="footer center">Gracias por su preferencia</div>
          </div>

          <script>
            window.addEventListener('load', () => {
              setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
  }, [selectedFactura]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground animate-pulse p-12 text-center">Cargando facturas con pago parcial...</div>
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
              <AlertCircle className="h-8 w-8 text-amber-500" />
              Facturas con Pago Parcial
            </h1>
            <p className="text-muted-foreground mt-1">Facturas pendientes de cobro con pagos parciales recibidos.</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">Total Facturado</div>
            <div className="text-primary text-2xl font-black">{formatCurrency(totalFacturado)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black tracking-wider text-rose-500 uppercase">Total Pendiente</div>
            <div className="text-2xl font-black text-rose-500">{formatCurrency(totalPendiente)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Invoice List */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border shadow-sm">
            <CardHeader className="border-b p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Listado de Facturas
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
                    <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="text-muted-foreground text-sm font-medium">
                      {searchTerm ? "No se encontraron resultados" : "No hay facturas con pago parcial"}
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
                          ? "border-amber-500 bg-slate-900 ring-1 ring-amber-500"
                          : "border-slate-700 bg-slate-900 hover:border-slate-500",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black tracking-tighter text-amber-500 uppercase">
                            {f.numeroFactura}
                          </div>
                          <div className="flex items-center gap-2 text-sm leading-tight font-bold text-white">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {f.clienteNombre} {f.clienteApellidos}
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="h-5 bg-amber-500 px-2 py-0 text-[9px] font-black uppercase hover:bg-amber-600"
                        >
                          <AlertCircle className="mr-1 h-2.5 w-2.5" />
                          PARCIAL
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="h-3 w-3" />
                          <span className="text-[10px] font-medium">{formatDate(f.fechaFactura)}</span>
                        </div>
                        {f.metodoPago && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="text-[10px] font-medium">{getMetodoPagoLabel(f.metodoPago)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-700 pt-2">
                        <div className="rounded-md bg-rose-900/40 px-2 py-1">
                          <div className="text-[9px] font-bold text-rose-300 uppercase">Debe</div>
                          <div className="text-sm font-black text-rose-400">
                            {formatCurrency(f.montoPendiente || 0)}
                          </div>
                        </div>
                        <div className="text-lg font-black text-slate-300">{formatCurrency(f.total || 0)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Detail Panel */}
        {selectedFactura && (
          <div className="space-y-4 lg:col-span-4">
            <Card className="border shadow-sm">
              <CardHeader className="border-b p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Detalles de Factura</CardTitle>
                  <Badge className="bg-orange-500 text-xs font-bold text-white hover:bg-orange-600">
                    {selectedFactura.estado.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <div className="text-muted-foreground text-xs font-bold uppercase">Cliente</div>
                  <div className="text-sm font-bold">
                    {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs font-bold uppercase">N° Factura</div>
                  <div className="text-sm font-bold text-amber-500">{selectedFactura.numeroFactura}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground text-xs font-bold uppercase">Fecha Factura</div>
                    <div className="text-sm font-medium">{formatDate(selectedFactura.fechaFactura)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs font-bold uppercase">Vencimiento</div>
                    <div className="text-sm font-medium">{formatDate(selectedFactura.fechaVencimiento)}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(selectedFactura.subtotal)}</span>
                    </div>
                    {Number(selectedFactura.descuento) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Descuento</span>
                        <span className="font-medium text-emerald-600">
                          - {formatCurrency(selectedFactura.descuento)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ITBIS</span>
                      <span className="font-medium">{formatCurrency(selectedFactura.itbis)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">TOTAL</span>
                      <span className="text-primary text-lg font-black">{formatCurrency(selectedFactura.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-rose-800 bg-rose-900/20 p-4">
                  <div className="text-muted-foreground mb-2 text-xs font-bold uppercase">Desglose de Pago</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Pagado</span>
                      <span className="font-bold text-emerald-500">
                        {formatCurrency(
                          Number(
                            selectedFactura.totalPagado ||
                              selectedFactura.total - (selectedFactura.montoPendiente || 0),
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-rose-700 pt-2">
                      <span className="font-bold">PENDIENTE</span>
                      <span className="text-lg font-black text-rose-500">
                        {formatCurrency(selectedFactura.montoPendiente || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => openPagoDialog(selectedFactura)}
                  >
                    <DollarSign className="mr-1 h-4 w-4" />
                    Abonar / Pagar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePrintSelectedFactura}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>

                {/* Navigation */}
                <div className="flex gap-2 border-t pt-2">
                  <Button size="sm" variant="outline" onClick={goToPrevious} disabled={!canGoPrev} className="flex-1">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={goToNext} disabled={!canGoNext} className="flex-1">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={pagoOpen} onOpenChange={setPagoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Registrar Abono / Pago
            </DialogTitle>
            <DialogDescription>
              {selectedFactura?.numeroFactura} — {selectedFactura?.clienteNombre} {selectedFactura?.clienteApellidos}
              <span className="mt-1 block font-bold text-rose-500">
                Pendiente: {formatCurrency(selectedFactura?.montoPendiente || 0)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monto a Pagar</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoForm.monto}
                  onChange={(e) => setPagoForm((p) => ({ ...p, monto: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={pagoForm.descuento}
                  onChange={(e) => setPagoForm((p) => ({ ...p, descuento: e.target.value }))}
                />
              </div>
            </div>

            {(Number(pagoForm.monto) > 0 || Number(pagoForm.descuento) > 0) && (
              <div className="bg-muted/50 space-y-1 rounded-lg p-3 text-sm">
                {Number(pagoForm.monto) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(Number(pagoForm.monto))}</span>
                  </div>
                )}
                {Number(pagoForm.descuento) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-bold text-sky-600">- {formatCurrency(Number(pagoForm.descuento))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span className="font-bold">Nuevo Pendiente</span>
                  <span
                    className={cn(
                      "font-black",
                      Number(selectedFactura?.montoPendiente || 0) -
                        Number(pagoForm.monto) -
                        Number(pagoForm.descuento) <=
                        0
                        ? "text-emerald-600"
                        : "text-rose-500",
                    )}
                  >
                    {formatCurrency(
                      Math.max(
                        0,
                        Number(selectedFactura?.montoPendiente || 0) -
                          Number(pagoForm.monto) -
                          Number(pagoForm.descuento),
                      ),
                    )}
                  </span>
                </div>
                {isAdmin &&
                  Number(pagoForm.monto) + Number(pagoForm.descuento) >
                    Number(selectedFactura?.montoPendiente || 0) && (
                    <div className="mt-2 rounded-md border border-amber-700 bg-amber-900/30 px-2 py-1 text-[11px] font-semibold text-amber-400">
                      ⚠ Descuento excede el saldo — modo administrador
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <Select value={pagoForm.metodoPago} onValueChange={(v) => setPagoForm((p) => ({ ...p, metodoPago: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">
                    <span className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5" /> Efectivo
                    </span>
                  </SelectItem>
                  <SelectItem value="transferencia">
                    <span className="flex items-center gap-2">
                      <Landmark className="h-3.5 w-3.5" /> Transferencia
                    </span>
                  </SelectItem>
                  <SelectItem value="tarjeta">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" /> Tarjeta
                    </span>
                  </SelectItem>
                  <SelectItem value="cheque">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" /> Cheque
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pagoForm.metodoPago === "efectivo" && (
              <div className="space-y-1.5">
                <Label>Caja</Label>
                <Select value={pagoForm.cajaId} onValueChange={(v) => setPagoForm((p) => ({ ...p, cajaId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caja..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cajas.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pagoForm.metodoPago !== "efectivo" && (
              <div className="space-y-1.5">
                <Label>N° Referencia</Label>
                <Input
                  placeholder="Nº de referencia o transferencia..."
                  value={pagoForm.referencia}
                  onChange={(e) => setPagoForm((p) => ({ ...p, referencia: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>
                Observaciones <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                placeholder="Notas adicionales..."
                value={pagoForm.observaciones}
                onChange={(e) => setPagoForm((p) => ({ ...p, observaciones: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPagoOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handlePagoSubmit}
                disabled={isSubmitting || (Number(pagoForm.monto) <= 0 && Number(pagoForm.descuento) <= 0)}
              >
                {isSubmitting ? (
                  "Procesando..."
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar Pago
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
