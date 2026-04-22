"use client";

import { useEffect, useMemo, useState } from "react";

import { Ban, ChevronLeft, ChevronRight, Pencil, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type VentaItem = {
  id: string;
  ventaId: string;
  productoId: number;
  nombreProducto: string | null;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  impuesto: string;
  descuento: string;
  total: string;
};

type Venta = {
  id: string;
  numeroVenta: string;
  fechaVenta: string;
  clienteNombre: string | null;
  clienteCedula: string | null;
  subtotal: string;
  impuestos: string;
  descuentos: string;
  total: string;
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO" | "OTRO";
  estado: "PENDIENTE" | "COMPLETADA" | "CANCELADA" | "DEVUELTA";
  notas: string | null;
  cajaId: string | null;
  cuentaBancariaId: string | null;
  cajaNombre: string | null;
  cuentaBancariaNumero: string | null;
  items: VentaItem[];
};

type Caja = {
  id: string;
  nombre: string;
};

type CuentaBancaria = {
  id: string;
  numeroCuenta: string;
  bancoNombre: string;
};

type EditableItem = {
  detalleId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
};

type EditableVenta = {
  ventaId: string;
  clienteNombre: string;
  clienteCedula: string;
  metodoPago: Venta["metodoPago"];
  estado: Venta["estado"];
  notas: string;
  cajaId: string;
  cuentaBancariaId: string;
  items: EditableItem[];
};

const formatoMoneda = (valor: string | number) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(valor || 0));

const formatoFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ListadoVentasPapeleriaPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const [openEdit, setOpenEdit] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editVenta, setEditVenta] = useState<EditableVenta | null>(null);

  const fetchVentas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/papeleria/ventas");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el listado");
      }

      setVentas(data.data || []);
    } catch (error: any) {
      toast.error(error.message || "Error cargando ventas");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const [resCajas, resCuentas] = await Promise.all([
        fetch("/api/traspasos/cuentas/cajas"),
        fetch("/api/traspasos/cuentas/bancos"),
      ]);

      const [dataCajas, dataCuentas] = await Promise.all([resCajas.json(), resCuentas.json()]);

      if (dataCajas.success) {
        setCajas((dataCajas.data || []).map((item: any) => ({ id: item.id, nombre: item.nombre })));
      }

      if (dataCuentas.success) {
        setCuentas(
          (dataCuentas.data || []).map((item: any) => ({
            id: item.id,
            numeroCuenta: item.numeroCuenta,
            bancoNombre: item.bancoNombre,
          })),
        );
      }
    } catch {
      // No bloquea el listado si falla catálogos.
    }
  };

  useEffect(() => {
    fetchVentas();
    fetchCatalogos();
  }, []);

  const ventasFiltradas = useMemo(() => {
    let result = [...ventas].sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime());

    const criterio = busqueda.trim().toLowerCase();
    if (criterio) {
      result = result.filter((v) => {
        const numero = v.numeroVenta.toLowerCase();
        const cliente = (v.clienteNombre ?? "").toLowerCase();
        const cedula = (v.clienteCedula ?? "").toLowerCase();
        return numero.includes(criterio) || cliente.includes(criterio) || cedula.includes(criterio);
      });
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      result = result.filter((v) => new Date(v.fechaVenta) >= desde);
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      result = result.filter((v) => new Date(v.fechaVenta) <= hasta);
    }
    if (filtroMetodo !== "TODOS") {
      result = result.filter((v) => v.metodoPago === filtroMetodo);
    }
    if (filtroEstado !== "TODOS") {
      result = result.filter((v) => v.estado === filtroEstado);
    }

    return result;
  }, [ventas, busqueda, fechaDesde, fechaHasta, filtroMetodo, filtroEstado]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, fechaDesde, fechaHasta, filtroMetodo, filtroEstado, porPagina]);

  const totalPaginas = Math.max(1, Math.ceil(ventasFiltradas.length / porPagina));
  const ventasPaginadas = ventasFiltradas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  const abrirEdicion = (venta: Venta) => {
    setEditVenta({
      ventaId: venta.id,
      clienteNombre: venta.clienteNombre || "",
      clienteCedula: venta.clienteCedula || "",
      metodoPago: venta.metodoPago,
      estado: venta.estado,
      notas: venta.notas || "",
      cajaId: venta.cajaId || "",
      cuentaBancariaId: venta.cuentaBancariaId || "",
      items: (venta.items || []).map((item) => ({
        detalleId: item.id,
        nombreProducto: item.nombreProducto || "Producto",
        cantidad: Number(item.cantidad || 0),
        precioUnitario: Number(item.precioUnitario || 0),
        descuento: Number(item.descuento || 0),
      })),
    });
    setOpenEdit(true);
  };

  const actualizarItem = (index: number, key: keyof EditableItem, value: string) => {
    if (!editVenta) return;

    const items = [...editVenta.items];
    if (key === "cantidad") {
      items[index].cantidad = Math.max(1, Number(value || 1));
    }
    if (key === "precioUnitario") {
      items[index].precioUnitario = Math.max(0.01, Number(value || 0.01));
    }
    if (key === "descuento") {
      items[index].descuento = Math.max(0, Number(value || 0));
    }

    setEditVenta({ ...editVenta, items });
  };

  const totalEdicion = useMemo(() => {
    if (!editVenta) return 0;
    return editVenta.items.reduce((acc, item) => {
      const subtotal = item.cantidad * item.precioUnitario;
      return acc + Math.max(0, subtotal - item.descuento);
    }, 0);
  }, [editVenta]);

  const cancelarVenta = async (ventaId: string) => {
    try {
      const res = await fetch("/api/papeleria/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ventaId, estado: "CANCELADA", items: [] }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "No se pudo cancelar la venta");
      toast.success("Venta cancelada correctamente");
      fetchVentas();
    } catch (error: any) {
      toast.error(error.message || "Error cancelando venta");
    }
  };

  const guardarEdicion = async () => {
    if (!editVenta) return;

    try {
      setGuardando(true);
      const payload = {
        ventaId: editVenta.ventaId,
        clienteNombre: editVenta.clienteNombre || null,
        clienteCedula: editVenta.clienteCedula || null,
        metodoPago: editVenta.metodoPago,
        estado: editVenta.estado,
        notas: editVenta.notas || null,
        cajaId: editVenta.metodoPago === "EFECTIVO" ? editVenta.cajaId || null : null,
        cuentaBancariaId: editVenta.metodoPago === "TRANSFERENCIA" ? editVenta.cuentaBancariaId || null : null,
        items: editVenta.items.map((item) => ({
          detalleId: item.detalleId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento,
        })),
      };

      const res = await fetch("/api/papeleria/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar la venta");
      }

      toast.success("Venta actualizada correctamente");
      setOpenEdit(false);
      setEditVenta(null);
      fetchVentas();
    } catch (error: any) {
      toast.error(error.message || "Error actualizando venta");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Ventas de Papelería</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={fetchVentas}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refrescar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative col-span-2 md:col-span-1 lg:col-span-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Buscar número, cliente, cédula"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Input type="date" placeholder="Desde" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            <Input type="date" placeholder="Hasta" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los métodos</SelectItem>
                <SelectItem value="EFECTIVO">EFECTIVO</SelectItem>
                <SelectItem value="TARJETA">TARJETA</SelectItem>
                <SelectItem value="TRANSFERENCIA">TRANSFERENCIA</SelectItem>
                <SelectItem value="CREDITO">CREDITO</SelectItem>
                <SelectItem value="OTRO">OTRO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                <SelectItem value="COMPLETADA">COMPLETADA</SelectItem>
                <SelectItem value="CANCELADA">CANCELADA</SelectItem>
                <SelectItem value="DEVUELTA">DEVUELTA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                      No hay ventas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  ventasPaginadas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.numeroVenta}</TableCell>
                      <TableCell>{formatoFecha(venta.fechaVenta)}</TableCell>
                      <TableCell>{venta.clienteNombre || "Consumidor final"}</TableCell>
                      <TableCell>{venta.metodoPago}</TableCell>
                      <TableCell>{venta.estado}</TableCell>
                      <TableCell className="text-right">{formatoMoneda(venta.total)}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Dialog open={openEdit && editVenta?.ventaId === venta.id} onOpenChange={setOpenEdit}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => abrirEdicion(venta)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Editar venta</TooltipContent>
                              </Tooltip>
                              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Editar venta {venta.numeroVenta}</DialogTitle>
                                  <DialogDescription>
                                    Modifica los datos de la venta y sus líneas de detalle.
                                  </DialogDescription>
                                </DialogHeader>

                                {editVenta && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      <div className="space-y-1.5">
                                        <Label>Cliente</Label>
                                        <Input
                                          value={editVenta.clienteNombre}
                                          onChange={(e) =>
                                            setEditVenta({ ...editVenta, clienteNombre: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label>Cédula / RNC</Label>
                                        <Input
                                          value={editVenta.clienteCedula}
                                          onChange={(e) =>
                                            setEditVenta({ ...editVenta, clienteCedula: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label>Método de pago</Label>
                                        <Select
                                          value={editVenta.metodoPago}
                                          onValueChange={(value) =>
                                            setEditVenta({
                                              ...editVenta,
                                              metodoPago: value as EditableVenta["metodoPago"],
                                              cajaId: value === "EFECTIVO" ? editVenta.cajaId : "",
                                              cuentaBancariaId:
                                                value === "TRANSFERENCIA" ? editVenta.cuentaBancariaId : "",
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="EFECTIVO">EFECTIVO</SelectItem>
                                            <SelectItem value="TARJETA">TARJETA</SelectItem>
                                            <SelectItem value="TRANSFERENCIA">TRANSFERENCIA</SelectItem>
                                            <SelectItem value="CREDITO">CREDITO</SelectItem>
                                            <SelectItem value="OTRO">OTRO</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label>Estado</Label>
                                        <Select
                                          value={editVenta.estado}
                                          onValueChange={(value) =>
                                            setEditVenta({ ...editVenta, estado: value as EditableVenta["estado"] })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                                            <SelectItem value="COMPLETADA">COMPLETADA</SelectItem>
                                            <SelectItem value="CANCELADA">CANCELADA</SelectItem>
                                            <SelectItem value="DEVUELTA">DEVUELTA</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {editVenta.metodoPago === "EFECTIVO" && (
                                      <div className="space-y-1.5">
                                        <Label>Caja</Label>
                                        <Select
                                          value={editVenta.cajaId || "none"}
                                          onValueChange={(value) =>
                                            setEditVenta({
                                              ...editVenta,
                                              cajaId: value === "none" ? "" : value,
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar caja" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">Sin caja</SelectItem>
                                            {cajas.map((caja) => (
                                              <SelectItem key={caja.id} value={caja.id}>
                                                {caja.nombre}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {editVenta.metodoPago === "TRANSFERENCIA" && (
                                      <div className="space-y-1.5">
                                        <Label>Cuenta bancaria</Label>
                                        <Select
                                          value={editVenta.cuentaBancariaId || "none"}
                                          onValueChange={(value) =>
                                            setEditVenta({
                                              ...editVenta,
                                              cuentaBancariaId: value === "none" ? "" : value,
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar cuenta" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">Sin cuenta</SelectItem>
                                            {cuentas.map((cuenta) => (
                                              <SelectItem key={cuenta.id} value={cuenta.id}>
                                                {cuenta.bancoNombre} - {cuenta.numeroCuenta}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <Label>Detalle vendido</Label>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Cantidad</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead>Descuento</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {editVenta.items.map((item, index) => (
                                            <TableRow key={item.detalleId}>
                                              <TableCell>{item.nombreProducto}</TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  value={item.cantidad}
                                                  onChange={(e) => actualizarItem(index, "cantidad", e.target.value)}
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min={0.01}
                                                  step="0.01"
                                                  value={item.precioUnitario}
                                                  onChange={(e) =>
                                                    actualizarItem(index, "precioUnitario", e.target.value)
                                                  }
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step="0.01"
                                                  value={item.descuento}
                                                  onChange={(e) => actualizarItem(index, "descuento", e.target.value)}
                                                />
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    <div className="flex items-center justify-between border-t pt-3">
                                      <span className="text-muted-foreground text-sm">Total recalculado</span>
                                      <span className="text-lg font-semibold">{formatoMoneda(totalEdicion)}</span>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setOpenEdit(false);
                                          setEditVenta(null);
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button onClick={guardarEdicion} disabled={guardando}>
                                        {guardando ? "Guardando..." : "Guardar cambios"}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            {venta.estado !== "CANCELADA" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm(`¿Cancelar la venta ${venta.numeroVenta}?`)) {
                                        cancelarVenta(venta.id);
                                      }
                                    }}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar venta</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {!loading && (
            <div className="flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>Filas por página:</span>
                <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 75, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  {ventasFiltradas.length === 0
                    ? "0 resultados"
                    : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, ventasFiltradas.length)} de ${ventasFiltradas.length}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={paginaActual === 1}
                  onClick={() => setPaginaActual((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const inicio = Math.max(1, Math.min(paginaActual - 2, totalPaginas - 4));
                  const pagina = inicio + i;
                  return (
                    <Button
                      key={pagina}
                      variant={pagina === paginaActual ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPaginaActual(pagina)}
                    >
                      {pagina}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPaginaActual((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
