import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, Database, Download, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DatabaseConfig = {
  backupPath: string;
  backupMode?: "local" | "neon-snapshot";
  localStatus?: string;
  cloudStatus?: string;
  localUrl?: string;
  cloudUrl?: string;
  pendingSyncCount?: number;
};

type DatabaseSummaryCardsProps = {
  config: DatabaseConfig | null;
  backupsCount: number;
  latestBackupAt?: string;
  isSyncing: boolean;
  onSyncCloud: () => void;
};

// eslint-disable-next-line complexity
export function DatabaseSummaryCards({
  config,
  backupsCount,
  latestBackupAt,
  isSyncing,
  onSyncCloud,
}: DatabaseSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card
        className={`border-l-4 shadow-sm ${config?.localStatus === "online" ? "border-l-green-500" : "border-l-red-500"}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Base Local (Principal)</CardTitle>
          <ShieldCheck className={`h-4 w-4 ${config?.localStatus === "online" ? "text-green-500" : "text-red-500"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${config?.localStatus === "online" ? "text-green-600" : "text-red-600"}`}>
            {config?.localStatus === "online" ? "Conectado" : "Error"}
          </div>
          <p className="text-muted-foreground text-xs">{config?.localUrl ?? "PostgreSQL 127.0.0.1"}</p>
        </CardContent>
      </Card>

      <Card
        className={`border-l-4 shadow-sm ${config?.cloudStatus === "online" ? "border-l-blue-500" : "border-l-amber-500"}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sincronizacion Nube</CardTitle>
          <RefreshCw className={`h-4 w-4 ${config?.cloudStatus === "online" ? "text-blue-500" : "text-amber-500"}`} />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${config?.cloudStatus === "online" ? "text-blue-600" : "text-amber-600"}`}
          >
            {config?.cloudStatus === "online" ? "Sincronizado" : "Offline"}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                {config?.cloudUrl ?? "Neon DB"}
              </p>
              {config?.pendingSyncCount && config.pendingSyncCount > 0 ? (
                <Badge variant="destructive" className="h-4 animate-pulse px-1 text-[9px]">
                  {config.pendingSyncCount} cambios pendientes
                </Badge>
              ) : (
                <p className="flex items-center gap-1 text-[10px] text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Al dia
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSyncCloud}
              disabled={isSyncing || config?.localStatus !== "online"}
              className="h-7 gap-1 px-2 text-[10px] hover:bg-blue-100 hover:text-blue-700"
            >
              {isSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 rotate-180" />}
              Sincronizar ahora
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-primary border-l-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Respaldos</CardTitle>
          <Database className="text-primary h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{backupsCount}</div>
          <p className="text-muted-foreground text-xs">
            {config?.backupMode === "neon-snapshot"
              ? "Snapshots administrados en Neon Cloud"
              : `Archivos en storage local ${config?.backupPath ? `(${config.backupPath})` : ""}`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ultimo Respaldo</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="truncate text-xl font-bold">
            {latestBackupAt ? format(new Date(latestBackupAt), "dd MMM, HH:mm", { locale: es }) : "N/A"}
          </div>
          <p className="text-muted-foreground text-xs">Proteccion de datos local</p>
        </CardContent>
      </Card>
    </div>
  );
}
