"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import {
  Layers,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  WifiHigh,
  DollarSign,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Lazy load de modales
const PlanFormModal = lazy(() =>
  import("./_components/plan-form-modal").then((mod) => ({ default: mod.PlanFormModal }))
);

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  categoriaNombre: string | null;
  precio: string;
  moneda: string;
  subidaKbps: number;
  bajadaMbps: number;
  detalles: any;
  activo: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

const formatCurrency = (value: string | number, currency: string = "DOP") => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-DO", { 
    style: "currency", 
    currency: currency 
  }).format(num);
};

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchPlanes = async () => {
    setIsLoading(true);
    try {
      const includeInactive = statusFilter === "all" ? "true" : "false";
      const res = await fetch(
        `/api/planes?page=${currentPage}&limit=${ITEMS_PER_PAGE}&includeInactive=${includeInactive}`
      );
      const data = await res.json();

      if (data.success) {
        const items = data.data?.data || data.data?.items || [];
        const pagination = data.data?.pagination || {};
        setPlanes(items);
        setTotalPages(pagination.totalPages || data.data?.totalPages || 1);
        setTotalItems(pagination.total || data.data?.total || 0);
      } else {
        toast.error(data.error || "Error al cargar planes");
        setPlanes([]);
      }
    } catch (error) {
      toast.error("Error de conexión");
      setPlanes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, [currentPage, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este plan?")) return;

    try {
      const res = await fetch(`/api/planes/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Plan eliminado exitosamente");
        fetchPlanes();
      } else {
        toast.error(data.error || "Error al eliminar plan");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setIsFormModalOpen(true);
  };

  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setEditingPlan(null);
    fetchPlanes();
  };

  // Filtrar planes por búsqueda - con protección contra undefined
  const filteredPlanes = (planes || []).filter((plan) => {
    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase();
    const nombre = plan.nombre.toLowerCase();
    const categoria = plan.categoriaNombre?.toLowerCase() || "";
    const precio = plan.precio.toString();

    return nombre.includes(query) || categoria.includes(query) || precio.includes(query);
  });

  // Calcular estadísticas con protección
  const activePlanes = (planes || []).filter((p) => p.activo).length;
  const inactivePlanes = (planes || []).filter((p) => !p.activo).length;
  const averagePrice = planes.length > 0
    ? planes.reduce((acc, p) => acc + parseFloat(p.precio), 0) / planes.length
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold tracking-tight">
              Planes de Internet
            </h1>
            <p className="text-muted-foreground mt-1">Gestiona los planes de servicio disponibles</p>
          </div>
        </div>
        <Button onClick={handleCreate} className="h-11 gap-2 px-6 text-sm font-bold shadow-md">
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Planes</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-green-100 text-green-600 flex h-12 w-12 items-center justify-center rounded-xl">
              <WifiHigh className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Activos</p>
              <p className="text-2xl font-bold">{activePlanes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-red-100 text-red-600 flex h-12 w-12 items-center justify-center rounded-xl">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Inactivos</p>
              <p className="text-2xl font-bold">{inactivePlanes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-blue-100 text-blue-600 flex h-12 w-12 items-center justify-center rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Precio Promedio</p>
              <p className="text-2xl font-bold">
                {formatCurrency(averagePrice)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nombre, categoría o precio..."
                className="h-10 bg-slate-50 pl-9 dark:bg-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="active">Solo activos</SelectItem>
                  <SelectItem value="inactive">Solo inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchPlanes} className="h-10 w-10">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-slate-50/30 p-6 pb-4">
          <CardTitle className="flex items-center justify-between text-base font-bold">
            <span className="flex items-center gap-2">
              <Filter className="text-primary h-4 w-4" /> Lista de Planes
            </span>
            <Badge variant="secondary" className="text-xs font-bold">
              {filteredPlanes.length} DE {planes.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-muted-foreground animate-pulse py-12 text-center">Cargando planes...</div>
          ) : filteredPlanes.length === 0 ? (
            <div className="space-y-3 py-12 text-center opacity-40">
              <Layers className="mx-auto h-10 w-10 text-slate-400" />
              <p className="text-muted-foreground text-sm font-medium">
                {searchTerm ? "No se encontraron resultados" : "No hay planes registrados"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead className="font-bold">Plan</TableHead>
                      <TableHead className="font-bold">Categoría</TableHead>
                      <TableHead className="font-bold">Velocidad</TableHead>
                      <TableHead className="font-bold">Precio</TableHead>
                      <TableHead className="font-bold">Estado</TableHead>  
                      <TableHead className="text-right font-bold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlanes.map((plan) => (
                      <TableRow key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 dark:text-white">{plan.nombre}</div>
                            {plan.descripcion && (
                              <div className="text-muted-foreground text-xs line-clamp-1">
                                {plan.descripcion}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {plan.categoriaNombre || "Sin categoría"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-xs">↓</span>
                              <span className="font-semibold">{plan.bajadaMbps} Mbps</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-xs">↑</span>
                              <span className="text-muted-foreground text-xs">
                                {plan.subidaKbps} Kbps
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(plan.precio, plan.moneda)}
                          </div>
                          <div className="text-muted-foreground text-xs">por mes</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={plan.activo ? "default" : "secondary"}
                            className={cn(
                              "text-xs font-bold",
                              plan.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}
                          >
                            {plan.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(plan)}
                              className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(plan.id)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-muted-foreground text-sm">
                  Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} a{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems} planes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    Página <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> de{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Suspense fallback={<div>Cargando...</div>}>
        {isFormModalOpen && <PlanFormModal isOpen={isFormModalOpen} onClose={handleModalClose} plan={editingPlan} />}
      </Suspense>
    </div>
  );
}
