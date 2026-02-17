"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Info,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MoreVertical,
  BadgeCheck,
  UserMinus,
  FileText,
  Wrench,
  Clock,
  History,
  Calendar,
  Target,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

export default function InactiveClientesPage() {
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
      // Filter only inactive, suspended or canceled
      const inactiveOnly = data.filter((c: Cliente) => ["inactivo", "cancelado", "suspendido"].includes(c.estado));
      setClientes(inactiveOnly);
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
        toast.success(`Cliente ${nuevoEstado === "activo" ? "habilitado" : "actualizado"}`);
        fetchClientes(); // Refresh list to reflect changes in filter
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
    total: clientes.length,
    inactive: clientes.filter((c) => c.estado === "inactivo").length,
    suspended: clientes.filter((c) => c.estado === "suspendido").length,
    canceled: clientes.filter((c) => c.estado === "cancelado").length,
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight text-orange-600 underline underline-offset-8">
            Clientes Inactivos
          </h1>
          <p className="text-muted-foreground mt-2">
            Visión focalizada en clientes fuera de servicio, suspendidos o retirados.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = "/dashboard/clientes/listado";
          }}
        >
          <Users className="h-5 w-5" />
          Volver al Listado General
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-gray-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Inactivos</CardTitle>
            <UserMinus className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Suspendidos</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.suspended}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">Cancelados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.canceled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
        <CardHeader className="bg-muted/5 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-500/10 p-2">
              <UserMinus className="h-5 w-5 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Expedientes Inactivos</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ver Todos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
                <SelectItem value="suspendido">Suspendidos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar cliente..."
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
                    No se encontraron clientes inactivos.
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
                      {c.estado === "cancelado" ? (
                        <Badge
                          variant="destructive"
                          className="h-5 border-red-200/50 bg-red-500/10 text-[10px] text-red-600 shadow-none transition-none"
                        >
                          Cancelado
                        </Badge>
                      ) : c.estado === "suspendido" ? (
                        <Badge className="h-5 border-amber-200/50 bg-amber-500/10 text-[10px] text-amber-600 shadow-none transition-none">
                          Suspendido
                        </Badge>
                      ) : (
                        <Badge className="h-5 border-gray-200/50 bg-gray-500/10 text-[10px] text-gray-600 shadow-none transition-none">
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
                          className={`h-8 w-8 text-emerald-500 hover:bg-emerald-50`}
                          onClick={(e) => toggleStatus(c, e)}
                          title="Reactivar Cliente"
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => deleteCliente(c.id, e)}
                          title="Eliminar Permanente"
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

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="flex h-[90vh] flex-col overflow-hidden rounded-xl border-none p-0 shadow-2xl sm:max-w-[480px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Expediente del Cliente</DialogTitle>
            <DialogDescription>
              Información detallada sobre el perfil, facturación y servicios del cliente.
            </DialogDescription>
          </DialogHeader>

          {isFetchingDetail ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <RefreshCw className="text-primary h-10 w-10 animate-spin" />
              <p className="text-muted-foreground font-medium">Obteniendo expediente del cliente...</p>
            </div>
          ) : detailClient ? (
            <>
              <div className="bg-primary/95 relative overflow-hidden px-8 pt-8 pb-12">
                <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-10">
                  <Users className="h-48 w-48 text-white" />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                  <div className="flex h-24 w-24 rotate-3 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-4xl font-bold text-white shadow-2xl backdrop-blur-xl transition-transform group-hover:rotate-0">
                    {detailClient.client.fotoUrl ? (
                      <img
                        src={detailClient.client.fotoUrl}
                        alt={`${detailClient.client.nombre} ${detailClient.client.apellidos}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {detailClient.client.nombre[0]}
                        {detailClient.client.apellidos[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl leading-tight font-bold tracking-tight text-white">
                      {detailClient.client.nombre} {detailClient.client.apellidos}
                    </h2>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Badge className="h-5 border-white/20 bg-white/20 px-2 py-0 text-[10px] font-bold text-white backdrop-blur-md">
                        ID: {detailClient.client.codigoCliente}
                      </Badge>
                      <Badge
                        className={`h-5 border-none px-2 py-0 text-[10px] font-bold ${detailClient.client.estado === "activo" ? "bg-emerald-400 text-emerald-950" : "bg-red-400 text-red-950"}`}
                      >
                        {detailClient.client.estado.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="info" className="flex flex-1 flex-col">
                <TabsList className="bg-background h-14 w-full justify-start gap-8 rounded-none border-b px-8">
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                  >
                    <Info className="h-4 w-4" /> Información
                  </TabsTrigger>
                  <TabsTrigger
                    value="facturas"
                    className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                  >
                    <FileText className="h-4 w-4" /> Facturas
                    {detailClient.invoices.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary ml-1 h-5 min-w-[20px] justify-center border-none px-1.5"
                      >
                        {detailClient.invoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="averias"
                    className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                  >
                    <Wrench className="h-4 w-4" /> Averías
                    {detailClient.tickets.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary ml-1 h-5 min-w-[20px] justify-center border-none px-1.5"
                      >
                        {detailClient.tickets.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="bg-muted/5 flex-1 overflow-y-auto p-6">
                  <TabsContent
                    value="info"
                    className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6 duration-300"
                  >
                    <div className="space-y-6">
                      {/* Identidad */}
                      <div className="space-y-4">
                        <h3 className="text-primary/60 flex items-center gap-2 px-1 text-[11px] font-black tracking-[0.2em] uppercase">
                          Identidad y Clasificación
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <Card className="bg-background ring-border/50 border-none shadow-none ring-1">
                            <CardContent className="space-y-4 p-4">
                              <div className="border-muted/50 flex items-center justify-between border-b py-1">
                                <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                  Cédula / RNC
                                </Label>
                                <p className="text-foreground text-sm font-bold">
                                  {detailClient.client.cedula || "N/A"}
                                </p>
                              </div>
                              <div className="border-muted/50 flex items-center justify-between border-b py-1">
                                <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                  Categoría
                                </Label>
                                <p className="text-foreground text-sm font-bold capitalize">
                                  {detailClient.client.categoriaCliente}
                                </p>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                  Tipo Cliente
                                </Label>
                                <p className="text-foreground text-sm font-bold capitalize">
                                  {detailClient.client.tipoCliente}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Contacto */}
                      <div className="space-y-4">
                        <h3 className="text-primary/60 flex items-center gap-2 px-1 text-[11px] font-black tracking-[0.2em] uppercase">
                          Vías de Comunicación
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                              <Phone className="h-5 w-5" />
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                                Teléfono Principal
                              </Label>
                              <p className="text-foreground text-sm font-bold">
                                {detailClient.client.telefono || "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden">
                              <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                                Email de Contacto
                              </Label>
                              <p className="text-foreground truncate text-sm font-bold">
                                {detailClient.client.email || "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                                Ubicación
                              </Label>
                              <p className="text-foreground text-sm font-bold">
                                {detailClient.client.direccion || "Sin dirección"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Card className="bg-primary/5 ring-primary/10 border-none ring-1">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="text-primary/70 h-5 w-5" />
                          <div>
                            <p className="text-primary/70 text-[10px] font-bold tracking-widest uppercase">
                              Miembro desde
                            </p>
                            <p className="text-foreground text-sm font-bold">
                              {new Date(detailClient.client.createdAt).toLocaleDateString("es-DO", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <History className="text-primary/5 h-8 w-8" />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="facturas" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                    {detailClient.invoices.length === 0 ? (
                      <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-4 py-20">
                        <div className="bg-muted/20 rounded-full p-4">
                          <FileText className="h-12 w-12" />
                        </div>
                        <p className="text-sm font-bold">No se registra actividad financiera reciente.</p>
                      </div>
                    ) : (
                      <Card className="ring-border/50 overflow-hidden border-none shadow-sm ring-1">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="text-muted-foreground text-xs font-bold uppercase">
                                Factura
                              </TableHead>
                              <TableHead className="text-muted-foreground text-xs font-bold uppercase">Fecha</TableHead>
                              <TableHead className="text-muted-foreground text-xs font-bold uppercase">
                                Importe
                              </TableHead>
                              <TableHead className="text-muted-foreground text-xs font-bold uppercase">
                                Estado
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailClient.invoices.map((inv) => (
                              <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="text-primary font-mono text-xs font-bold">
                                  {inv.numeroFactura}
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  {new Date(inv.fechaFactura).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-foreground text-xs font-bold">
                                  RD$ {parseFloat(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`h-5 border-none py-0 text-[9px] font-bold shadow-none ${
                                      inv.estado === "paga"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : inv.estado === "pendiente"
                                          ? "bg-red-500/10 text-red-600"
                                          : "bg-gray-500/10 text-gray-600"
                                    }`}
                                  >
                                    {inv.estado.toUpperCase()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="averias" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                    {detailClient.tickets.length === 0 ? (
                      <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-4 py-20">
                        <div className="bg-muted/20 rounded-full p-4">
                          <Wrench className="h-12 w-12" />
                        </div>
                        <p className="text-sm font-bold">Sin reportes de averías o tickets técnicos.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {detailClient.tickets.map((t) => (
                          <Card
                            key={t.id}
                            className="ring-border/60 hover:ring-primary/20 group border-none shadow-sm ring-1 transition-all"
                          >
                            <CardContent className="p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="bg-muted ring-border/50 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ring-1">
                                    {t.numeroTicket}
                                  </span>
                                  <Badge
                                    className={`h-5 border-none text-[9px] font-bold shadow-none ${
                                      t.estado === "abierto"
                                        ? "bg-red-500/10 text-red-600"
                                        : t.estado === "proceso"
                                          ? "bg-amber-500/10 text-amber-600"
                                          : "bg-emerald-500/10 text-emerald-600"
                                    }`}
                                  >
                                    {t.estado === "abierto"
                                      ? "REPORTADA"
                                      : t.estado === "cerrado"
                                        ? "SOLUCIONADA"
                                        : "PROCESANDO"}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold opacity-70">
                                  <Clock className="h-3.5 w-3.5" /> {new Date(t.fechaCreacion).toLocaleDateString()}
                                </div>
                              </div>
                              <h4 className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                                {t.asunto}
                              </h4>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-widest uppercase ${
                                    t.prioridad === "alta"
                                      ? "bg-red-100 text-red-600"
                                      : t.prioridad === "media"
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-blue-100 text-blue-600"
                                  }`}
                                >
                                  Prioridad {t.prioridad}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:bg-primary/5 h-7 px-2 text-[10px] font-bold uppercase"
                                >
                                  Ver Informe
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="bg-background flex flex-col items-center justify-between gap-4 border-t p-6 sm:flex-row">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:bg-muted/50 text-xs font-bold tracking-widest uppercase"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Cerrar Expediente
                </Button>
                <Button
                  className="shadow-primary/20 gap-2 px-8 font-bold shadow-xl"
                  onClick={(e) => toggleStatus(detailClient.client, e as any)}
                >
                  <BadgeCheck className="h-4 w-4" /> Reactivar Cliente
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-xs text-orange-800 shadow-sm">
        <Info className="h-5 w-5 shrink-0 text-orange-600" />
        <p>
          <strong>Nota:</strong> Esta vista solo muestra clientes en estado{" "}
          <strong>Inactivo, Suspendido o Cancelado</strong>. Para ver todos los clientes o registrarlos, diríjase al
          listado general.
        </p>
      </div>
    </div>
  );
}
