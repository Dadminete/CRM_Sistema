"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Play,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Backup {
  name: string;
  size: number;
  createdAt: string;
}

export default function DatabasePage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [config, setConfig] = useState<{ backupPath: string; databaseUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/database/backups");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBackups(data);
      } else {
        console.error("Invalid backups data:", data);
        setBackups([]);
      }
    } catch (error) {
      toast.error("Error al cargar los respaldos");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/database/config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, []);

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    toast.info("Iniciando respaldo de base de datos...");
    try {
      const res = await fetch("/api/database/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Respaldo creado con éxito");
        fetchBackups();
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error: any) {
      toast.error(`Error al crear respaldo: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownload = (fileName: string) => {
    window.open(`/api/database/download?fileName=${encodeURIComponent(fileName)}`, "_blank");
  };

  const handleRestore = async (fileName: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas restaurar el respaldo ${fileName}? Esta acción sobrescribirá los datos actuales.`,
      )
    )
      return;

    toast.info("Iniciando restauración...");
    try {
      const res = await fetch("/api/database/restore", {
        method: "POST",
        body: JSON.stringify({ action: "restore", fileName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Restauración completada con éxito");
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error: any) {
      toast.error(`Error en la restauración: ${error.message}`);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este respaldo?")) return;

    try {
      const res = await fetch("/api/database/restore", {
        method: "POST",
        body: JSON.stringify({ action: "delete", fileName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Respaldo eliminado");
        fetchBackups();
      } else {
        throw new Error(data.error || "Error al eliminar");
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredBackups = backups.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Base de Datos</h1>
          <p className="text-muted-foreground">Administra tus respaldos de Neon PostgreSQL y restaura datos.</p>
        </div>
        <Button
          onClick={handleCreateBackup}
          disabled={isBackingUp}
          className="bg-primary hover:bg-primary/90 shadow-primary/20 h-11 gap-2 px-6 text-white shadow-lg"
        >
          {isBackingUp ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
          {isBackingUp ? "Respaldando..." : "Crear Backup Ahora"}
        </Button>
      </div>

      {/* Seccion de Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Conexión</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Activa</div>
            <p className="text-muted-foreground text-xs">{config?.databaseUrl || "Neon DB"}</p>
          </CardContent>
        </Card>
        <Card className="border-l-primary border-l-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Respaldos</CardTitle>
            <Database className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-muted-foreground text-xs">Archivos en storage local</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Respaldo</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-xl font-bold">
              {backups[0] ? format(new Date(backups[0].createdAt), "dd MMM, HH:mm", { locale: es }) : "N/A"}
            </div>
            <p className="text-muted-foreground text-xs">Resguardo automático diario</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="mb-1 truncate text-sm font-bold" title={config?.backupPath}>
              {config?.backupPath || "E:\\Backups"}
            </div>
            <p className="text-muted-foreground text-xs">Ruta configurada en .env</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Historial */}
      <Card className="ring-border/60 border-none shadow-md ring-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Historial de Respaldos</CardTitle>
            <CardDescription>Lista de archivos `.sql` generados recientemente.</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Buscar backup..."
              className="h-9 pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Archivo / Nombre</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      Cargando historial...
                    </TableCell>
                  </TableRow>
                ) : filteredBackups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                      No se encontraron respaldos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBackups.map((backup) => (
                    <TableRow key={backup.name} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="flex items-center gap-2 font-medium">
                        <Database className="text-primary/70 h-4 w-4" />
                        {backup.name}
                      </TableCell>
                      <TableCell>{format(new Date(backup.createdAt), "PPP p", { locale: es })}</TableCell>
                      <TableCell>{formatSize(backup.size)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-100 text-green-700 hover:bg-green-100"
                        >
                          Listo
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                          onClick={() => handleDownload(backup.name)}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:bg-amber-100 hover:text-amber-600"
                          onClick={() => handleRestore(backup.name)}
                          title="Restaurar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-600"
                          onClick={() => handleDelete(backup.name)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 border-primary/20 flex items-center gap-4 rounded-lg border p-4 text-sm opacity-80">
        <ShieldCheck className="text-primary h-5 w-5 shrink-0" />
        <p>
          <strong>Seguridad:</strong> Los respaldos se guardan en local para mayor privacidad. Se recomienda descargar
          copias importantes de forma periódica.
        </p>
      </div>
    </div>
  );
}
