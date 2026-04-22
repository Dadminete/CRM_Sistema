"use client";

import { Wallet, Landmark } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, cn } from "@/lib/utils";

interface ActiveSession {
  id: string;
  fechaApertura: string;
  montoApertura: string;
  cajaNombre: string;
  usuarioNombre: string;
  usuarioApellido: string;
  horasActiva: number;
  esDiaAnterior: boolean;
}

interface OperationalCardsProps {
  boxes: any[];
  discrepancias?: number;
  activeSessions?: ActiveSession[];
}

export function OperationalCards({ boxes, discrepancias = 0, activeSessions = [] }: OperationalCardsProps) {
  const safeBoxes = Array.isArray(boxes) ? boxes : [];
  const totalBalance = safeBoxes.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0);

  // Build dynamic alerts from real data
  type Alert = {
    title: string;
    message: string;
    level: "warning" | "info" | "critical" | "ok";
    onClick?: () => void;
  };

  const alerts: Alert[] = [];

  // Alert 1: Sessions open > 8 hours
  for (const session of activeSessions) {
    const hours = Math.floor(Number(session.horasActiva));
    if (hours >= 8) {
      alerts.push({
        title: `${session.cajaNombre} abierta`,
        message: `Sesión activa hace más de ${hours} horas. Requiere revisión.`,
        level: "warning",
      });
    }
  }

  // Alert 2: Sessions from a previous day still open (pending closure)
  for (const session of activeSessions) {
    if (session.esDiaAnterior) {
      const usuario = `${session.usuarioNombre} ${session.usuarioApellido}`.trim();
      alerts.push({
        title: "Cierre pendiente",
        message: `El usuario "${usuario}" no ha cerrado su turno en ${session.cajaNombre}.`,
        level: "info",
      });
    }
  }

  // Alert 3: Discrepancies
  if (discrepancias > 0) {
    alerts.push({
      title: "Diferencia Crítica",
      message: `Se detectaron ${discrepancias} ${discrepancias === 1 ? "discrepancia" : "discrepancias"} en los cierres. Haz clic para resolver.`,
      level: "critical",
      onClick: () => (window.location.href = "/dashboard/cajas-chicas/discrepancias"),
    });
  }

  // If no alerts at all, show green "all clear"
  if (alerts.length === 0) {
    alerts.push({
      title: "Sistema Operativo",
      message: "No hay alertas. Todas las cajas están cerradas y sin discrepancias.",
      level: "ok",
    });
  }

  const levelStyles: Record<
    string,
    { dot: string; badge: string; badgeText: string; container?: string; textClass?: string }
  > = {
    warning: {
      dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]",
      badge: "bg-yellow-500/10",
      badgeText: "text-yellow-600 dark:text-yellow-400",
    },
    info: {
      dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
      badge: "bg-blue-500/10",
      badgeText: "text-blue-600 dark:text-blue-400",
    },
    critical: {
      dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
      badge: "bg-red-500/10",
      badgeText: "text-red-600 dark:text-red-400",
      container: "border-red-200/50 bg-red-50/10 hover:bg-red-50/20 cursor-pointer active:scale-[0.98]",
      textClass: "text-red-600 dark:text-red-400",
    },
    ok: {
      dot: "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
      badge: "bg-emerald-500/10",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      container: "border-emerald-200/50 bg-emerald-50/10 hover:bg-emerald-50/20",
      textClass: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const levelLabels: Record<string, string> = {
    warning: "Aviso",
    info: "Info",
    critical: "Crítico",
    ok: "OK",
  };

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Estado de Cajas Chicas</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            Balance Consolidado: {formatCurrency(totalBalance)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {safeBoxes.map((box) => (
              <div key={box.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {box.type === "banco" ? (
                      <Landmark className="size-4 text-blue-500" />
                    ) : (
                      <Wallet className="size-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">{box.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(parseFloat(box.balance || 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={totalBalance > 0 ? (parseFloat(box.balance || 0) / totalBalance) * 100 : 0} />
                  <span className="text-muted-foreground text-[10px] font-medium tabular-nums">
                    {totalBalance > 0 ? ((parseFloat(box.balance || 0) / totalBalance) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert, i) => {
              const style = levelStyles[alert.level];
              return (
                <div
                  key={i}
                  className={cn(
                    "space-y-2 rounded-md border px-3 py-2.5 transition-colors",
                    style.container || "hover:bg-muted/50 cursor-default",
                  )}
                  onClick={alert.onClick}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", style.dot)} />
                    <span className="text-sm font-medium">{alert.title}</span>
                    <span
                      className={cn(
                        "ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                        style.badge,
                        style.badgeText,
                      )}
                    >
                      {levelLabels[alert.level]}
                    </span>
                  </div>
                  <div
                    className={cn("text-xs leading-relaxed font-medium", style.textClass || "text-muted-foreground")}
                  >
                    {alert.message}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
