"use client";

import { useState, useEffect, useCallback } from "react";

import { jsPDF } from "jspdf";
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
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });

const getCurrentMonthLabel = () =>
  new Intl.DateTimeFormat("es-DO", { month: "long", year: "numeric" }).format(new Date());

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
    (concepto: any) =>
      concepto.includes("internet") ||
      concepto.includes("fibra") ||
      concepto.includes("wifi") ||
      concepto.includes("contrato"),
  );

  if (hasInternetService) {
    return "Servicio de internet";
  }

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

const isPartialPayment = (factura: any) => {
  if (factura?.esPagoAdelantado) return false;
  const estado = String(factura?.estado || "").toLowerCase();
  if (estado === "adelantado") return false; // Adelantado is not partial
  const pendiente = Number(factura?.montoPendiente || 0);
  return estado === "parcial" || estado === "pago parcial" || pendiente > 0;
};

const isAdvancePayment = (factura: any) => {
  if (factura?.esPagoAdelantado) return true;
  const estado = String(factura?.estado || "").toLowerCase();
  return estado === "adelantado";
};

const getEstadoPagoLabel = (factura: any) => {
  if (isAdvancePayment(factura)) return "PAGO ADELANTADO";
  return isPartialPayment(factura) ? "PAGO PARCIAL" : "PAGADA";
};

