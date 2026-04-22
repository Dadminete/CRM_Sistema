import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, desc, eq, gt } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, CircleAlert, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { bitacora } from "@/lib/db/schema";

type AlertDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function formatFecha(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getRepairSteps(mensaje: string | null, accion: string, tabla: string | null) {
  const text = (mensaje ?? "").toLowerCase();

  const genericSteps = [
    "Revisa el log técnico completo del backend para ver el stack trace exacto.",
    "Valida los datos enviados en la operación y confirma que cumplen el esquema esperado.",
    "Reintenta la operación desde el flujo de negocio para confirmar si fue un error transitorio.",
  ];

  if (/(timeout|tiempo de espera|timed out)/i.test(text)) {
    return [
      "Verifica conectividad a la base de datos o servicio externo involucrado.",
      "Aumenta el timeout de la operación y reduce el tamaño del lote si aplica.",
      "Monitorea latencia y uso de recursos para identificar cuellos de botella.",
    ];
  }

  if (/(duplicate|duplicad|unique|llave|constraint)/i.test(text)) {
    return [
      "Confirma si el registro ya existe antes de crear uno nuevo.",
      "Ajusta la validación en frontend/backend para evitar envíos duplicados.",
      "Revisa índices únicos en la tabla y corrige el dato en conflicto.",
    ];
  }

  if (/(permission|permiso|denied|forbidden|unauthoriz)/i.test(text)) {
    return [
      "Verifica el rol/permisos del usuario que ejecutó la acción.",
      "Confirma políticas de acceso en backend para la ruta afectada.",
      "Si aplica, ejecuta la acción con un usuario autorizado para validar la corrección.",
    ];
  }

  if (/(connection|conexi|database|db|network|socket)/i.test(text)) {
    return [
      "Valida que el servicio de base de datos esté activo y acepte conexiones.",
      "Revisa variables de entorno de conexión y credenciales.",
      "Comprueba firewall, VPN o reglas de red entre app y base de datos.",
    ];
  }

  return [
    ...genericSteps,
    `Revisa la operación \"${accion}\"${tabla ? ` sobre la tabla \"${tabla}\"` : ""} con una prueba controlada.`,
  ];
}

export default async function AlertDetailsPage({ params }: AlertDetailsPageProps) {
  const { id } = await params;

  let alertId: bigint;

  try {
    alertId = BigInt(id);
  } catch {
    notFound();
  }

  const [alert] = await db
    .select({
      id: bitacora.id,
      accion: bitacora.accion,
      resultado: bitacora.resultado,
      mensajeError: bitacora.mensajeError,
      fechaHora: bitacora.fechaHora,
      tabla: bitacora.tablaAfectada,
      ruta: bitacora.ruta,
      metodo: bitacora.metodo,
    })
    .from(bitacora)
    .where(eq(bitacora.id, alertId))
    .limit(1);

  if (!alert) {
    notFound();
  }

  let resolvedBy = null;

  if (alert.tabla) {
    [resolvedBy] = await db
      .select({
        id: bitacora.id,
        fechaHora: bitacora.fechaHora,
      })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.resultado, "exitoso"),
          eq(bitacora.accion, alert.accion),
          eq(bitacora.tablaAfectada, alert.tabla),
          gt(bitacora.fechaHora, alert.fechaHora),
        ),
      )
      .orderBy(asc(bitacora.fechaHora))
      .limit(1);
  } else {
    [resolvedBy] = await db
      .select({
        id: bitacora.id,
        fechaHora: bitacora.fechaHora,
      })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.resultado, "exitoso"),
          eq(bitacora.accion, alert.accion),
          gt(bitacora.fechaHora, alert.fechaHora),
        ),
      )
      .orderBy(asc(bitacora.fechaHora))
      .limit(1);
  }

  const isResolved = Boolean(resolvedBy);
  const repairSteps = getRepairSteps(alert.mensajeError, alert.accion, alert.tabla);

  const [recentRelatedError] = await db
    .select({
      id: bitacora.id,
      fechaHora: bitacora.fechaHora,
      mensajeError: bitacora.mensajeError,
    })
    .from(bitacora)
    .where(and(eq(bitacora.accion, alert.accion), eq(bitacora.resultado, "error")))
    .orderBy(desc(bitacora.fechaHora))
    .limit(1);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Dashboard / CRM / Alertas del sistema</p>
          <h1 className="text-2xl font-bold tracking-tight">Detalle del Error #{alert.id.toString()}</h1>
        </div>
        <Link
          href="/dashboard/crm"
          className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al CRM
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Estado de la alerta</CardTitle>
            {isResolved ? (
              <Badge variant="secondary" className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Solucionado
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="h-3.5 w-3.5" />
                Pendiente
              </Badge>
            )}
          </div>
          <CardDescription>
            {isResolved
              ? `Se detectó una ejecución exitosa relacionada el ${formatFecha(resolvedBy.fechaHora)} (registro #${resolvedBy.id.toString()}).`
              : "No se detecta una ejecución exitosa posterior para esta acción. Se recomienda aplicar la guía de reparación."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-muted/20 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Acción</p>
              <p className="mt-1 text-sm font-medium">{alert.accion}</p>
            </div>
            <div className="bg-muted/20 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Tabla</p>
              <p className="mt-1 text-sm font-medium">{alert.tabla ?? "No especificada"}</p>
            </div>
            <div className="bg-muted/20 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Método / Ruta</p>
              <p className="mt-1 text-sm font-medium">
                {alert.metodo ?? "N/A"} {alert.ruta ?? "N/A"}
              </p>
            </div>
            <div className="bg-muted/20 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Fecha del error</p>
              <p className="mt-1 text-sm font-medium">{formatFecha(alert.fechaHora)}</p>
            </div>
          </div>

          <Separator />

          <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
            <p className="text-destructive text-xs font-semibold tracking-wide uppercase">Mensaje de error</p>
            <p className="text-foreground mt-2 text-sm leading-relaxed">
              {alert.mensajeError ?? "No se registró mensaje de error para este evento."}
            </p>
          </div>
        </CardContent>
      </Card>

      {!isResolved && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-4 w-4 text-amber-600" />
              Guía sugerida de reparación
            </CardTitle>
            <CardDescription>
              Pasos orientativos según el tipo de error registrado. Ejecuta y valida cada punto en orden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {repairSteps.map((step, index) => (
                <li key={step} className="bg-muted/20 rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground mr-2 font-semibold">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referencia rápida</CardTitle>
          <CardDescription>Último error de la misma acción para comparar comportamiento.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRelatedError ? (
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Registro #{recentRelatedError.id.toString()}</p>
              <p className="text-muted-foreground text-xs">{formatFecha(recentRelatedError.fechaHora)}</p>
              <p className="mt-2 text-sm">{recentRelatedError.mensajeError ?? "Sin detalle de error."}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay más errores relacionados con esta acción.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
