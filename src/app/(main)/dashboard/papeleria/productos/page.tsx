"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Pencil, Plus, PowerOff, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
type Categoria = { id: number; nombre: string; color: string | null };
type Proveedor = { id: string; nombre: string; razonSocial: string | null };

type Producto = {
  id: number;
  codigo: string;
  codigoBarras: string | null;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  marca: string | null;
  modelo: string | null;
  unidadMedida: string;
  precioCompra: string;
  precioVenta: string;
  margenGanancia: string;
  stockMinimo: number;
  stockActual: number;
  ubicacion: string | null;
  imagen: string | null;
  activo: boolean;
  proveedorId: string | null;
  aplicaImpuesto: boolean;
  tasaImpuesto: string;
  costoPromedio: string;
  createdAt: string;
  categoria: { id: number; nombre: string; color: string | null } | null;
};

type FormData = {
  codigo: string;
  codigoBarras: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  marca: string;
  modelo: string;
  unidadMedida: string;
  precioCompra: string;
  precioVenta: string;
  margenGanancia: string;
  stockMinimo: string;
  stockActual: string;
  ubicacion: string;
  activo: boolean;
  proveedorId: string;
  aplicaImpuesto: boolean;
  tasaImpuesto: string;
  costoPromedio: string;
};

const UNIDADES = ["UNIDAD", "CAJA", "PAQUETE", "RESMA", "ROLLO", "METRO", "LITRO", "KILO", "DOCENA", "OTRO"];

const formVacio = (): FormData => ({
  codigo: "",
  codigoBarras: "",
  nombre: "",
  descripcion: "",
  categoriaId: "",
  marca: "",
  modelo: "",
  unidadMedida: "UNIDAD",
  precioCompra: "",
  precioVenta: "",
  margenGanancia: "0",
  stockMinimo: "0",
  stockActual: "0",
  ubicacion: "",
  activo: true,
  proveedorId: "",
  aplicaImpuesto: false,
  tasaImpuesto: "0",
  costoPromedio: "0",
});

const formatoMoneda = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v || 0));

