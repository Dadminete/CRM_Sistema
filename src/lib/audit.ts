import { db } from "@/lib/db";
import { bitacora } from "@/lib/db/schema";
import { NextRequest } from "next/server";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "IMPORT"
  | "BACKUP"
  | "RESTORE";

export interface AuditLogOptions {
  usuarioId?: string;
  sesionId?: string;
  accion: AuditAction;
  tablaAfectada?: string;
  registroAfectadoId?: string;
  detallesAnteriores?: any;
  detallesNuevos?: any;
  resultado?: "exitoso" | "fallido" | "parcial";
  mensajeError?: string;
  duracionMs?: number;
  req?: NextRequest;
}

/**
 * Log an action to the audit trail (bitacora table)
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    const {
      usuarioId,
      sesionId,
      accion,
      tablaAfectada,
      registroAfectadoId,
      detallesAnteriores,
      detallesNuevos,
      resultado = "exitoso",
      mensajeError,
      duracionMs,
      req,
    } = options;

    // Extract request metadata
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    let metodo: string | null = null;
    let ruta: string | null = null;

    if (req) {
      // Get IP from various headers
      ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

      userAgent = req.headers.get("user-agent") ?? null;
      metodo = req.method;
      ruta = new URL(req.url).pathname;
    }

    // Log to database
    await db.insert(bitacora).values({
      usuarioId: usuarioId ?? null,
      sesionId: sesionId ?? null,
      accion,
      tablaAfectada: tablaAfectada ?? null,
      registroAfectadoId: registroAfectadoId ?? null,
      detallesAnteriores: detallesAnteriores ?? null,
      detallesNuevos: detallesNuevos ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metodo: metodo ?? null,
      ruta: ruta ?? null,
      resultado,
      mensajeError: mensajeError ?? null,
      duracionMs: duracionMs ?? null,
    });
  } catch (error) {
    console.error("Failed to log audit trail:", error);
  }
}

/**
 * Middleware wrapper to log API actions automatically
 */
export function withAuditLog<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  action: AuditAction,
  tableName?: string,
): T {
  return (async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    let resultado: "exitoso" | "fallido" = "exitoso";
    let mensajeError: string | undefined;
    let registroAfectadoId: string | undefined;

    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;

      // Check response status
      if (!response.ok) {
        resultado = "fallido";
        const body = await response.clone().json();
        mensajeError = body.error || "Unknown error";
      } else {
        // Try to extract created/updated record ID from response
        const body = await response.clone().json();
        if (body.data?.id) {
          registroAfectadoId = String(body.data.id);
        }
      }

      // Get user from request context (injected by withAuth)
      const userId = (req as any).user?.id;
      const sessionId = (req as any).user?.sessionId;

      // Log the action
      await logAudit({
        usuarioId: userId,
        sesionId: sessionId,
        accion: action,
        tablaAfectada: tableName,
        registroAfectadoId,
        resultado,
        mensajeError,
        duracionMs: duration,
        req,
      });

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      resultado = "fallido";
      mensajeError = error.message;

      const userId = (req as any).user?.id;
      const sessionId = (req as any).user?.sessionId;

      await logAudit({
        usuarioId: userId,
        sesionId: sessionId,
        accion: action,
        tablaAfectada: tableName,
        resultado,
        mensajeError,
        duracionMs: duration,
        req,
      });

      throw error;
    }
  }) as T;
}

/**
 * Helper to log data changes (before/after)
 */
export async function logDataChange(
  usuarioId: string,
  accion: "CREATE" | "UPDATE" | "DELETE",
  tablaAfectada: string,
  registroAfectadoId: string,
  detallesAnteriores: any | null,
  detallesNuevos: any | null,
  req?: NextRequest,
): Promise<void> {
  await logAudit({
    usuarioId,
    accion,
    tablaAfectada,
    registroAfectadoId,
    detallesAnteriores,
    detallesNuevos,
    req,
  });
}
