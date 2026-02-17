"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Key,
  UserCheck,
  Clock,
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
import { toast } from "sonner";

interface Role {
  id: string;
  nombreRol: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  _count?: {
    usuariosRoles_rolId: number;
  };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    nombreRol: "",
    descripcion: "",
  });

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();

      if (data.error) {
        toast.error("Error: " + data.error);
        return;
      }

      // Handle paginated response from API
      const rolesData = data.data?.data || data.data || data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error(error);
      toast.error("Error al conectar con la base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este rol? Esta acción podría afectar a los usuarios asociados."))
      return;

    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Rol eliminado correctamente");
        fetchRoles();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const toggleStatus = async (role: Role) => {
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !role.activo }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Rol ${!role.activo ? "activado" : "desactivado"}`);
        fetchRoles();
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success || !data.error) {
        toast.success(editingRole ? "Rol actualizado" : "Rol creado correctamente");
        setIsModalOpen(false);
        setEditingRole(null);
        setFormData({ nombreRol: "", descripcion: "" });
        fetchRoles();
      } else {
        toast.error(data.error || "Error al procesar la solicitud");
      }
    } catch (error) {
      toast.error("Error de comunicación con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      nombreRol: role.nombreRol,
      descripcion: role.descripcion || "",
    });
    setIsModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingRole(null);
      setFormData({ nombreRol: "", descripcion: "" });
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = roles.filter(
    (role) =>
      role.nombreRol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.descripcion?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: roles.length,
    active: roles.filter((r) => r.activo).length,
    inactive: roles.filter((r) => !r.activo).length,
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground mt-1">Define los niveles de acceso y permisos para los usuarios.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-primary/20 h-11 gap-2 px-6 text-white shadow-lg">
              <Plus className="h-5 w-5" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingRole ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
                <DialogDescription>
                  {editingRole
                    ? "Modifica los detalles del rol seleccionado."
                    : "Define un nuevo rol para asignar a los usuarios."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombreRol" className="text-right text-sm">
                    Nombre
                  </Label>
                  <Input
                    id="nombreRol"
                    className="col-span-3 h-9"
                    required
                    placeholder="Ej: Administrador"
                    value={formData.nombreRol}
                    onChange={(e) => setFormData({ ...formData, nombreRol: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="descripcion" className="text-right text-sm">
                    Descripción
                  </Label>
                  <Input
                    id="descripcion"
                    className="col-span-3 h-9"
                    placeholder="Descripción breve"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="h-10">
                  {isSubmitting ? "Guardando..." : editingRole ? "Actualizar Rol" : "Crear Rol"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">Configurados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-muted-foreground mt-1 text-xs">Disponibles para asignar</p>
          </CardContent>
        </Card>

        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <p className="text-muted-foreground mt-1 text-xs">Deshabilitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="ring-border/60 border-none shadow-md ring-1">
        <CardHeader className="mb-6 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <CardTitle className="text-xl">Listado de Roles</CardTitle>
            <CardDescription>Visualiza los roles definidos para los usuarios.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar roles..."
                className="h-9 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={fetchRoles}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nombre del Rol</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 font-medium">
                        <RefreshCw className="text-primary h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-sm">Cargando roles...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-20 text-center">
                      No se encontraron roles.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/50 group transition-colors">
                      <TableCell className="font-semibold">{role.nombreRol}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{role.descripcion || "-"}</TableCell>
                      <TableCell>
                        {role.activo ? (
                          <Badge
                            variant="outline"
                            className="h-5 border-green-200 bg-green-100 text-[10px] text-green-700 hover:bg-green-100"
                          >
                            Activo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-5 border-red-200 bg-red-50 text-[10px] text-red-700 hover:bg-red-50"
                          >
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                            onClick={() => openEditModal(role)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                            onClick={() => toggleStatus(role)}
                            title={role.activo ? "Desactivar" : "Activar"}
                          >
                            {role.activo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 border-primary/10 flex items-center gap-4 rounded-lg border p-4 text-xs opacity-90">
        <Lock className="text-primary h-5 w-5 shrink-0" />
        <p>
          <strong>Seguridad:</strong> Los roles definen qué partes del sistema pueden ver o modificar los usuarios.
          Asegúrate de asignar roles con precaución para mantener la integridad de los datos.
        </p>
      </div>
    </div>
  );
}
