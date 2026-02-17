"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import {
  Users,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  UserMinus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Lazy load de modales para reducir bundle inicial
const ClientDetailModal = lazy(() => 
  import("./_components/client-detail-modal").then(mod => ({ default: mod.ClientDetailModal }))
);
const ClientEditModal = lazy(() => 
  import("./_components/client-edit-modal").then(mod => ({ default: mod.ClientEditModal }))
);

interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: string;
  tipoCliente: string;
  categoriaCliente: string;
  fotoUrl: string | null;
  createdAt: string;
}

interface Factura {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  total: string;
  estado: string;
}

interface Ticket {
  id: string;
  numeroTicket: string;
  asunto: string;
  fechaCreacion: string;
  estado: string;
  prioridad: string;
}

const ITEMS_PER_PAGE = 10;

export default function ClientesListPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [detailClient, setDetailClient] = useState<{
    client: Cliente;
    invoices: Factura[];
    tickets: Ticket[];
  } | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    estado: "activo",
  });

  const fetchClientes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.error) {
        toast.error("Error: " + data.error);
        return;
      }
      setClientes(data);
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientDetail = async (id: string) => {
    setIsFetchingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();
      if (data.success) {
        setDetailClient(data);
      } else {
        toast.error(data.error || "No se pudo cargar el detalle");
        setIsDetailModalOpen(false);
      }
    } catch (error) {
      toast.error("Error al obtener detalles");
      setIsDetailModalOpen(false);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const toggleStatus = async (cliente: Cliente, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nuevoEstado = cliente.estado === "activo" ? "inactivo" : "activo";
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cliente ${nuevoEstado === "activo" ? "habilitado" : "inhabilitado"}`);
        setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, estado: nuevoEstado } : c)));
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  const deleteCliente = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente permanentemente?")) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Cliente eliminado");
        fetchClientes();
      }
    } catch (error) {
      toast.error("Error al eliminar cliente");
    }
  };

  const handleEdit = (cliente: Cliente, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      estado: cliente.estado,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clientes/${editingCliente?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Datos actualizados");
        setIsEditModalOpen(false);
        fetchClientes();
      }
    } catch (error) {
      toast.error("Error al guardar cambios");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFromDetail = (client: Cliente) => {
    setEditingCliente(client);
    setFormData({
      nombre: client.nombre,
      apellidos: client.apellidos,
      email: client.email || "",
      telefono: client.telefono || "",
      direccion: client.direccion || "",
      estado: client.estado,
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = clientes
    .filter((c) => {
      const matchesSearch =
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.estado === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const nameA = `${a.nombre} ${a.apellidos}`.toLowerCase();
      const nameB = `${b.nombre} ${b.apellidos}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredClientes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = {
    total: clientes.filter((c) => c.estado === "activo").length,
    active: clientes.filter((c) => c.estado === "activo").length,
    inactive: clientes.filter((c) => ["inactivo", "cancelado", "suspendido"].includes(c.estado)).length,
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
            Directorio de Clientes
          </h1>
          <p className="text-muted-foreground mt-2">Administra la base de datos de clientes y su estado operativo.</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shadow-primary/20 gap-2 text-white shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = "/dashboard/clientes/crear";
          }}
        >
          <UserPlus className="h-5 w-5" />
          Registrar Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Activos</CardTitle>
            <BadgeCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Inactivos</CardTitle>
            <UserMinus className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
        <CardHeader className="bg-muted/5 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Users className="text-primary h-5 w-5" />
            </div>
            <CardTitle className="text-xl">Listado Maestro</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o código..."
                className="h-9 pl-9"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                fetchClientes();
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[220px] font-bold">Cliente</TableHead>
                <TableHead className="w-[280px] font-bold">Contacto</TableHead>
                <TableHead className="font-bold">Ubicación</TableHead>
                <TableHead className="w-[100px] font-bold">Estado</TableHead>
                <TableHead className="w-[160px] text-center font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center">
                    Cargando información...
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-20 text-center italic">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-primary/5 group cursor-pointer transition-colors"
                    onClick={() => fetchClientDetail(c.id)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground text-sm font-bold">
                          {c.nombre} {c.apellidos}
                        </span>
                        <span className="text-primary/70 font-mono text-[10px] font-bold tracking-tight uppercase">
                          {c.codigoCliente}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Phone className="text-primary/60 h-3 w-3 shrink-0" /> {c.telefono || "N/A"}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Mail className="text-primary/60 h-3 w-3 shrink-0" /> {c.email || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate px-4 py-3 text-xs italic">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="text-primary/60 h-3 w-3 shrink-0" /> {c.direccion || "No registrada"}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {c.estado === "activo" ? (
                        <Badge className="h-5 border-emerald-200/50 bg-emerald-500/10 text-[10px] text-emerald-600 shadow-none transition-none hover:bg-emerald-500/20">
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="h-5 border-red-200/50 bg-red-500/10 text-[10px] text-red-600 shadow-none transition-none hover:bg-red-500/20"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                          onClick={() => fetchClientDetail(c.id)}
                          title="Ver expediente"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={(e) => handleEdit(c, e)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${c.estado === "activo" ? "text-orange-500 hover:bg-orange-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                          onClick={(e) => toggleStatus(c, e)}
                          title={c.estado === "activo" ? "Inhabilitar" : "Habilitar"}
                        >
                          {c.estado === "activo" ? (
                            <UserMinus className="h-4 w-4" />
                          ) : (
                            <BadgeCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => deleteCliente(c.id, e)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="bg-muted/5 flex items-center justify-between border-t px-6 py-4">
            <span className="text-muted-foreground text-xs font-medium">
              Mostrando página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-bold"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-bold"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lazy-loaded Modals */}
      <Suspense fallback={null}>
        {isDetailModalOpen && (
          <ClientDetailModal
            isOpen={isDetailModalOpen}
            onOpenChange={setIsDetailModalOpen}
            isFetching={isFetchingDetail}
            detailClient={detailClient}
            onEdit={handleEditFromDetail}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isEditModalOpen && (
          <ClientEditModal
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            isSubmitting={isSubmitting}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
          />
        )}
      </Suspense>

      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 shadow-sm">
        <Info className="h-5 w-5 shrink-0 text-blue-600" />
        <p>
          <strong>Tip:</strong> Haz clic en cualquier fila para ver el <strong>expediente completo</strong> del cliente,
          incluyendo sus facturas recientes y reportes técnicos de averías.
        </p>
      </div>
    </div>
  );
}
