"use client";

import { useState, useEffect, Fragment } from "react";

import { Search, RefreshCw, Plus, MoreVertical, Edit, Trash2, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <TableRow className="group hover:bg-muted/50 transition-colors">
          <TableCell className="text-foreground font-mono font-medium">
            <div className="flex items-center" style={{ paddingLeft: `${(category.nivel - 1) * 20}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground mr-1 h-6 w-6 p-0"
                  onClick={() => toggleExpand(category.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-7" />
              )}
              <span className={cn(category.esDetalle ? "text-muted-foreground" : "text-foreground font-bold")}>
                {category.codigo}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <span className={cn(category.esDetalle ? "text-muted-foreground" : "text-foreground font-bold")}>
              {category.nombre}
            </span>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border capitalize">
              {category.tipo}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {category.esDetalle ? (
                <Badge variant="secondary" className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15">
                  Detalle
                </Badge>
              ) : (
                <Badge variant="secondary" className="border-chart-4/25 bg-chart-4/10 text-chart-4 hover:bg-chart-4/15">
                  Cuenta Madre
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            {category.activa ? (
              <Badge className="border-none bg-emerald-500/15 text-emerald-700 shadow-none hover:bg-emerald-500/25 dark:text-emerald-300">
                Activa
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="border-none bg-red-500/15 text-red-700 shadow-none hover:bg-red-500/25 dark:text-red-300"
              >
                Inactiva
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
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
                  className="text-red-600 focus:bg-red-500/10 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
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
    <div className="bg-background animate-in fade-in flex min-h-screen flex-col gap-6 p-6 duration-500 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground decoration-primary/30 text-3xl font-bold tracking-tight underline underline-offset-8">
            Categorías de Cuentas
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Estructura y jerarquía del catálogo de cuentas contables.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-border text-foreground bg-background hover:bg-muted gap-2 shadow-sm"
            onClick={fetchCategories}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-md transition-all hover:shadow-lg"
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
                    <Label htmlFor="esDetalle" className="text-muted-foreground font-normal">
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
                    <Label htmlFor="activa" className="text-muted-foreground font-normal">
                      {currentCategory.activa ? "Activa" : "Inactiva"}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleSave}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {currentCategory.id ? "Guardar Cambios" : "Crear Categoría"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-card text-card-foreground border-border shadow-md">
        <CardHeader className="border-border/60 bg-card border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="text-foreground flex items-center gap-2">
              <div className="bg-primary/10 rounded-lg p-2">
                <Layers className="text-primary h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Catálogo Contable</h2>
            </div>
            <div className="relative w-72">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Buscar cuenta..."
                className="bg-muted/40 border-border focus:bg-background pl-9 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-foreground w-[300px] font-bold">Código</TableHead>
                <TableHead className="text-foreground font-bold">Nombre de la Cuenta</TableHead>
                <TableHead className="text-foreground font-bold">Tipo</TableHead>
                <TableHead className="text-foreground font-bold">Clasificación</TableHead>
                <TableHead className="text-foreground font-bold">Estado</TableHead>
                <TableHead className="text-foreground text-right font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                    Cargando estructura de cuentas...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
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
