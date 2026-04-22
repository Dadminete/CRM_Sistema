"use client";

import { useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Eye, CreditCard, FileText, Users, Calendar, Pencil, Ban, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";

import { Invoice } from "./schema";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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
    (concepto) =>
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

type TableActions = {
  onInvoiceChanged?: () => void;
};

type EditFacturaForm = {
  fechaVencimiento: string;
  subtotal: string;
  descuento: string;
  itbis: string;
  total: string;
  observaciones: string;
};

const emptyEditForm: EditFacturaForm = {
  fechaVencimiento: "",
  subtotal: "0",
  descuento: "0",
  itbis: "0",
  total: "0",
  observaciones: "",
};

export const createColumns = (actions?: TableActions): ColumnDef<Invoice>[] => [
  {
    accessorKey: "numeroFactura",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nº Factura" />,
    cell: ({ row }) => <span className="text-primary font-medium">{row.getValue("numeroFactura")}</span>,
  },
  {
    accessorKey: "clienteNombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => {
      const nombre = row.original.clienteNombre;
      const apellidos = row.original.clienteApellidos || "";
      return <span>{`${nombre} ${apellidos}`.trim()}</span>;
    },
  },
  {
    accessorKey: "diaFacturacion",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Día Fact." />,
    cell: ({ row }) => {
      const dia = row.original.diaFacturacion;
      return <span>{dia ? `Día ${dia}` : "-"}</span>;
    },
  },
  {
    accessorKey: "fechaFactura",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => <span>{formatDate(row.getValue("fechaFactura"))}</span>,
  },
  {
    accessorKey: "fechaVencimiento",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const date = row.getValue("fechaVencimiento");
      if (!date) return <span className="text-muted-foreground text-xs italic">Sin fecha</span>;

      const isPast = new Date(date) < new Date();
      return <span className={isPast ? "font-bold text-rose-500" : "text-muted-foreground"}>{formatDate(date)}</span>;
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(Number(row.getValue("total")), { locale: "es-DO", currency: "DOP" })}
      </span>
    ),
  },
  {
    accessorKey: "montoPendiente",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pendiente" />,
    cell: ({ row }) => (
      <span className="font-bold text-rose-600">
        {formatCurrency(Number(row.getValue("montoPendiente")), { locale: "es-DO", currency: "DOP" })}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const estado = row.getValue("estado");
      let bgClass = "bg-slate-500";
      let label = estado;

      if (estado === "pendiente") {
        bgClass = "bg-green-600";
        label = "Pendiente";
      } else if (estado === "parcial" || estado === "pago parcial") {
        bgClass = "bg-orange-500";
        label = "Pago Parcial";
      } else if (estado === "adelantado") {
        bgClass = "bg-blue-600";
        label = "Pago Adelantado";
      }

      return <Badge className={cn(bgClass, "text-white capitalize")}>{label}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} onInvoiceChanged={actions?.onInvoiceChanged} />,
  },
];