const buildFacturaPdf = (detail: any, factura: any, generatedBy: string) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (spaceNeeded = 20) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLine = (text: string, size = 10, isBold = false, spacing = 16) => {
    ensureSpace(spacing);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += spacing;
  };

  const numeroFactura = String(detail?.numeroFactura || factura?.numeroFactura || "N/A");
  const clienteNombre =
    `${detail?.clienteNombre || factura?.clienteNombre || ""} ${detail?.clienteApellidos || factura?.clienteApellidos || ""}`.trim() ||
    "N/A";
  const fechaPagoTicket = factura?.fechaPago || factura?.updatedAt || detail?.fechaFactura;
  const fechaMostrar = fechaPagoTicket
    ? new Date(fechaPagoTicket).toLocaleDateString("es-DO", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "N/A";
  const metodoPago = getMetodoPagoLabel(String(factura?.metodoPago || ""));
  const estado = getEstadoPagoLabel(factura);
  const subtotal = formatCurrency(Number(detail?.subtotal || factura?.subtotal || 0));
  const descuento = formatCurrency(Number(detail?.descuento || factura?.descuento || 0));
  const itbis = formatCurrency(Number(detail?.itbis || factura?.itbis || 0));
  const total = formatCurrency(Number(detail?.total || factura?.total || 0));
  const pendiente = formatCurrency(Number(factura?.montoPendiente || 0));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FACTURA CLIENTE", pageWidth / 2, y, { align: "center" });
  y += 24;

  doc.setFontSize(11);
  doc.text(`No. ${numeroFactura}`, pageWidth / 2, y, { align: "center" });
  y += 22;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  writeLine(`Cliente: ${clienteNombre}`, 10, true);
  writeLine(`Fecha de pago: ${fechaMostrar}`);
  writeLine(`Metodo de pago: ${metodoPago}`);
  writeLine(`Estado: ${estado}`);
  if (factura?.cobradoPor) {
    writeLine(`Cobrado por: ${String(factura.cobradoPor).toUpperCase()}`, 10, true);
  }

  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  writeLine("DETALLE", 11, true, 18);
  writeLine(`Subtotal: ${subtotal}`);
  writeLine(`Descuento: -${descuento}`);
  writeLine(`ITBIS: ${itbis}`);
  writeLine(`Total: ${total}`, 10, true);
  writeLine(`Pendiente: ${pendiente}`);

  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (items.length > 0) {
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    writeLine("CONCEPTOS", 11, true, 18);
    items.forEach((item: any, index: number) => {
      const concepto = String(item?.concepto || `Concepto ${index + 1}`);
      const cantidad = Number(item?.cantidad || 0);
      const itemTotal = formatCurrency(Number(item?.total || 0));
      const lines = doc.splitTextToSize(`${index + 1}. ${concepto}`, pageWidth - margin * 2 - 120);

      ensureSpace(16 + lines.length * 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(lines, margin, y);
      doc.text(`x${cantidad}  ${itemTotal}`, pageWidth - margin, y, { align: "right" });
      y += Math.max(16, lines.length * 12 + 4);
    });
  }

  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  writeLine(`Generado por: ${generatedBy}`, 9);
  writeLine(`Fecha de emision PDF: ${new Date().toLocaleString("es-DO")}`, 9);

  return doc;
};

export default function FacturasPagasPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [totalCobradoMesActual, setTotalCobradoMesActual] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReverting, setIsReverting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const currentMonthLabel = getCurrentMonthLabel();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/facturas/pagas");
      const data = await res.json();

      if (data.success) {
        setFacturas(data.data);
        setTotalCobradoMesActual(Number(data.totalCobradoMesActual || 0));
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
    const fechaImpresion = new Date().toLocaleString("es-DO");
    const fechaPagoTicket = selectedFactura.fechaPago || selectedFactura.updatedAt || detail?.fechaFactura;
    const fechaMostrar = fechaPagoTicket ? formatDate(fechaPagoTicket) : formatDate(selectedFactura.fechaFactura);
    const subtotal = formatCurrency(Number(detail?.subtotal || selectedFactura.subtotal || 0));
    const itbis = formatCurrency(Number(detail?.itbis || selectedFactura.itbis || 0));
    const descuento = formatCurrency(Number(detail?.descuento || selectedFactura.descuento || 0));
    const total = formatCurrency(Number(detail?.total || selectedFactura.total || 0));
    const pendienteMonto = Number(selectedFactura?.montoPendiente || 0);
    const pendiente = formatCurrency(pendienteMonto);
    const estadoMostrar = getEstadoPagoLabel(selectedFactura);
    const cobradoPor =
      selectedFactura?.cobradoPor ||
      (detail?.payments && detail.payments.length > 0 ? detail.payments[0].recibidoPorNombre : "");

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Factura ${numeroFactura}</title>          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              width: 52mm;
              margin: 0 auto;
              padding: 2mm 1mm;
              font-family: "Courier New", monospace;
              font-size: 10px;
              line-height: 1.2;
              color: #000;
              background-color: #fff;
            }
            .ticket {
              width: 100%;
            }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .line { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; gap: 4px; }
            .item { margin-bottom: 2px; }
            .item-concepto { 
              word-break: break-word; 
              display: block;
              margin-bottom: 1px;
            }
            .item-meta { 
              display: flex; 
              justify-content: space-between;
              padding-left: 2mm;
            }
            .totals { margin-top: 4px; }
            .totals .row { margin: 1px 0; }
            .footer { margin-top: 8px; font-size: 9px; }
            @media print {
              body { margin: 0 auto; width: 52mm; }
              .ticket { width: 52mm; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="center bold" style="font-size: 12px;">Tecnologica Del Este</div>
            <div class="center bold">FACTURA DE PAGO</div>
            <div class="center" style="font-size: 9px;">${numeroFactura}</div>
            <div class="center" style="font-size: 9px; margin-top: 6px; margin-bottom: 6px;">${escapeHtml(fechaImpresion)}</div>
            <div class="line"></div>
<div style="font-size: 9px;">
              <div><span class="bold">Cliente:</span> ${escapeHtml(clienteNombre || "N/A")}</div>
              <div><span class="bold">Servicio:</span> ${escapeHtml(tipoServicio)}</div>
              <div><span class="bold">Plan:</span> ${escapeHtml(planCliente)}</div>
              <div><span class="bold">Fecha:</span> ${escapeHtml(fechaMostrar)}</div>
              <div><span class="bold">Estado:</span> ${escapeHtml(estadoMostrar)}</div>
              ${cobradoPor ? `<div><span class="bold">Cobrado por:</span> ${escapeHtml(String(cobradoPor).toUpperCase())}</div>` : ""}
            </div>
            <div class="line"></div>
            <div class="bold center">CONCEPTOS</div>
            ${itemsHtml || '<div class="item">Sin conceptos detallados</div>'}
            <div class="line"></div>
            <div class="totals">
              <div class="row"><span>Subtotal</span><span>${subtotal}</span></div>
              <div class="row"><span>ITBIS</span><span>${itbis}</span></div>
              <div class="row"><span>Descuento</span><span>- ${descuento}</span></div>
              <div class="row bold" style="font-size: 11px;"><span>TOTAL</span><span>${total}</span></div>
              <div class="row"><span>Pendiente</span><span>${pendiente}</span></div>
            </div>
            <div class="line"></div>
            <div style="font-size: 9px;">Impreso por: ${escapeHtml(printedBy)}</div>
            <div class="footer center bold">*** ¡Gracias por su pago! ***</div>
          </div>
>

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

  const fetchFacturaPdfData = useCallback(async () => {
    if (!selectedFactura) {
      toast.error("Seleccione una factura");
      return null;
    }

    let detail: any = null;
    try {
      const detailRes = await fetch(`/api/facturas/detalle?id=${selectedFactura.id}`);
      const detailData = await detailRes.json();
      if (!detailData?.success) {
        toast.error(detailData?.error || "No se pudo cargar el detalle de la factura");
        return null;
      }
      detail = detailData.data;
    } catch (error) {
      console.error("Error fetching factura detail for pdf:", error);
      toast.error("Error de conexión al preparar el PDF");
      return null;
    }

    let generatedBy = "Usuario del sistema";
    try {
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      if (profileData?.success && profileData?.data?.profile) {
        const profile = profileData.data.profile;
        const fullName = `${profile.nombre || ""} ${profile.apellido || ""}`.trim();
        generatedBy = fullName || profile.username || generatedBy;
      }
    } catch (error) {
      console.error("Error fetching user profile for pdf:", error);
    }

    return { detail, generatedBy };
  }, [selectedFactura]);

  const handleViewPdf = useCallback(async () => {
    const data = await fetchFacturaPdfData();
    if (!data || !selectedFactura) return;

    const doc = buildFacturaPdf(data.detail, selectedFactura, data.generatedBy);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [fetchFacturaPdfData, selectedFactura]);

  const handleDownloadPdf = useCallback(async () => {
    const data = await fetchFacturaPdfData();
    if (!data || !selectedFactura) return;

    const doc = buildFacturaPdf(data.detail, selectedFactura, data.generatedBy);
    doc.save(`Factura-${selectedFactura.numeroFactura || selectedFactura.id}.pdf`);
  }, [fetchFacturaPdfData, selectedFactura]);

  const handleRevertPayment = useCallback(async () => {
    if (!selectedFactura) {
      toast.error("Seleccione una factura");
      return;
    }

    const confirmed = window.confirm(
      `Esto revertirá todos los pagos de la factura ${selectedFactura.numeroFactura} y la dejará en estado pendiente. ¿Desea continuar?`,
    );

    if (!confirmed) return;

    setIsReverting(true);
    try {
      const res = await fetch("/api/facturas/revertir-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaId: selectedFactura.id,
          motivo: "Reversión manual desde módulo de facturas pagadas",
        }),
      });

      const data = await res.json();
      if (!data?.success) {
        toast.error(data?.error || "No se pudo revertir el pago");
        return;
      }

      toast.success(`Pago revertido: ${selectedFactura.numeroFactura}`);
      setSelectedFactura(null);
      await fetchData();
    } catch (error) {
      toast.error("Error de conexión al revertir el pago");
    } finally {
      setIsReverting(false);
    }
  }, [selectedFactura, fetchData]);

  // Obtener todas las facturas del mismo cliente (ordenadas por fecha descendente)
  const clienteFacturas = selectedFactura
    ? facturas
        .filter((f) => f.clienteId === selectedFactura.clienteId && f.id !== selectedFactura.id)
        .sort(
          (a, b) =>
            new Date(b.fechaPago || b.updatedAt || b.fechaFactura).getTime() -
            new Date(a.fechaPago || a.updatedAt || a.fechaFactura).getTime(),
        )
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
    return <div className="text-muted-foreground animate-pulse p-12 text-center">Cargando facturas pagadas...</div>;
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
            <div className="text-primary text-2xl font-black">{formatCurrency(totalCobradoMesActual)}</div>
            <div className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
              Mes actual: {currentMonthLabel}
            </div>
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
                          ? "border-primary ring-primary bg-slate-900 ring-1"
                          : "border-slate-700 bg-slate-900 hover:border-slate-500",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-primary text-[10px] font-black tracking-tighter uppercase">
                            {f.numeroFactura}
                          </div>
                          <div className="flex items-center gap-2 text-sm leading-tight font-bold text-white">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {f.clienteNombre} {f.clienteApellidos}
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className={cn(
                            "h-5 px-2 py-0 text-[9px] font-black uppercase",
                            isAdvancePayment(f)
                              ? "bg-sky-500 hover:bg-sky-600"
                              : isPartialPayment(f)
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-emerald-500 hover:bg-emerald-600",
                          )}
                        >
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                          {getEstadoPagoLabel(f)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="h-3 w-3" />
                          <span className="text-[10px] font-medium">Facturada: {formatDate(f.fechaFactura)}</span>
                        </div>
                        {f.fechaPago && (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-[10px] font-bold">Pagada: {formatDate(f.fechaPago)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-700 pt-2">
                        <div className="flex items-center gap-2">
                          {f.metodoPago && (
                            <div className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1">
                              <CreditCard className="h-3 w-3 text-slate-300" />
                              <span className="text-[9px] font-bold text-slate-200 uppercase">
                                {getMetodoPagoLabel(f.metodoPago)}
                              </span>
                            </div>
                          )}
                          {isPartialPayment(f) && (
                            <div className="rounded-md bg-rose-900/40 px-2 py-1 text-[9px] font-bold text-rose-300 uppercase">
                              Debe: {formatCurrency(f.montoPendiente || 0)}
                            </div>
                          )}
                        </div>
                        <div className="text-lg font-black text-emerald-400">
                          {formatCurrency(f.totalPagado || f.total || 0)}
                        </div>
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
                      className="group hover:border-primary dark:hover:border-primary flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 transition-all hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800"
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
                          className={cn(
                            "h-5 px-2 py-0 text-[9px] font-black uppercase",
                            isAdvancePayment(f)
                              ? "bg-sky-500 hover:bg-sky-600"
                              : isPartialPayment(f)
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-emerald-500 hover:bg-emerald-600",
                          )}
                        >
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                          {getEstadoPagoLabel(f)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-[9px] font-medium text-slate-500 uppercase dark:text-slate-400">
                            Subtotal
                          </div>
                          <div className="text-sm font-bold text-slate-700 dark:text-white">
                            {formatCurrency(f.subtotal || 0)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] font-medium text-slate-500 uppercase dark:text-slate-400">
                            ITBIS
                          </div>
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
                        <div className="text-lg font-black text-emerald-400">
                          {formatCurrency(f.totalPagado || f.total || 0)}
                        </div>
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
                        <span className="text-right text-xs text-slate-600 dark:text-white">
                          {selectedFactura.clienteTelefono}
                        </span>
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
                      <span className="text-muted-foreground">Estado:</span>
                      <div>
                        {isAdvancePayment(selectedFactura) ? (
                          <span className="inline-block rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                            PAGO ADELANTADO
                          </span>
                        ) : isPartialPayment(selectedFactura) ? (
                          <span className="inline-block rounded bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                            PAGO PARCIAL
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-green-600 px-3 py-1 text-xs font-bold text-white">
                            PAGADA
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fecha Factura:</span>
                      <span className="font-medium text-slate-700 dark:text-white">
                        {formatDate(selectedFactura.fechaFactura)}
                      </span>
                    </div>
                    {(selectedFactura.fechaPago || selectedFactura.updatedAt) && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Fecha Pago:</span>
                        <span className="font-bold text-emerald-600">
                          {formatDate(selectedFactura.fechaPago || selectedFactura.updatedAt)}
                        </span>
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
                    {selectedFactura.cobradoPor && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cobrado por:</span>
                        <span className="font-bold text-slate-700 uppercase italic dark:text-white">
                          {selectedFactura.cobradoPor}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monto Pendiente:</span>
                      <span
                        className={cn(
                          "font-bold",
                          Number(selectedFactura.montoPendiente || 0) > 0 ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(selectedFactura.montoPendiente || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 text-xs font-bold"
                      onClick={handleViewPdf}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 text-xs font-bold"
                      onClick={handleDownloadPdf}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 text-xs font-bold"
                      onClick={handlePrintSelectedFactura}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-10 gap-2 text-xs font-bold"
                      onClick={handleRevertPayment}
                      disabled={isReverting}
                    >
                      {isReverting ? "Revirtiendo..." : "Revertir Pago"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div
                className={cn(
                  "space-y-2 rounded-lg border p-4",
                  isAdvancePayment(selectedFactura)
                    ? "border-sky-100 bg-sky-50"
                    : isPartialPayment(selectedFactura)
                      ? "border-amber-100 bg-amber-50"
                      : "border-emerald-100 bg-emerald-50",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 text-[10px] font-black tracking-wider uppercase",
                    isAdvancePayment(selectedFactura)
                      ? "text-sky-700"
                      : isPartialPayment(selectedFactura)
                        ? "text-amber-700"
                        : "text-emerald-700",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Estado
                </div>
                {isAdvancePayment(selectedFactura) ? (
                  <p className="text-[10px] leading-relaxed font-medium text-sky-700">
                    Esta factura fue identificada como pago por adelantado.
                  </p>
                ) : isPartialPayment(selectedFactura) ? (
                  <p className="text-[10px] leading-relaxed font-medium text-amber-700">
                    Esta factura tiene pago parcial. Pendiente por pagar:{" "}
                    {formatCurrency(selectedFactura.montoPendiente || 0)}.
                  </p>
                ) : (
                  <p className="text-[10px] leading-relaxed font-medium text-emerald-700">
                    Esta factura ha sido pagada completamente y el registro está disponible para consulta y auditoría.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-slate-700 uppercase dark:text-slate-300">
                  <ChevronLeft className="h-3 w-3" />
                  <ChevronRight className="h-3 w-3" />
                  Navegación
                </div>
                <p className="text-[9px] leading-relaxed font-medium text-slate-600 dark:text-slate-400">
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
