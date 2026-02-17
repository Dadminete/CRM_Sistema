"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Eye, CreditCard, FileText, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Invoice } from "./schema";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const columns: ColumnDef<Invoice>[] = [
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
      const date = row.getValue("fechaVencimiento") as string;
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
      const estado = row.getValue("estado") as string;
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
      let label = estado;

      if (estado === "pendiente") {
        variant = "destructive";
        label = "Pendiente";
      } else if (estado === "parcial" || estado === "pago parcial") {
        variant = "secondary";
        label = "Pago Parcial";
      }

      return (
        <Badge variant={variant} className="capitalize">
          {label}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];

function ActionsCell({ row }: { row: any }) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/detalle?id=${row.original.id}`);
      const result = await res.json();
      if (result.success) {
        setInvoiceDetail(result.data);
      } else {
        toast.error("No se pudo cargar el detalle de la factura");
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenView = () => {
    setIsViewOpen(true);
    if (!invoiceDetail) fetchDetail();
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
          <DropdownMenuItem
            onClick={() =>
              (window.location.href = `/dashboard/contabilidad/ingresos-gastos?facturaId=${row.original.id}`)
            }
          >
            <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-primary focus:text-primary" onClick={() => window.print()}>
            Imprimir / PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-h-[95vh] w-[1400px] max-w-[95vw] overflow-y-auto border-none bg-transparent p-0 shadow-none">
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
                      </div>
                    </div>
                  </div>

                  {/* Columna 2: Logística */}
                  <div className="bg-muted/30 border-border/50 space-y-4 rounded-2xl border p-8">
                    <div className="text-primary flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <h4 className="text-[10px] font-black tracking-widest uppercase">Datos de Factura</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-[10px] font-black uppercase">Fecha Emisión</p>
                        <p className="text-base font-bold">{formatDate(invoiceDetail.fechaFactura)}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-muted-foreground text-[10px] font-black uppercase">Vencimiento</p>
                        <p className="text-base font-bold text-rose-500">
                          {invoiceDetail.fechaVencimiento ? formatDate(invoiceDetail.fechaVencimiento) : "N/A"}
                        </p>
                      </div>
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
                        variant={invoiceDetail.estado === "pendiente" ? "destructive" : "secondary"}
                        className="px-6 py-1 text-xs font-black tracking-tighter uppercase"
                      >
                        {invoiceDetail.estado}
                      </Badge>
                      <div className="text-right">
                        <p className="text-muted-foreground mb-1 text-[10px] font-black uppercase">Total a Pagar</p>
                        <p className="text-primary text-3xl leading-none font-black tracking-tighter">
                          {formatCurrency(Number(invoiceDetail.total))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de Items */}
                <div className="space-y-4">
                  <h4 className="text-muted-foreground ml-2 text-[10px] font-black tracking-widest uppercase">
                    Conceptos Detallados
                  </h4>
                  <div className="border-border/60 bg-background/50 overflow-hidden rounded-2xl border shadow-xl">
                    <Table>
                      <TableHeader className="bg-muted/80">
                        <TableRow className="border-b-2 hover:bg-transparent">
                          <TableHead className="w-[55%] py-5 pl-8 text-[10px] font-black tracking-widest uppercase">
                            Descripción
                          </TableHead>
                          <TableHead className="py-5 text-center text-[10px] font-black tracking-widest uppercase">
                            Cant.
                          </TableHead>
                          <TableHead className="py-5 text-right text-[10px] font-black tracking-widest uppercase">
                            Precio Unitario
                          </TableHead>
                          <TableHead className="py-5 pr-8 text-right text-[10px] font-black tracking-widest uppercase">
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
                            <TableCell className="py-6 pl-8 font-bold">
                              <p className="pr-10 text-base leading-tight break-words whitespace-normal">
                                {item.concepto}
                              </p>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-6 text-center text-lg font-black">
                              {Number(item.cantidad)}
                            </TableCell>
                            <TableCell className="py-6 text-right text-lg font-bold">
                              {formatCurrency(Number(item.precioUnitario))}
                            </TableCell>
                            <TableCell className="text-primary/80 py-6 pr-8 text-right text-lg font-black">
                              {formatCurrency(Number(item.total))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totales */}
                <div className="flex justify-end pr-4">
                  <div className="bg-muted/20 border-border/40 w-[350px] space-y-4 rounded-2xl border p-8">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-black tracking-tighter uppercase">Subtotal</span>
                      <span className="font-bold">{formatCurrency(Number(invoiceDetail.subtotal))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-black tracking-tighter uppercase">ITBIS (18%)</span>
                      <span className="font-bold">{formatCurrency(Number(invoiceDetail.itbis))}</span>
                    </div>
                    <div className="border-primary/20 mt-2 flex items-center justify-between border-t-2 pt-4">
                      <span className="text-primary font-black tracking-tighter uppercase italic">Total Final</span>
                      <span className="text-primary text-3xl font-black tracking-tighter">
                        {formatCurrency(Number(invoiceDetail.total))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
