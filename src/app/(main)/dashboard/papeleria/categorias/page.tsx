"use client";

import React, { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Edit, Plus, RefreshCw, Search, Trash } from "lucide-react";
import { toast } from "sonner";

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
type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
};

type FormData = {
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  orden: string;
  activo: boolean;
};

const formVacio = (): FormData => ({
  nombre: "",
  descripcion: "",
  color: "#6366f1",
  icono: "📦",
  orden: "0",
  activo: true,
});

const COLORES = [
  "#ef4444", // rojo
  "#f97316", // naranja
  "#eab308", // amarillo
  "#22c55e", // verde
  "#3b82f6", // azul
  "#8b5cf6", // púrpura
  "#ec4899", // rosa
  "#6366f1", // índigo
  "#06b6d4", // cyan
  "#14b8a6", // teal
];

// ────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────
export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("TODOS");

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(formVacio());

  // ── Fetch ────────────────────────────────────────────
  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/papeleria/categorias?todos=true");
      const data = (await res.json()) as { success: boolean; data?: Categoria[]; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "No se pudo cargar");
      setCategorias((data.data ?? []).map((c) => ({ ...c, id: Number(c.id) })));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error cargando categorías";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // ── Filtrado + Paginación ────────────────────────────
  const categoriasFiltradas = useMemo(() => {
    let r = [...categorias].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
    const q = busqueda.trim().toLowerCase();
    if (q) {
      r = r.filter((c) => c.nombre.toLowerCase().includes(q) || (c.descripcion ?? "").toLowerCase().includes(q));
    }
    if (filtroActivo === "ACTIVAS") r = r.filter((c) => c.activo);
    if (filtroActivo === "INACTIVAS") r = r.filter((c) => !c.activo);
    return r;
  }, [categorias, busqueda, filtroActivo]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroActivo, porPagina]);

  const totalPaginas = Math.max(1, Math.ceil(categoriasFiltradas.length / porPagina));
  const categoriasPaginadas = categoriasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // ── Abrir modal ──────────────────────────────────────
  const abrirNuevo = () => {
    setEditId(null);
    setForm(formVacio());
    setModalAbierto(true);
  };

  const abrirEdicion = (c: Categoria) => {
    setEditId(c.id);
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion ?? "",
      color: c.color ?? "#6366f1",
      icono: c.icono ?? "📦",
      orden: String(c.orden),
      activo: c.activo,
    });
    setModalAbierto(true);
  };

  // ── Guardar ──────────────────────────────────────────
  const guardarCategoria = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/papeleria/categorias", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as { success: boolean; data?: Categoria; error?: string };
  };

  const buildPayload = () => ({
    ...(editId ? { id: editId } : {}),
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null,
    color: form.color,
    icono: form.icono || null,
    orden: parseInt(form.orden) || 0,
    activo: form.activo,
  });

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("Ingresa el nombre de la categoría");
      return;
    }

    setGuardando(true);
    try {
      const payload = buildPayload();
      const data = await guardarCategoria(payload);
      if (!data.success) throw new Error(data.error ?? "Error guardando");
      toast.success(editId ? "Categoría actualizada" : "Categoría creada");
      setModalAbierto(false);
      fetchCategorias();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error guardando categoría";
      toast.error(message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ────────────────────────────────────────
  const eliminar = async (c: Categoria) => {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch("/api/papeleria/categorias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Error");
      toast.success("Categoría eliminada");
      fetchCategorias();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error eliminando categoría";
      toast.error(message);
    }
  };

  // ── Toggle activo ────────────────────────────────────
  const toggleActivo = async (c: Categoria) => {
    try {
      const res = await fetch("/api/papeleria/categorias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, activo: !c.activo }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Error");
      toast.success(c.activo ? "Categoría desactivada" : "Categoría activada");
      fetchCategorias();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    }
  };

  // ────────────────────────────────────────────────────
  // Render de acciones
  // ────────────────────────────────────────────────────
  const renderAcciones = (c: Categoria) => (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => abrirEdicion(c)}>
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={c.activo ? "text-blue-600" : "text-green-600"}
              onClick={() => toggleActivo(c)}
            >
              {c.activo ? "✕" : "✓"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{c.activo ? "Desactivar" : "Activar"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => eliminar(c)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Eliminar</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  // ────────────────────────────────────────────────────
  // Render de fila
  // ────────────────────────────────────────────────────
  const renderFilaCategoria = (c: Categoria) => (
    <TableRow key={c.id} className={!c.activo ? "opacity-50" : ""}>
      <TableCell className="text-2xl">{c.icono ?? "📦"}</TableCell>
      <TableCell className="font-medium">{c.nombre}</TableCell>
      <TableCell className="muted-foreground text-sm">{c.descripcion ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border" style={{ backgroundColor: c.color ?? "#6366f1" }} />
          <span className="font-mono text-xs">{(c.color ?? "#6366f1").slice(1)}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">{c.orden}</TableCell>
      <TableCell className="text-center">
        <span className={`text-xs font-semibold ${c.activo ? "text-green-600" : "text-gray-400"}`}>
          {c.activo ? "✓" : "✕"}
        </span>
      </TableCell>
      <TableCell className="text-right">{renderAcciones(c)}</TableCell>
    </TableRow>
  );

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Categorías de Papelería</CardTitle>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={fetchCategorias}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refrescar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={abrirNuevo}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva categoría
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <div className="relative col-span-2 md:col-span-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroActivo} onValueChange={setFiltroActivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                <SelectItem value="ACTIVAS">Activas</SelectItem>
                <SelectItem value="INACTIVAS">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => `skeleton-${i + 1}`).map((key) => (
                <Skeleton key={key} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Icono</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-24">Color</TableHead>
                  <TableHead className="w-12 text-center">Orden</TableHead>
                  <TableHead className="w-20 text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriasPaginadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="muted-foreground py-8 text-center">
                      No hay categorías registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  categoriasPaginadas.map(renderFilaCategoria)
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
                    {[5, 10, 25, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  {categoriasFiltradas.length === 0
                    ? "0 resultados"
                    : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, categoriasFiltradas.length)} de ${categoriasFiltradas.length}`}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              {editId ? "Modifica los datos de la categoría." : "Crea una nueva categoría de productos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Libros, Cuadernos, Bolígrafos..."
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción opcional de la categoría..."
              />
            </div>

            {/* Icono / Orden */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Icono (emoji)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.icono}
                    onChange={(e) => setForm({ ...form, icono: e.target.value })}
                    placeholder="📦"
                    maxLength={2}
                    className="flex-1"
                  />
                  <div className="flex items-center text-3xl">{form.icono || "📦"}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {COLORES.map((col) => (
                  <button
                    key={col}
                    className={`h-10 w-10 rounded border-2 transition ${
                      form.color === col ? "scale-110 border-black" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: col }}
                    onClick={() => setForm({ ...form, color: col })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch id="activo" checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
              <Label htmlFor="activo">Categoría activa</Label>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 border-t pt-2">
              <Button variant="outline" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Crear categoría"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
