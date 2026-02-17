"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  RefreshCw,
  List as ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface User {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  avatar: string | null;
  activo: boolean;
  rol: string;
  rolId: string | null;
  ultimoAcceso: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  nombreRol: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    rolId: "",
  });

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (!data.error) {
        const rolesData = data.data?.data || data.data || data || [];
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      if (data.error) {
        toast.error("Error: " + data.error);
        return;
      }

      // Handle paginated response from API
      const usersData = data.data?.data || data.data || data || [];
      const validatedUsers: User[] = (Array.isArray(usersData) ? usersData : []).map((u: any) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        telefono: u.telefono,
        avatar: u.avatar,
        activo: u.activo,
        rol: u.usuariosRoles_usuarioId?.[0]?.role?.nombreRol || "Sin Rol",
        rolId: u.usuariosRoles_usuarioId?.[0]?.rolId?.toString() || null,
        ultimoAcceso: u.ultimoAcceso,
        createdAt: u.createdAt,
      }));

      setUsers(validatedUsers);
    } catch (error) {
      console.error(error);
      toast.error("Error al conectar con la base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Usuario eliminado correctamente");
        fetchUsers();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !user.activo }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Usuario ${!user.activo ? "activado" : "desactivado"}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingUser ? "Usuario actualizado" : "Usuario creado correctamente");
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ username: "", nombre: "", apellido: "", email: "", password: "", rolId: "" });
        fetchUsers();
      } else {
        toast.error(data.error || "Error al crear usuario");
      }
    } catch (error) {
      toast.error("Error de comunicación con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    // Find existing rolId from the roles list if possible, otherwise we'd need it in the user object
    // Actually, the user object we mapped has the 'rol' name, but we might need the ID.
    // Let's assume we want to fetch the user detail or just handle it if it's available.
    // For now, I'll set the fields we have.
    setEditingUser(user);
    setFormData({
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email || "",
      password: "", // Optional during edit
      rolId: user.rolId || "",
    });
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = `${user.nombre} ${user.apellido} ${user.username} ${user.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? user.activo : !user.activo;

    const matchesRole = roleFilter === "all" ? true : user.rol === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.activo).length,
    new: users.filter((u) => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    inactive: users.filter((u) => !u.activo).length,
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingUser(null);
      setFormData({ username: "", nombre: "", apellido: "", email: "", password: "", rolId: "" });
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 p-2 duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los accesos, roles y perfiles de los usuarios del sistema.
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-primary/20 h-11 gap-2 px-6 text-white shadow-lg">
              <UserPlus className="h-5 w-5" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Modifica los datos del usuario seleccionado."
                    : "Ingresa los datos para el nuevo acceso al sistema."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right text-sm">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    className="col-span-3 h-9"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right text-sm">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    className="col-span-3 h-9"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right text-sm">
                    Apellido
                  </Label>
                  <Input
                    id="apellido"
                    className="col-span-3 h-9"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className="col-span-3 h-9"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right text-sm">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    className="col-span-3 h-9"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rolId" className="text-right text-sm">
                    Rol
                  </Label>
                  <div className="col-span-3">
                    <Select value={formData.rolId} onValueChange={(val) => setFormData({ ...formData, rolId: val })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.nombreRol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="h-10">
                  {isSubmitting ? "Guardando..." : editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards - Style Sync with Dashboard/Database */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">Usuarios registrados</p>
          </CardContent>
        </Card>

        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-muted-foreground mt-1 text-xs">Acceso permitido</p>
          </CardContent>
        </Card>

        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-muted-foreground mt-1 text-xs">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card className="border-t-0 border-r-0 border-b-0 border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <p className="text-muted-foreground mt-1 text-xs">Acceso denegado</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Cleaner Card Layout */}
      <Card className="ring-border/60 border-none shadow-md ring-1">
        <CardHeader className="mb-6 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div className="space-y-1">
            <CardTitle className="text-xl">Listado de Usuarios</CardTitle>
            <CardDescription>Visualiza y gestiona los privilegios de los usuarios.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar..."
                className="h-9 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 shrink-0 ${statusFilter !== "all" || roleFilter !== "all" ? "bg-primary/10 border-primary text-primary" : ""}`}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="leading-none font-medium">Filtros Avanzados</h4>
                    <p className="text-muted-foreground text-sm">Filtra los usuarios por estado o rol.</p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="status">Estado</Label>
                      <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                        <SelectTrigger id="status" className="col-span-2 h-8">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Activos</SelectItem>
                          <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="role">Rol</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger id="role" className="col-span-2 h-8">
                          <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los roles</SelectItem>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.nombreRol}>
                              {r.nombreRol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" className="h-8 w-full text-xs" onClick={clearFilters}>
                    Limpiar Filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex h-9 shrink-0 overflow-hidden rounded-md border">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-full w-9 rounded-none"
                onClick={() => setViewMode("table")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-full w-9 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[300px]">Usuario</TableHead>
                    <TableHead>Rol / Permiso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 font-medium">
                          <RefreshCw className="text-primary h-6 w-6 animate-spin" />
                          <p className="text-muted-foreground text-sm">Cargando usuarios...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground py-20 text-center">
                        No se encontraron usuarios.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50 group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              <AvatarImage src={user.avatar || ""} />
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                {user.nombre.charAt(0)}
                                {user.apellido.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm leading-tight font-semibold">
                                {user.nombre} {user.apellido}
                              </span>
                              <span className="text-muted-foreground text-xs">@{user.username}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="border-primary/20 text-primary bg-primary/5 h-5 w-fit px-1.5 py-0 text-[10px]"
                            >
                              {user.rol}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.activo ? (
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
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span>
                              {user.ultimoAcceso
                                ? format(new Date(user.ultimoAcceso), "dd MMM, yyyy", { locale: es })
                                : "Nunca"}
                            </span>
                            <span className="text-muted-foreground">
                              {user.ultimoAcceso ? format(new Date(user.ultimoAcceso), "HH:mm", { locale: es }) : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                              onClick={() => openEditModal(user)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                              onClick={() => toggleStatus(user)}
                              title={user.activo ? "Desactivar" : "Activar"}
                            >
                              {user.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => deleteUser(user.id)}
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
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-t-0 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex items-start justify-between">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={user.avatar || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {user.nombre.charAt(0)}
                          {user.apellido.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge
                        variant="outline"
                        className={`${user.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} border-none text-[10px]`}
                      >
                        {user.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold">
                        {user.nombre} {user.apellido}
                      </h3>
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3" /> {user.email || "Sin correo"}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Phone className="h-3 w-3" /> {user.telefono || "Sin teléfono"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <Badge variant="outline" className="border-primary/20 text-primary h-5 text-[10px] font-normal">
                        {user.rol}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:bg-primary/5 h-8 w-8"
                          onClick={() => openEditModal(user)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-primary/5 h-8 w-8"
                          onClick={() => toggleStatus(user)}
                          title={user.activo ? "Desactivar" : "Activar"}
                        >
                          {user.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-primary/5 border-primary/10 flex items-center gap-4 rounded-lg border p-4 text-xs opacity-90">
        <Shield className="text-primary h-5 w-5 shrink-0" />
        <p>
          <strong>Seguridad:</strong> Los cambios en roles y permisos afectan inmediatamente el acceso del usuario. Se
          recomienda verificar la identidad antes de realizar cambios críticos.
        </p>
      </div>
    </div>
  );
}
