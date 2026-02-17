"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Timer,
  AlertCircle,
  RefreshCw,
  Download,
  MoreVertical,
  Edit,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HistorialSesionesPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cajas, setCajas] = useState<any[]>([]);
  const [filterCaja, setFilterCaja] = useState("all");

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    montoApertura: "",
    montoCierre: "",
    observaciones: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const cajaParam = filterCaja !== "all" ? `&cajaId=${filterCaja}` : "";

      const [resHistory, resLookup] = await Promise.all([
        fetch(`/api/cajas/sesiones/history?limit=${pageSize}&offset=${offset}${cajaParam}`),
        fetch("/api/contabilidad/lookup"),
      ]);

      const dataHistory = await resHistory.json();
      const dataLookup = await resLookup.json();

      if (dataHistory.success) {
        setSessions(dataHistory.data);
        setTotalItems(dataHistory.pagination?.total || 0);
      }
      if (dataLookup.success) setCajas(dataLookup.data.cajas);
    } catch (error) {
      toast.error("Error al cargar el historial");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCaja, currentPage, pageSize]);

  const formatCurrency = (amount: any) => {
    const value = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "---";
    return format(new Date(dateString), "MMM dd, hh:mm a", { locale: es });
  };

  const handleEdit = (session: any) => {
    setEditingSession(session);
    setEditForm({
      montoApertura: session.montoApertura,
      montoCierre: session.montoCierre || "",
      observaciones: session.observaciones || "",
    });
    setIsEditDialogOpen(true);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/cajas/sesiones/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSession.id,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Sesión actualizada correctamente");
        setIsEditDialogOpen(false);
        fetchData();
      } else {
        toast.error(data.error || "Error al actualizar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      {/* Header */}
      <div className="border-primary/10 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 flex items-center gap-3 text-3xl font-bold tracking-tight underline underline-offset-8">
            <History className="text-primary h-8 w-8" />
            Historial de Turnos
          </h1>
          <p className="text-muted-foreground mt-2">Registro detallado de aperturas, cierres y movimientos de caja.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 gap-2 font-bold shadow-sm" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button
            variant="outline"
            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 h-10 gap-2 font-bold shadow-sm"
          >
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-l-primary border-l-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Sesiones Totales</CardTitle>
            <History className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Total Ingresos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {formatCurrency(sessions.reduce((acc, s) => acc + (s.totalIngresos || 0), 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Total Gastos</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              {formatCurrency(sessions.reduce((acc, s) => acc + (s.totalGastos || 0), 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Descuadre Neto</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">
              {formatCurrency(
                sessions.reduce((acc, s) => {
                  if (!s.montoCierre) return acc;
                  const esperado = parseFloat(s.montoApertura) + s.totalIngresos - s.totalGastos;
                  return acc + (parseFloat(s.montoCierre) - esperado);
                }, 0),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-muted border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Filter className="text-primary/70 h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                value={filterCaja}
                onValueChange={(val) => {
                  setFilterCaja(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-muted/30 border-primary/10 h-10 w-[200px] font-bold">
                  <SelectValue placeholder="Todas las cajas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold">
                    Todas las cajas
                  </SelectItem>
                  {cajas.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-medium">
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por usuario..."
                  className="bg-muted/30 border-primary/10 h-10 w-[300px] pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-foreground py-5 font-bold">Caja / Usuario</TableHead>
                  <TableHead className="text-foreground py-5 pr-0 font-bold">Apertura</TableHead>
                  <TableHead className="text-foreground py-5 pl-1 text-right font-bold">Ingresos</TableHead>
                  <TableHead className="text-foreground py-5 text-right font-bold">Gastos</TableHead>
                  <TableHead className="text-foreground py-5 text-right font-bold">Cierre Real</TableHead>
                  <TableHead className="text-foreground py-5 text-right font-bold">Diferencia</TableHead>
                  <TableHead className="text-foreground py-5 text-center font-bold">Estado</TableHead>
                  <TableHead className="text-foreground py-5 text-center font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={i} className="border-muted/50 animate-pulse border-b">
                      <TableCell colSpan={8} className="bg-muted/10 h-16" />
                    </TableRow>
                  ))
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground h-48 text-center font-medium">
                      No se encontraron sesiones registradas en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => {
                    const esperado = parseFloat(s.montoApertura) + s.totalIngresos - s.totalGastos;
                    const cierreReal = s.montoCierre ? parseFloat(s.montoCierre) : null;
                    const diferencia = cierreReal !== null ? cierreReal - esperado : 0;
                    const isShortage = diferencia < -0.01;
                    const isSurplus = diferencia > 0.01;

                    return (
                      <TableRow
                        key={s.id}
                        className="hover:bg-muted/30 border-muted/30 group border-b transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-foreground group-hover:text-primary font-black transition-colors">
                              {s.cajaNombre}
                            </span>
                            <span className="text-muted-foreground bg-muted/50 mt-1 w-fit rounded-sm px-1.5 text-[10px] font-bold tracking-wider uppercase">
                              {s.usuarioNombre}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pr-0">
                          <div className="flex flex-col">
                            <span className="text-foreground text-sm font-bold">{formatDate(s.fechaApertura)}</span>
                            <span className="text-[11px] font-black text-emerald-600">
                              +{formatCurrency(s.montoApertura)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pl-1 text-right">
                          <span className="font-bold text-emerald-600">+{formatCurrency(s.totalIngresos)}</span>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <span className="font-bold text-rose-600">-{formatCurrency(s.totalGastos)}</span>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-foreground text-sm font-bold">
                              {s.fechaCierre ? formatDate(s.fechaCierre) : "En proceso..."}
                            </span>
                            {s.montoCierre ? (
                              <span className="text-[11px] font-black text-rose-600">
                                {formatCurrency(s.montoCierre)} (Real)
                              </span>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                                <Timer className="h-3 w-3 animate-pulse text-amber-500" /> Pendiente
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex flex-col items-end">
                            {cierreReal !== null ? (
                              <>
                                <span
                                  className={cn(
                                    "text-sm font-black",
                                    isShortage ? "text-rose-600" : isSurplus ? "text-amber-600" : "text-emerald-600",
                                  )}
                                >
                                  {diferencia > 0.001 ? "+" : ""}
                                  {formatCurrency(diferencia)}
                                </span>
                                <div className="mt-1 flex items-center gap-1">
                                  {Math.abs(diferencia) > 0.01 ? (
                                    <>
                                      <AlertCircle
                                        className={cn("h-3 w-3", isShortage ? "text-rose-500" : "text-amber-500")}
                                      />
                                      <span className="text-[9px] font-black tracking-tighter uppercase">
                                        Descuadre
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      <span className="text-[9px] font-black tracking-tighter text-emerald-500 uppercase">
                                        Cuadrado
                                      </span>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-primary/70 text-sm font-bold">{formatCurrency(esperado)}</span>
                                <span className="text-muted-foreground mt-1 text-[9px] font-black tracking-tighter uppercase">
                                  Esperado
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          {s.estado === "abierta" ? (
                            <Badge className="animate-pulse border-none bg-emerald-500 px-3 font-black text-white hover:bg-emerald-600">
                              ABIERTA
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-muted px-3 font-black">
                              CERRADA
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(s)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar Datos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(`/dashboard/cajas-chicas/reporte/${s.id}`, "_blank")}
                              >
                                <Download className="mr-2 h-4 w-4" /> Descargar Reporte
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="border-muted bg-muted/10 flex items-center justify-between border-t px-6 py-4">
            <div className="text-muted-foreground text-sm font-medium">
              Mostrando <span className="text-foreground font-bold">{(currentPage - 1) * pageSize + 1}</span> a{" "}
              <span className="text-foreground font-bold">{Math.min(currentPage * pageSize, totalItems)}</span> de{" "}
              <span className="text-foreground font-bold">{totalItems}</span> registros
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">Filas por página:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(parseInt(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="border-muted h-8 w-[70px] bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-bold">
                  Página <span className="text-primary">{currentPage}</span> de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Edit className="text-primary h-5 w-5" /> Editar Registro de Turno
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Ajuste los montos de apertura, cierre u observaciones de la sesión.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="montoApertura" className="font-bold">
                Monto Apertura (Inicial)
              </Label>
              <Input
                id="montoApertura"
                type="number"
                value={editForm.montoApertura}
                onChange={(e) => setEditForm((prev) => ({ ...prev, montoApertura: e.target.value }))}
                className="bg-muted/20 font-bold text-emerald-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="montoCierre" className="font-bold">
                Monto Cierre (Físico)
              </Label>
              <Input
                id="montoCierre"
                type="number"
                value={editForm.montoCierre}
                onChange={(e) => setEditForm((prev) => ({ ...prev, montoCierre: e.target.value }))}
                className="bg-muted/20 font-bold text-rose-600"
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observaciones" className="font-bold">
                Observaciones
              </Label>
              <Textarea
                id="observaciones"
                value={editForm.observaciones}
                onChange={(e) => setEditForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                className="bg-muted/20 min-h-[100px] font-medium"
                placeholder="Notas sobre el turno o descuadres..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-11 font-bold">
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={isSaving} className="bg-primary h-11 gap-2 font-bold text-white">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
