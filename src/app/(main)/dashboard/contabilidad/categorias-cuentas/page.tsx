"use client";

import { useState, useEffect, Fragment } from "react";
import {
  FolderTree,
  Search,
  RefreshCw,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  padreId: string | null;
  nivel: number;
  esDetalle: boolean;
  activa: boolean;
  children?: Category[];
}

export default function AccountCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/contabilidad/categorias");
      const data = await res.json();
      if (data.success) {
        const flatCategories: Category[] = data.data;
        const tree = buildCategoryTree(flatCategories);
        setCategories(tree);
        const initialExpanded: Record<string, boolean> = {};
        flatCategories.filter((c) => c.nivel === 1).forEach((c) => (initialExpanded[c.id] = true));
        setExpandedCategories(initialExpanded);
      } else {
        toast.error("Error al cargar categorías");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const buildCategoryTree = (flatList: Category[]): Category[] => {
    const map: Record<string, Category> = {};
    const roots: Category[] = [];

    flatList.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    flatList.forEach((item) => {
      if (item.padreId && map[item.padreId]) {
        map[item.padreId].children?.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    roots.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return roots;
  };

  const handleSave = async () => {
    try {
      const method = currentCategory.id ? "PUT" : "POST";
      const res = await fetch("/api/contabilidad/categorias", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentCategory),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Categoría ${currentCategory.id ? "actualizada" : "guardada"} correctamente`);
        setIsDialogOpen(false);
        fetchCategories();
      } else {
        toast.error("Error al guardar: " + data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/contabilidad/categorias?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Categoría eliminada");
        fetchCategories();
      } else {
        toast.error("Error al eliminar: " + data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Recursive rendering of rows
  const renderCategoryRow = (category: Category) => {
    const isExpanded = expandedCategories[category.id];
    const hasChildren = category.children && category.children.length > 0;

    if (
      searchTerm &&
      !category.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !category.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return null;
    }

    return (
      <Fragment key={category.id}>
        <TableRow className="hover:bg-muted/50 group transition-colors">
          <TableCell className="font-mono font-medium text-slate-700">
            <div className="flex items-center" style={{ paddingLeft: `${(category.nivel - 1) * 20}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-1 h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  onClick={() => toggleExpand(category.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-7" />
              )}
              <span className={cn(category.esDetalle ? "text-slate-600" : "font-bold text-slate-800")}>
                {category.codigo}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <span className={cn(category.esDetalle ? "text-slate-600" : "font-bold text-slate-800")}>
              {category.nombre}
            </span>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 capitalize">
              {category.tipo}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {category.esDetalle ? (
                <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                  Detalle
                </Badge>
              ) : (
                <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                  Cuenta Madre
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            {category.activa ? (
              <Badge className="border-none bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-200">
                Activa
              </Badge>
            ) : (
              <Badge variant="destructive" className="border-none bg-red-100 text-red-700 shadow-none hover:bg-red-200">
                Inactiva
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                  <span className="sr-only">Abrir menú</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentCategory({
                      padreId: category.id,
                      tipo: category.tipo,
                      nivel: category.nivel + 1,
                      esDetalle: true,
                      activa: true,
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Agregar Subcuenta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentCategory(category);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {isExpanded && category.children?.map((child) => renderCategoryRow(child))}
      </Fragment>
    );
  };

  return (
    <div className="animate-in fade-in flex min-h-screen flex-col gap-6 bg-slate-50/50 p-6 duration-500 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 underline decoration-indigo-500/30 underline-offset-8">
            Categorías de Cuentas
          </h1>
          <p className="mt-2 text-lg text-slate-500">Estructura y jerarquía del catálogo de cuentas contables.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={fetchCategories}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 bg-slate-900 text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
                onClick={() => setCurrentCategory({ nivel: 1, esDetalle: false, activa: true })}
              >
                <Plus className="h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{currentCategory.id ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                <DialogDescription>
                  Define los detalles de la cuenta contable. {currentCategory.padreId && "Esta será una subcuenta."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="codigo" className="text-right">
                    Código
                  </Label>
                  <Input
                    id="codigo"
                    value={currentCategory.codigo || ""}
                    onChange={(e) => setCurrentCategory({ ...currentCategory, codigo: e.target.value })}
                    className="col-span-3"
                    placeholder="Ej. 1-01-01"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    value={currentCategory.nombre || ""}
                    onChange={(e) => setCurrentCategory({ ...currentCategory, nombre: e.target.value })}
                    className="col-span-3"
                    placeholder="Nombre de la cuenta"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tipo" className="text-right">
                    Tipo
                  </Label>
                  <Select
                    value={currentCategory.tipo}
                    onValueChange={(val) => setCurrentCategory({ ...currentCategory, tipo: val })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">Activo</SelectItem>
                      <SelectItem value="PASIVO">Pasivo</SelectItem>
                      <SelectItem value="CAPITAL">Capital</SelectItem>
                      <SelectItem value="INGRESOS">Ingresos</SelectItem>
                      <SelectItem value="COSTOS">Costos</SelectItem>
                      <SelectItem value="GASTOS">Gastos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="esDetalle" className="text-right">
                    ¿Es Detalle?
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="esDetalle"
                      checked={currentCategory.esDetalle}
                      onCheckedChange={(checked) => setCurrentCategory({ ...currentCategory, esDetalle: checked })}
                    />
                    <Label htmlFor="esDetalle" className="font-normal text-slate-500">
                      {currentCategory.esDetalle ? "Sí, recibe movimientos" : "No, es cuenta agrupadora"}
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="activa" className="text-right">
                    Estado
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="activa"
                      checked={currentCategory.activa}
                      onCheckedChange={(checked) => setCurrentCategory({ ...currentCategory, activa: checked })}
                    />
                    <Label htmlFor="activa" className="font-normal text-slate-500">
                      {currentCategory.activa ? "Activa" : "Inactiva"}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
                  {currentCategory.id ? "Guardar Cambios" : "Crear Categoría"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-md ring-1 ring-slate-200">
        <CardHeader className="border-b border-slate-100 bg-white pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="rounded-lg bg-indigo-50 p-2">
                <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold">Catálogo Contable</h2>
            </div>
            <div className="relative w-72">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cuenta..."
                className="border-slate-200 bg-slate-50 pl-9 transition-colors focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-[300px] font-bold text-slate-700">Código</TableHead>
                <TableHead className="font-bold text-slate-700">Nombre de la Cuenta</TableHead>
                <TableHead className="font-bold text-slate-700">Tipo</TableHead>
                <TableHead className="font-bold text-slate-700">Clasificación</TableHead>
                <TableHead className="font-bold text-slate-700">Estado</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    Cargando estructura de cuentas...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No hay categorías registradas. Comienza agregando una nueva.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => renderCategoryRow(category))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
