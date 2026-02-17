"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  usuarioId: string | null;
  usuario: string | null;
  usuarioUsername: string | null;
  sesionId: string | null;
  accion: string;
  tablaAfectada: string | null;
  registroAfectadoId: string | null;
  detallesAnteriores: any;
  detallesNuevos: any;
  ipAddress: string | null;
  userAgent: string | null;
  metodo: string | null;
  ruta: string | null;
  resultado: string;
  mensajeError: string | null;
  duracionMs: number | null;
  fechaHora: string;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [filterAccion, setFilterAccion] = useState<string>("");
  const [filterResultado, setFilterResultado] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (searchTerm) params.append("search", searchTerm);
      if (filterAccion) params.append("accion", filterAccion);
      if (filterResultado) params.append("resultado", filterResultado);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const response = await fetch(`/api/auditoria?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.data);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        toast.error(data.error || "Error al cargar registros de auditoría");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Error al cargar registros de auditoría");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAccion, filterResultado, filterStartDate, filterEndDate]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterAccion("");
    setFilterResultado("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
    fetchLogs();
  };

  const getAccionBadge = (accion: string) => {
    const variants: Record<string, string> = {
      LOGIN: "default",
      LOGOUT: "secondary",
      CREATE: "success",
      UPDATE: "warning",
      DELETE: "destructive",
      READ: "outline",
    };

    return <Badge variant={(variants[accion] as any) || "default"}>{accion}</Badge>;
  };

  const getResultadoBadge = (resultado: string) => {
    if (resultado === "exitoso") {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Exitoso
        </Badge>
      );
    } else if (resultado === "fallido") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Fallido
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {resultado}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auditoría del Sistema
              </CardTitle>
              <CardDescription>Registro de todas las acciones realizadas en el sistema</CardDescription>
            </div>
            <Button onClick={fetchLogs} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar en auditoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Select value={filterAccion} onValueChange={setFilterAccion}>
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las acciones</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="CREATE">Crear</SelectItem>
                <SelectItem value="READ">Leer</SelectItem>
                <SelectItem value="UPDATE">Actualizar</SelectItem>
                <SelectItem value="DELETE">Eliminar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResultado} onValueChange={setFilterResultado}>
              <SelectTrigger>
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los resultados</SelectItem>
                <SelectItem value="exitoso">Exitoso</SelectItem>
                <SelectItem value="fallido">Fallido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleClearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>

          {/* Date Range Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha Inicio</label>
              <Input
                type="datetime-local"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha Fin</label>
              <Input type="datetime-local" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-muted-foreground text-xs">Total de registros</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {isLoading ? (
              <div className="text-muted-foreground p-8 text-center">Cargando registros de auditoría...</div>
            ) : logs.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center">No se encontraron registros</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tabla</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{formatDate(log.fechaHora)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.usuario || "Sistema"}</span>
                          {log.usuarioUsername && (
                            <span className="text-muted-foreground text-xs">@{log.usuarioUsername}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getAccionBadge(log.accion)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{log.tablaAfectada || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.metodo || "-"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                      <TableCell>{getResultadoBadge(log.resultado)}</TableCell>
                      <TableCell className="text-xs">{log.duracionMs ? `${log.duracionMs}ms` : "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Página {page} de {totalPages} ({total} registros)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Auditoría</DialogTitle>
            <DialogDescription>Información completa del registro de auditoría</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Usuario</label>
                  <p className="text-sm">{selectedLog.usuario || "Sistema"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Acción</label>
                  <p className="text-sm">{selectedLog.accion}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tabla Afectada</label>
                  <p className="font-mono text-sm">{selectedLog.tablaAfectada || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">ID Registro</label>
                  <p className="font-mono text-sm">{selectedLog.registroAfectadoId || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Dirección IP</label>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Resultado</label>
                  <div>{getResultadoBadge(selectedLog.resultado)}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Ruta</label>
                  <p className="font-mono text-sm">
                    {selectedLog.metodo} {selectedLog.ruta || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">User Agent</label>
                  <p className="font-mono text-xs break-all">{selectedLog.userAgent || "-"}</p>
                </div>
              </div>

              {selectedLog.mensajeError && (
                <div>
                  <label className="text-destructive text-sm font-medium">Mensaje de Error</label>
                  <p className="bg-destructive/10 mt-1 rounded p-2 text-sm">{selectedLog.mensajeError}</p>
                </div>
              )}

              {selectedLog.detallesAnteriores && (
                <div>
                  <label className="text-sm font-medium">Detalles Anteriores</label>
                  <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(selectedLog.detallesAnteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.detallesNuevos && (
                <div>
                  <label className="text-sm font-medium">Detalles Nuevos</label>
                  <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(selectedLog.detallesNuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
