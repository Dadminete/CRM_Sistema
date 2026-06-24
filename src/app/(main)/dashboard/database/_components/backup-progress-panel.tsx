import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface BackupProgressPoint {
  time: string;
  percent: number;
}

export interface BackupRunInfo {
  status: "idle" | "running" | "success" | "error";
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  provider?: string;
  mode?: string;
  snapshotId?: string;
  snapshotName?: string;
  fileName?: string;
  error?: string;
}

type BackupProgressPanelProps = {
  backupStage: string;
  backupProgress: number;
  backupElapsedSeconds: number;
  backupTimeline: BackupProgressPoint[];
  backupRunInfo: BackupRunInfo;
};

export function BackupProgressPanel({
  backupStage,
  backupProgress,
  backupElapsedSeconds,
  backupTimeline,
  backupRunInfo,
}: BackupProgressPanelProps) {
  return (
    <Card className="ring-border/60 border-none shadow-md ring-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Progreso del Backup</CardTitle>
        <CardDescription>Seguimiento visual de la ejecucion actual o mas reciente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-end justify-between">
            <p className="text-sm font-semibold">{backupStage}</p>
            <p className="text-primary text-2xl font-bold">{backupProgress}%</p>
          </div>
          <Progress value={backupProgress} className="h-3" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Estado</p>
              <p className="font-semibold capitalize">{backupRunInfo.status}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Duracion</p>
              <p className="font-semibold">{backupElapsedSeconds}s</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Modo</p>
              <p className="font-semibold">{backupRunInfo.mode ?? "local"}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Proveedor</p>
              <p className="font-semibold">{backupRunInfo.provider ?? "N/A"}</p>
            </div>
          </div>
          {backupRunInfo.snapshotName && (
            <p className="text-muted-foreground rounded-md border p-2 text-xs">
              Snapshot: <span className="text-foreground font-semibold">{backupRunInfo.snapshotName}</span>
            </p>
          )}
          {backupRunInfo.snapshotId && (
            <p className="text-muted-foreground rounded-md border p-2 text-xs">
              ID Snapshot: <span className="text-foreground font-semibold">{backupRunInfo.snapshotId}</span>
            </p>
          )}
          {backupRunInfo.fileName && (
            <p className="text-muted-foreground rounded-md border p-2 text-xs">
              Archivo: <span className="text-foreground font-semibold">{backupRunInfo.fileName}</span>
            </p>
          )}
          {backupRunInfo.error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">{backupRunInfo.error}</p>
          )}
        </div>
        <div className="h-[240px] rounded-lg border p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={backupTimeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="backupProgressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
              <XAxis dataKey="time" minTickGap={28} className="text-[10px]" />
              <YAxis domain={[0, 100]} tickCount={6} width={32} className="text-[10px]" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="percent"
                stroke="hsl(var(--primary))"
                fill="url(#backupProgressGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