// ────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────
export default function ProductosPapeleriaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState("TODAS");
  const [filtroActivo, setFiltroActivo] = useState("TODOS");

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(formVacio());

  // ── Fetch ────────────────────────────────────────────
  const fetchProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/papeleria/productos?todos=true");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "No se pudo cargar los productos");
      setProductos((data.data || []).map((p: any) => ({ ...p, id: Number(p.id) })));
    } catch (e: any) {
      toast.error(e.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const [rCat, rProv] = await Promise.all([
        fetch("/api/papeleria/categorias"),
        fetch("/api/papeleria/proveedores"),
      ]);
      const [dCat, dProv] = await Promise.all([rCat.json(), rProv.json()]);
      if (dCat.success) setCategorias((dCat.data || []).map((c: any) => ({ ...c, id: Number(c.id) })));
      if (dProv.success) setProveedores(dProv.data || []);
    } catch {
      // no bloquea
    }
  };

  useEffect(() => {
    fetchProductos();
    fetchCatalogos();
  }, []);

  // ── Filtro + orden + paginación ──────────────────────
  const productosFiltrados = useMemo(() => {
    let r = [...productos].sort((a, b) => b.id - a.id);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          (p.codigoBarras ?? "").toLowerCase().includes(q) ||
          (p.marca ?? "").toLowerCase().includes(q),
      );
    }
    if (filtroCat !== "TODAS") r = r.filter((p) => String(p.categoriaId) === filtroCat);
    if (filtroActivo === "ACTIVOS") r = r.filter((p) => p.activo);
    if (filtroActivo === "INACTIVOS") r = r.filter((p) => !p.activo);
    return r;
  }, [productos, busqueda, filtroCat, filtroActivo]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCat, filtroActivo, porPagina]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / porPagina));
  const productosPaginados = productosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  // ── Cálculo automático margen ────────────────────────
  const handlePrecioChange = (key: "precioCompra" | "precioVenta", val: string) => {
    const updated = { ...form, [key]: val };
    const compra = parseFloat(key === "precioCompra" ? val : form.precioCompra) || 0;
    const venta = parseFloat(key === "precioVenta" ? val : form.precioVenta) || 0;
    if (compra > 0) {
      updated.margenGanancia = (((venta - compra) / compra) * 100).toFixed(2);
    }
    setForm(updated);
  };

  // ── Abrir modal ──────────────────────────────────────
  const abrirNuevo = () => {
    setEditId(null);
    setForm(formVacio());
    setModalAbierto(true);
  };

  const abrirEdicion = (p: Producto) => {
    setEditId(p.id);
    setForm({
      codigo: p.codigo,
      codigoBarras: p.codigoBarras ?? "",
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      categoriaId: String(p.categoriaId),
      marca: p.marca ?? "",
      modelo: p.modelo ?? "",
      unidadMedida: p.unidadMedida,
      precioCompra: p.precioCompra,
      precioVenta: p.precioVenta,
      margenGanancia: p.margenGanancia,
      stockMinimo: String(p.stockMinimo),
      stockActual: String(p.stockActual),
      ubicacion: p.ubicacion ?? "",
      activo: p.activo,
      proveedorId: p.proveedorId ?? "",
      aplicaImpuesto: p.aplicaImpuesto,
      tasaImpuesto: p.tasaImpuesto,
      costoPromedio: p.costoPromedio,
    });
    setModalAbierto(true);
  };

  // ── Guardar ──────────────────────────────────────────
  const guardar = async () => {
    if (!form.codigo || !form.nombre || !form.categoriaId || !form.precioVenta || !form.unidadMedida) {
      toast.error("Completa los campos obligatorios: código, nombre, categoría, unidad y precio de venta");
      return;
    }

    const payload = {
      ...(editId ? { id: editId } : {}),
      codigo: form.codigo.trim(),
      codigoBarras: form.codigoBarras.trim() || null,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoriaId: Number(form.categoriaId),
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      unidadMedida: form.unidadMedida,
      precioCompra: parseFloat(form.precioCompra) || 0,
      precioVenta: parseFloat(form.precioVenta),
      margenGanancia: parseFloat(form.margenGanancia) || 0,
      stockMinimo: parseInt(form.stockMinimo) || 0,
      stockActual: parseInt(form.stockActual) || 0,
      ubicacion: form.ubicacion.trim() || null,
      activo: form.activo,
      proveedorId: form.proveedorId || null,
      aplicaImpuesto: form.aplicaImpuesto,
      tasaImpuesto: parseFloat(form.tasaImpuesto) || 0,
      costoPromedio: parseFloat(form.costoPromedio) || 0,
    };

    try {
      setGuardando(true);
      const res = await fetch("/api/papeleria/productos", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Error guardando producto");
      toast.success(editId ? "Producto actualizado" : "Producto creado correctamente");
      setModalAbierto(false);
      fetchProductos();
    } catch (e: any) {
      toast.error(e.message || "Error guardando producto");
    } finally {
      setGuardando(false);
    }
  };

  // ── Toggle activo ────────────────────────────────────
  const toggleActivo = async (p: Producto) => {
    try {
      const res = await fetch("/api/papeleria/productos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, activo: !p.activo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Error");
      toast.success(p.activo ? "Producto desactivado" : "Producto activado");
      fetchProductos();
    } catch (e: any) {
      toast.error(e.message || "Error cambiando estado");
    }
  };

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de Productos — Papelería</CardTitle>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={fetchProductos}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refrescar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={abrirNuevo}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="relative col-span-2 md:col-span-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre, código, marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroCat} onValueChange={setFiltroCat}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las categorías</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroActivo} onValueChange={setFiltroActivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ACTIVOS">Solo activos</SelectItem>
                <SelectItem value="INACTIVOS">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">P. Compra</TableHead>
                  <TableHead className="text-right">P. Venta</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPaginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                      No hay productos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  productosPaginados.map((p) => (
                    <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.nombre}</div>
                        {p.marca && <div className="text-muted-foreground text-xs">{p.marca}</div>}
                      </TableCell>
                      <TableCell>
                        {p.categoria ? (
                          <Badge
                            style={p.categoria.color ? { backgroundColor: p.categoria.color, color: "#fff" } : {}}
                            variant="secondary"
                          >
                            {p.categoria.nombre}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{p.unidadMedida}</TableCell>
                      <TableCell className="text-right">{formatoMoneda(p.precioCompra)}</TableCell>
                      <TableCell className="text-right font-medium">{formatoMoneda(p.precioVenta)}</TableCell>
                      <TableCell className="text-right">
                        <span className={p.stockActual <= p.stockMinimo ? "text-destructive font-semibold" : ""}>
                          {p.stockActual}
                        </span>
                        <span className="text-muted-foreground text-xs"> / {p.stockMinimo}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => abrirEdicion(p)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={
                                    p.activo
                                      ? "text-destructive hover:text-destructive"
                                      : "text-green-600 hover:text-green-700"
                                  }
                                  onClick={() => toggleActivo(p)}
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{p.activo ? "Desactivar" : "Activar"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Paginación */}
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
                  {productosFiltrados.length === 0
                    ? "0 resultados"
                    : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, productosFiltrados.length)} de ${productosFiltrados.length}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                  const num = inicio + i;
                  return (
                    <Button
                      key={num}
                      variant={num === pagina ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPagina(num)}
                    >
                      {num}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal Crear / Editar ── */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              {editId ? "Modifica los datos del producto." : "Completa el formulario para registrar un nuevo producto."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Fila 1: Código / Nombre */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="PAP-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Bolígrafo azul BIC"
                />
              </div>
            </div>

            {/* Fila 2: Categoría / Unidad */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Unidad de medida <span className="text-destructive">*</span>
                </Label>
                <Select value={form.unidadMedida} onValueChange={(v) => setForm({ ...form, unidadMedida: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 3: Marca / Modelo */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  placeholder="BIC, Pelikan..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              </div>
            </div>

            {/* Fila 4: Precios */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Precio de compra (RD$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.precioCompra}
                  onChange={(e) => handlePrecioChange("precioCompra", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Precio de venta (RD$) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.precioVenta}
                  onChange={(e) => handlePrecioChange("precioVenta", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Margen (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.margenGanancia}
                  onChange={(e) => setForm({ ...form, margenGanancia: e.target.value })}
                />
              </div>
            </div>

            {/* Fila 5: Stock */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Stock actual</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockActual}
                  onChange={(e) => setForm({ ...form, stockActual: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockMinimo}
                  onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Costo promedio (RD$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.costoPromedio}
                  onChange={(e) => setForm({ ...form, costoPromedio: e.target.value })}
                />
              </div>
            </div>

            {/* Fila 6: Código de barras / Ubicación */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Código de barras</Label>
                <Input
                  value={form.codigoBarras}
                  onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                  placeholder="7890000000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ubicación</Label>
                <Input
                  value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                  placeholder="Estante A-2"
                />
              </div>
            </div>

            {/* Proveedor */}
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select
                value={form.proveedorId || "none"}
                onValueChange={(v) => setForm({ ...form, proveedorId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((pv) => (
                    <SelectItem key={pv.id} value={pv.id}>
                      {pv.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción opcional del producto..."
              />
            </div>

            {/* Switches */}
            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="aplica-impuesto"
                  checked={form.aplicaImpuesto}
                  onCheckedChange={(v) => setForm({ ...form, aplicaImpuesto: v })}
                />
                <Label htmlFor="aplica-impuesto">Aplica impuesto (ITBIS)</Label>
                {form.aplicaImpuesto && (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="ml-2 w-24"
                    value={form.tasaImpuesto}
                    onChange={(e) => setForm({ ...form, tasaImpuesto: e.target.value })}
                    placeholder="18"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch id="activo" checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                <Label htmlFor="activo">Producto activo</Label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 border-t pt-2">
              <Button variant="outline" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Crear producto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