function ActionsCell({ row, onInvoiceChanged }: { row: any; onInvoiceChanged?: () => void }) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFacturaForm>(emptyEditForm);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/detalle?id=${row.original.id}`);
      const result = await res.json();
      if (result.success) {
        setInvoiceDetail(result.data);
        return result.data;
      } else {
        toast.error("No se pudo cargar el detalle de la factura");
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }

    return null;
  };

  const handleOpenView = () => {
    setIsViewOpen(true);
    if (!invoiceDetail) fetchDetail();
  };

  const handleOpenEdit = async () => {
    setIsEditOpen(true);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/facturas/${row.original.id}`);
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "No se pudo cargar la factura para editar");
        return;
      }

      const f = result.data;
      setEditForm({
        fechaVencimiento: f.fechaVencimiento || "",
        subtotal: Number(f.subtotal || 0).toFixed(2),
        descuento: Number(f.descuento || 0).toFixed(2),
        itbis: Number(f.itbis || 0).toFixed(2),
        total: Number(f.total || 0).toFixed(2),
        observaciones: f.observaciones || "",
      });
    } catch (error) {
      console.error("Error loading invoice for edit:", error);
      toast.error("Error de conexión al cargar la factura");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    const subtotal = Number(editForm.subtotal || 0);
    const descuento = Number(editForm.descuento || 0);
    const itbis = Number(editForm.itbis || 0);
    const total = Number(editForm.total || 0);

    if (subtotal < 0 || descuento < 0 || itbis < 0 || total <= 0) {
      toast.error("Revisa los montos: subtotal/ITBIS/descuento >= 0 y total > 0");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/facturas/${row.original.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaVencimiento: editForm.fechaVencimiento || null,
          subtotal,
          descuento,
          itbis,
          total,
          observaciones: editForm.observaciones || null,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        toast.error(result.error || "No se pudo editar la factura");
        return;
      }

      toast.success("Factura actualizada correctamente");
      setIsEditOpen(false);
      onInvoiceChanged?.();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Error de conexión al actualizar la factura");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEstadoAction = async (accion: "cancelar" | "anular") => {
    const textoAccion = accion === "cancelar" ? "cancelar" : "anular";
    const confirmed = window.confirm(
      `¿Seguro que deseas ${textoAccion} la factura ${row.original.numeroFactura}? Esta acción impactará la cuenta por cobrar.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/facturas/${row.original.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });

      const result = await res.json();
      if (!result.success) {
        toast.error(result.error || "No se pudo actualizar el estado");
        return;
      }

      toast.success(`Factura ${accion === "cancelar" ? "cancelada" : "anulada"} correctamente`);
      onInvoiceChanged?.();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast.error("Error de conexión al actualizar estado");
    }
  };

  const buildThermalHtml = (detail: any, printedBy: string) => {
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

    const numeroFactura = escapeHtml(String(detail?.numeroFactura || row.original.numeroFactura || "N/A"));
    const fechaFactura = detail?.fechaFactura ? formatDate(detail.fechaFactura) : formatDate(row.original.fechaFactura);
    const subtotal = formatCurrency(Number(detail?.subtotal || 0));
    const itbis = formatCurrency(Number(detail?.itbis || 0));
    const descuento = formatCurrency(Number(detail?.descuento || 0));
    const total = formatCurrency(Number(detail?.total || row.original.total || 0));
    const pendiente = formatCurrency(Number(row.original.montoPendiente || 0));

    return `
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
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="center bold">Tecnologica Del Este</div>
            <div class="center bold">FACTURA CLIENTE</div>
            <div class="center">${numeroFactura}</div>
            <div class="line"></div>

            <div><span class="bold">Cliente:</span> ${escapeHtml(clienteNombre || "N/A")}</div>
            <div><span class="bold">Servicio:</span> ${escapeHtml(tipoServicio)}</div>
            <div><span class="bold">Plan:</span> ${escapeHtml(planCliente)}</div>
            <div><span class="bold">Fecha:</span> ${escapeHtml(fechaFactura)}</div>
            <div><span class="bold">Estado:</span> ${escapeHtml(String(row.original.estado || "pendiente"))}</div>

            <div class="line"></div>
            <div class="bold">Conceptos</div>
            ${itemsHtml || '<div class="item">Sin conceptos detallados</div>'}

            <div class="line"></div>
            <div class="totals">
              <div class="row"><span>Subtotal</span><span>${subtotal}</span></div>
              <div class="row"><span>ITBIS</span><span>${itbis}</span></div>
              <div class="row"><span>Descuento</span><span>- ${descuento}</span></div>
              <div class="row bold"><span>TOTAL</span><span>${total}</span></div>
              <div class="row"><span>Pendiente</span><span>${pendiente}</span></div>
            </div>

            <div class="line"></div>
            <div>Impreso por: ${escapeHtml(printedBy)}</div>
            <div class="footer center">Gracias por su preferencia</div>
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `;
  };

  const handlePrintThermal = async () => {
    const detail = invoiceDetail || (await fetchDetail());
    if (!detail) {
      toast.error("No se pudo generar la impresión de la factura");
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

    const popup = window.open("", `thermal-print-${row.original.id}`, "width=420,height=900");
    if (!popup) {
      toast.error("Permite ventanas emergentes para imprimir la factura");
      return;
    }

    popup.document.open();
    popup.document.write(buildThermalHtml(detail, printedBy));
    popup.document.close();
    popup.focus();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" size="icon">
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleOpenView}>
            <Eye className="mr-2 h-4 w-4" /> Vista Factura
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Editar Factura
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              (window.location.href = `/dashboard/contabilidad/ingresos-gastos?facturaId=${row.original.id}`)
            }
          >
            <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-amber-600 focus:text-amber-600"
            onClick={() => handleEstadoAction("cancelar")}
          >
            <Ban className="mr-2 h-4 w-4" /> Cancelar Factura
          </DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => handleEstadoAction("anular")}>
            <XCircle className="mr-2 h-4 w-4" /> Anular Factura
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-primary focus:text-primary" onClick={handlePrintThermal}>
            Imprimir / PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DIALOGO: VISTA DETALLE DE FACTURA */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-h-[95vh] w-full max-w-[98vw] overflow-y-auto border-none bg-transparent p-0 shadow-none sm:max-w-6xl">
          <div className="bg-background animate-in zoom-in-95 space-y-10 rounded-[2rem] border p-10 shadow-2xl duration-300">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-6">
              <div className="space-y-1">
                <DialogTitle className="text-primary flex items-center gap-3 text-3xl font-black tracking-tighter uppercase italic">
                  <FileText className="h-8 w-8" />
                  Detalle de Factura
                </DialogTitle>
                <DialogDescription className="text-base font-medium">
                  Visualización técnica del comprobante fiscal y conceptos asociados.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary rounded-xl px-6 py-2 text-2xl font-black"
              >
                {row.original.numeroFactura}
              </Badge>
            </DialogHeader>

            {loading ? (
              <div className="space-y-4 py-20 text-center">
                <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
                <p className="text-muted-foreground animate-pulse text-sm font-black tracking-widest uppercase">
                  Sincronizando datos...
                </p>
              </div>
            ) : invoiceDetail ? (
              <div className="space-y-10">
                {/* Cabecera de Datos en 3 Columnas */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Columna 1: Cliente */}
                  <div className="bg-muted/30 border-border/50 space-y-4 rounded-2xl border p-8">
                    <div className="text-primary flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <h4 className="text-[10px] font-black tracking-widest uppercase">Información del Cliente</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl leading-tight font-bold">
                        {invoiceDetail.clienteNombre} {invoiceDetail.clienteApellidos}
                      </p>
                      <div className="space-y-1 pt-2">
                        <p className="text-muted-foreground text-sm font-semibold tracking-tighter uppercase">
                          ID: <span className="text-foreground">{invoiceDetail.clienteId}</span>
                        </p>
                        <p className="text-muted-foreground text-sm font-medium tracking-tighter uppercase">
                          RNC/Cédula: <span className="text-foreground">{invoiceDetail.clienteRnc || "N/A"}</span>
                        </p>
                        <p className="text-muted-foreground text-sm font-medium tracking-tighter uppercase">
                          Tel: <span className="text-foreground">{invoiceDetail.clienteTelefono || "N/A"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Columna 2: Logística */}
                  <div className="bg-muted/30 border-border/50 space-y-4 rounded-2xl border p-8">
                    <div className="text-primary flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <h4 className="text-[10px] font-black tracking-widest uppercase">Datos de Factura</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="border-border/20 flex items-center justify-between border-b pb-2">
                        <p className="text-muted-foreground text-[10px] font-black uppercase">Fecha Emisión</p>
                        <p className="text-sm font-bold">{formatDate(invoiceDetail.fechaFactura)}</p>
                      </div>
                      <div className="border-border/20 flex items-center justify-between border-b pb-2">
                        <p className="text-muted-foreground text-[10px] font-black uppercase">Vencimiento</p>
                        <p className="text-sm font-bold text-rose-500">
                          {invoiceDetail.fechaVencimiento ? formatDate(invoiceDetail.fechaVencimiento) : "N/A"}
                        </p>
                      </div>
                      {invoiceDetail.periodoFacturadoInicio && (
                        <div className="flex items-center justify-between">
                          <p className="text-muted-foreground text-[10px] font-black uppercase">Periodo</p>
                          <p className="text-[10px] font-bold">
                            {formatDate(invoiceDetail.periodoFacturadoInicio)} -{" "}
                            {formatDate(invoiceDetail.periodoFacturadoFin)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Columna 3: Estado */}
                  <div className="bg-primary/5 border-primary/10 space-y-4 rounded-2xl border p-8 shadow-inner">
                    <div className="text-primary flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      <h4 className="text-[10px] font-black tracking-widest uppercase">Estado y Liquidación</h4>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Badge
                        className={cn(
                          "px-4 py-1 text-[10px] font-black tracking-tighter text-white uppercase",
                          invoiceDetail.estado === "pendiente"
                            ? "bg-green-600"
                            : invoiceDetail.estado === "adelantado"
                              ? "bg-blue-600"
                              : invoiceDetail.estado === "parcial" || invoiceDetail.estado === "pago parcial"
                                ? "bg-orange-500"
                                : "bg-slate-500",
                        )}
                      >
                        {invoiceDetail.estado}
                      </Badge>
                      <div className="text-right">
                        <p className="text-muted-foreground mb-1 text-[10px] font-black uppercase">Saldo Pendiente</p>
                        <p className="text-3xl leading-none font-black tracking-tighter text-rose-600">
                          {formatCurrency(Number(invoiceDetail.montoPendiente ?? row.original.montoPendiente ?? 0))}
                        </p>
                      </div>
                    </div>
                    {invoiceDetail.diasVencido > 0 && (
                      <div className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-center">
                        <p className="text-[10px] font-black text-rose-600 uppercase italic">
                          Documento vencido por {invoiceDetail.diasVencido} días
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {invoiceDetail.observaciones && (
                  <div className="bg-muted/20 border-border/50 rounded-2xl border p-6">
                    <h4 className="text-muted-foreground mb-2 text-[10px] font-black tracking-widest uppercase">
                      Observaciones / Notas
                    </h4>
                    <p className="text-foreground/80 text-sm italic">{invoiceDetail.observaciones}</p>
                  </div>
                )}

                {/* Tabla de Items */}
                <div className="space-y-4">
                  <h4 className="text-muted-foreground ml-2 text-[10px] font-black tracking-widest uppercase">
                    Conceptos Detallados
                  </h4>
                  <div className="border-border/60 bg-background/50 overflow-hidden rounded-2xl border shadow-xl">
                    <Table>
                      <TableHeader className="bg-muted/80">
                        <TableRow className="border-b-2 hover:bg-transparent">
                          <TableHead className="w-[50%] py-4 pl-8 text-[10px] font-black tracking-widest uppercase">
                            Descripción
                          </TableHead>
                          <TableHead className="py-4 text-center text-[10px] font-black tracking-widest uppercase">
                            Cant.
                          </TableHead>
                          <TableHead className="py-4 text-right text-[10px] font-black tracking-widest uppercase">
                            Precio
                          </TableHead>
                          <TableHead className="py-4 text-right text-[10px] font-black tracking-widest uppercase">
                            Desc.
                          </TableHead>
                          <TableHead className="py-4 pr-8 text-right text-[10px] font-black tracking-widest uppercase">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetail.items?.map((item: any, idx: number) => (
                          <TableRow
                            key={idx}
                            className="hover:bg-primary/5 border-border/40 border-b transition-all duration-200"
                          >
                            <TableCell className="py-4 pl-8 font-bold">
                              <p className="text-sm leading-tight break-words whitespace-normal">{item.concepto}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-4 text-center text-sm font-black">
                              {Number(item.cantidad)}
                            </TableCell>
                            <TableCell className="py-4 text-right text-sm font-bold">
                              {formatCurrency(Number(item.precioUnitario))}
                            </TableCell>
                            <TableCell className="py-4 text-right text-sm font-bold text-rose-500">
                              {Number(item.descuento) > 0 ? `-${formatCurrency(Number(item.descuento))}` : "-"}
                            </TableCell>
                            <TableCell className="text-primary/80 py-4 pr-8 text-right text-sm font-black">
                              {formatCurrency(Number(item.total))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Historial de Pagos */}
                {invoiceDetail.payments?.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-muted-foreground ml-2 text-[10px] font-black tracking-widest uppercase">
                      Historial de Pagos Aplicados
                    </h4>
                    <div className="border-border/60 bg-background/50 overflow-hidden rounded-2xl border shadow-xl">
                      <Table>
                        <TableHeader className="bg-muted/80">
                          <TableRow className="border-b-2 hover:bg-transparent">
                            <TableHead className="py-4 pl-8 text-[10px] font-black tracking-widest uppercase">
                              Fecha Pago
                            </TableHead>
                            <TableHead className="py-4 text-[10px] font-black tracking-widest uppercase">
                              Método
                            </TableHead>
                            <TableHead className="py-4 text-[10px] font-black tracking-widest uppercase">
                              Referencia
                            </TableHead>
                            <TableHead className="py-4 text-right text-[10px] font-black tracking-widest uppercase">
                              Monto
                            </TableHead>
                            <TableHead className="py-4 pr-8 text-right text-[10px] font-black tracking-widest uppercase">
                              Descuento
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceDetail.payments.map((payment: any, idx: number) => (
                            <TableRow key={idx} className="border-border/40 border-b hover:bg-emerald-50/50">
                              <TableCell className="py-4 pl-8 font-bold">{formatDate(payment.fechaPago)}</TableCell>
                              <TableCell className="py-4 text-sm capitalize">{payment.metodoPago}</TableCell>
                              <TableCell className="text-muted-foreground py-4 text-sm">
                                {payment.referencia || "Efectivo"}
                              </TableCell>
                              <TableCell className="py-4 text-right font-black text-emerald-600">
                                {formatCurrency(Number(payment.monto))}
                              </TableCell>
                              <TableCell className="py-4 pr-8 text-right font-bold text-rose-500">
                                {Number(payment.descuento) > 0 ? `-${formatCurrency(Number(payment.descuento))}` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Totales */}
                <div className="flex justify-end pr-4">
                  <div className="bg-muted/20 border-border/40 w-[350px] space-y-4 rounded-2xl border p-8">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-black tracking-tighter uppercase">Subtotal</span>
                      <span className="font-bold">{formatCurrency(Number(invoiceDetail.subtotal))}</span>
                    </div>
                    {Number(invoiceDetail.descuento) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-black tracking-tighter uppercase">
                          Descuento Global
                        </span>
                        <span className="font-bold text-rose-500">
                          -{formatCurrency(Number(invoiceDetail.descuento))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-black tracking-tighter uppercase">ITBIS (18%)</span>
                      <span className="font-bold">{formatCurrency(Number(invoiceDetail.itbis))}</span>
                    </div>
                    <div className="border-primary/20 mt-2 flex items-center justify-between border-t-2 pt-4">
                      <span className="text-primary font-black tracking-tighter uppercase italic">Total Facturado</span>
                      <span className="text-primary text-3xl font-black tracking-tighter">
                        {formatCurrency(Number(invoiceDetail.total))}
                      </span>
                    </div>
                    <div className="border-border/50 flex items-center justify-between border-t border-dashed pt-2">
                      <span className="text-muted-foreground text-xs font-black tracking-tighter uppercase">
                        Total Cobrado
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(Number(invoiceDetail.total) - Number(invoiceDetail.montoPendiente ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOGO: EDITAR FACTURA */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Factura {row.original.numeroFactura}</DialogTitle>
            <DialogDescription>Actualiza datos de la factura creada o su vencimiento.</DialogDescription>
          </DialogHeader>

          {editLoading ? (
            <div className="text-muted-foreground py-6 text-center text-sm">Cargando datos de factura...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`fecha-vencimiento-${row.original.id}`}>Fecha Vencimiento</Label>
                  <Input
                    id={`fecha-vencimiento-${row.original.id}`}
                    type="date"
                    value={editForm.fechaVencimiento}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, fechaVencimiento: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`total-${row.original.id}`}>Total</Label>
                  <Input
                    id={`total-${row.original.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.total}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, total: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`subtotal-${row.original.id}`}>Subtotal</Label>
                  <Input
                    id={`subtotal-${row.original.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.subtotal}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, subtotal: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`descuento-${row.original.id}`}>Descuento</Label>
                  <Input
                    id={`descuento-${row.original.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.descuento}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, descuento: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`itbis-${row.original.id}`}>ITBIS</Label>
                  <Input
                    id={`itbis-${row.original.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.itbis}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, itbis: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`observaciones-${row.original.id}`}>Observaciones</Label>
                <Textarea
                  id={`observaciones-${row.original.id}`}
                  value={editForm.observaciones}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                  placeholder="Notas de la factura"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={savingEdit}>
                  Cerrar
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
