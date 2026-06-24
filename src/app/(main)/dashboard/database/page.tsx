"use client";

import { useEffect, useRef, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Database, Download, RotateCcw, Trash2, Play, ShieldCheck, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { SyncLogModal } from "@/components/database/sync-log-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { BackupProgressPanel, type BackupProgressPoint, type BackupRunInfo } from "./_components/backup-progress-panel";
import { DatabaseSummaryCards } from "./_components/database-summary-cards";

interface Backup {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  provider?: "local" | "neon-snapshot";
  actions?: {
    download: boolean;
    restore: boolean;
    delete: boolean;
  };
}

export default function DatabasePage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [config, setConfig] = useState<{
    backupPath: string;
    backupMode?: "local" | "neon-snapshot";
    localStatus?: string;
    cloudStatus?: string;
    localUrl?: string;
    cloudUrl?: string;
    pendingSyncCount?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStage, setBackupStage] = useState("Esperando ejecución");
  const [backupElapsedSeconds, setBackupElapsedSeconds] = useState(0);
  const [backupTimeline, setBackupTimeline] = useState<BackupProgressPoint[]>([]);
  const [backupRunInfo, setBackupRunInfo] = useState<BackupRunInfo>({ status: "idle" });
  const backupTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backupStartedAtRef = useRef<number>(0);

  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Error desconocido");

  const pushProgressPoint = (percent: number) => {
    const label = format(new Date(), "HH:mm:ss");
    setBackupTimeline((prev) => [...prev.slice(-24), { time: label, percent }]);
  };

  const getBackupStage = (percent: number) => {
    if (percent < 20) return "Validando entorno";
    if (percent < 45) return "Conectando a la base de datos";
    if (percent < 80) return "Generando respaldo";
    if (percent < 100) return "Finalizando proceso";
    return "Completado";
  };

  const stopBackupTicker = () => {
    if (backupTickerRef.current) {
      clearInterval(backupTickerRef.current);
      backupTickerRef.current = null;
    }
  };

  const startBackupTicker = () => {
    stopBackupTicker();
    backupTickerRef.current = setInterval(() => {
      setBackupElapsedSeconds(Math.max(0, Math.floor((Date.now() - backupStartedAtRef.current) / 1000)));
      setBackupProgress((prev) => {
        const next = Math.min(92, prev + Math.max(1, Math.floor((96 - prev) / 8)));
        setBackupStage(getBackupStage(next));
        pushProgressPoint(next);
        return next;
      });
    }, 900);
  };

  const processSyncChunk = (chunk: string) => {
    const lines = chunk.split("\n\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      try {
        const data = JSON.parse(line.slice(6)) as { message?: string };
        const message = data.message ?? "";
        if (!message) {
          continue;
        }

        setSyncLogs((prev) => [...prev, message]);
        if (message.includes("[SUCCESS]")) {
          setSyncStatus("success");
        }
        if (message.includes("[ERROR]") || message.includes("[CRITICAL]")) {
          setSyncStatus("error");
        }
      } catch {
        // Ignore partial JSON chunks and wait for next event piece.
      }
    }
  };

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
    } catch {
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
    return () => {
      stopBackupTicker();
    };
  }, []);

  // eslint-disable-next-line complexity
  const handleCreateBackup = async () => {
    const startedAt = new Date();
    backupStartedAtRef.current = startedAt.getTime();

    setBackupElapsedSeconds(0);
    setBackupProgress(8);
    setBackupStage("Iniciando respaldo");
    setBackupTimeline([{ time: format(startedAt, "HH:mm:ss"), percent: 8 }]);
    setBackupRunInfo({
      status: "running",
      startedAt: startedAt.toISOString(),
      mode: config?.backupMode ?? "local",
    });

    setIsBackingUp(true);
    startBackupTicker();
    toast.info("Iniciando respaldo de base de datos...");
    try {
      const res = await fetch("/api/database/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        stopBackupTicker();
        const finishedAt = new Date();
        const payload = (data.data ?? {}) as {
          provider?: string;
          snapshotId?: string;
          snapshotName?: string;
          fileName?: string;
        };

        setBackupProgress(100);
        setBackupStage("Completado");
        setBackupElapsedSeconds(Math.max(0, Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000)));
        pushProgressPoint(100);
        setBackupRunInfo({
          status: "success",
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationSeconds: Math.max(0, Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000)),
          provider: payload.provider ?? config?.backupMode ?? "local",
          mode: config?.backupMode ?? "local",
          snapshotId: payload.snapshotId,
          snapshotName: payload.snapshotName,
          fileName: payload.fileName,
        });
        toast.success("Respaldo creado con éxito");
        fetchBackups();
      } else {
        throw new Error(data.error ?? "Error desconocido");
      }
    } catch (error: unknown) {
      stopBackupTicker();
      const message = getErrorMessage(error);
      setBackupStage("Error en respaldo");
      setBackupRunInfo((prev) => ({
        ...prev,
        status: "error",
        finishedAt: new Date().toISOString(),
        error: message,
      }));
      pushProgressPoint(Math.max(backupProgress, 15));
      toast.error(`Error al crear respaldo: ${getErrorMessage(error)}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownload = (backup: Backup) => {
    if (backup.actions?.download === false) {
      toast.info("Los snapshots de Neon no se descargan como archivo .sql desde este panel.");
      return;
    }
    window.open(`/api/database/download?fileName=${encodeURIComponent(backup.name)}`, "_blank");
  };

  const handleRestore = async (backup: Backup) => {
    if (backup.actions?.restore === false) {
      toast.info("La restauración de snapshots Neon se gestiona desde Neon Console.");
      return;
    }

    const fileName = backup.name;
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
        fetchBackups(); // Refresh the list after restore
      } else {
        throw new Error(data.error ?? "Error desconocido");
      }
    } catch (error: unknown) {
      toast.error(`Error en la restauración: ${getErrorMessage(error)}`);
    }
  };

  const handleDelete = async (backup: Backup) => {
    if (backup.actions?.delete === false) {
      toast.info("Este respaldo no se puede eliminar desde este panel.");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar este respaldo?")) return;

    try {
      const res = await fetch("/api/database/restore", {
        method: "POST",
        body: JSON.stringify({ action: "delete", fileName: backup.name, backupId: backup.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Respaldo eliminado");
        fetchBackups();
      } else {
        throw new Error(data.error ?? "Error al eliminar");
      }
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setSyncLogs([]);
    setSyncStatus("syncing");
    setShowSyncModal(true);

    try {
      const response = await fetch("/api/database/sync/stream");
      if (!response.body) throw new Error("No hay cuerpo de respuesta.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        processSyncChunk(chunk);
      }
      fetchConfig();
    } catch (error: unknown) {
      setSyncLogs((prev) => [...prev, `[CRITICAL] Error de red: ${getErrorMessage(error)}`]);
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredBackups = backups.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const showBackupProgress = isBackingUp || backupRunInfo.status !== "idle";

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

      {showBackupProgress && (
        <BackupProgressPanel
          backupStage={backupStage}
          backupProgress={backupProgress}
          backupElapsedSeconds={backupElapsedSeconds}
          backupTimeline={backupTimeline}
          backupRunInfo={backupRunInfo}
        />
      )}

      <DatabaseSummaryCards
        config={config}
        backupsCount={backups.length}
        latestBackupAt={backups[0]?.createdAt}
        isSyncing={isSyncing}
        onSyncCloud={handleSyncCloud}
      />

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
                        {backup.provider === "neon-snapshot" ? (
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100"
                          >
                            Snapshot Neon
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-100 text-green-700 hover:bg-green-100"
                          >
                            Listo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                          onClick={() => handleDownload(backup)}
                          disabled={backup.actions?.download === false}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:bg-amber-100 hover:text-amber-600"
                          onClick={() => handleRestore(backup)}
                          disabled={backup.actions?.restore === false}
                          title="Restaurar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-600"
                          onClick={() => handleDelete(backup)}
                          disabled={backup.actions?.delete === false}
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
          <strong>Seguridad:</strong>{" "}
          {config?.backupMode === "neon-snapshot"
            ? "En Vercel, los backups se crean como snapshots de Neon. Para restaurar snapshots, usa Neon Console."
            : "Los respaldos se guardan en local para mayor privacidad. Se recomienda descargar copias importantes de forma periódica."}
        </p>
      </div>
      <SyncLogModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        logs={syncLogs}
        status={syncStatus}
      />
    </div>
  );
}
