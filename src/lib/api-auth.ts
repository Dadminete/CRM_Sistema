import { NextRequest, NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { logAudit } from "@/lib/audit";
import { verifyToken, getUserBySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { permisos, rolesPermisos, usuariosRoles, usuariosPermisos } from "@/lib/db/schema";

export interface AuthenticatedUser {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string | null;
  avatar: string | null;
  activo: boolean;
  sessionId: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  hasPermission: (permission: string) => Promise<boolean>;
}

/**
 * Get all permissions for a user (from roles and direct permissions)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  // Get permissions from user's roles
  const rolePermissions = await db
    .select({
      nombrePermiso: permisos.nombrePermiso,
    })
    .from(usuariosRoles)
    .innerJoin(rolesPermisos, eq(usuariosRoles.rolId, rolesPermisos.rolId))
    .innerJoin(permisos, eq(rolesPermisos.permisoId, permisos.id))
    .where(
      and(
        eq(usuariosRoles.usuarioId, userId),
        eq(usuariosRoles.activo, true),
        eq(rolesPermisos.activo, true),
        eq(permisos.activo, true),
      ),
    );

  // Get direct permissions assigned to user
  const directPermissions = await db
    .select({
      nombrePermiso: permisos.nombrePermiso,
    })
    .from(usuariosPermisos)
    .innerJoin(permisos, eq(usuariosPermisos.permisoId, permisos.id))
    .where(and(eq(usuariosPermisos.usuarioId, userId), eq(usuariosPermisos.activo, true), eq(permisos.activo, true)));

  // Combine and deduplicate
  const allPermissions = [
    ...rolePermissions.map((p) => p.nombrePermiso),
    ...directPermissions.map((p) => p.nombrePermiso),
  ];

  return [...new Set(allPermissions)];
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(userId: string, requiredPermission: string): Promise<boolean> {
  // Check if user is superadmin (has all permissions)
  const permissions = await getUserPermissions(userId);

  // Superadmin bypass: if user has 'superadmin' or '*' permission, grant all access
  if (permissions.includes("superadmin") || permissions.includes("*")) {
    return true;
  }

  return permissions.includes(requiredPermission);
}

/**
 * Extract and verify authentication from request
 */
async function authenticate(req: NextRequest): Promise<AuthenticatedUser | null> {
  // Get token from cookie
  const token = req.cookies.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Get user from session
  const user = await getUserBySession(payload.sessionId);
  if (!user) {
    return null;
  }

  // Check if user is active
  if (!user.activo) {
    return null;
  }

  return {
    ...user,
    sessionId: payload.sessionId,
  };
}

/**
 * Higher-order function to protect API routes with authentication and optional permissions
 */
export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<Response>,
  options?: {
    requiredPermission?: string;
    skipAudit?: boolean;
  },
) {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = Date.now();
    let resultado: "exitoso" | "fallido" = "exitoso";
    let mensajeError: string | undefined;

    try {
      // Authenticate user
      const user = await authenticate(req);

      if (!user) {
        resultado = "fallido";
        mensajeError = "No autenticado";

        if (!options?.skipAudit) {
          await logAudit({
            accion: "READ",
            resultado: "fallido",
            mensajeError,
            duracionMs: Date.now() - startTime,
            req,
          });
        }

        return NextResponse.json(
          { success: false, error: "No autenticado. Por favor, inicia sesión." },
          { status: 401 },
        );
      }

      // Check required permission if specified
      if (options?.requiredPermission) {
        const hasPermission = await checkPermission(user.id, options.requiredPermission);

        if (!hasPermission) {
          resultado = "fallido";
          mensajeError = `Permiso denegado: ${options.requiredPermission}`;

          if (!options?.skipAudit) {
            await logAudit({
              usuarioId: user.id,
              sesionId: user.sessionId,
              accion: "READ",
              resultado: "fallido",
              mensajeError,
              duracionMs: Date.now() - startTime,
              req,
            });
          }

          return NextResponse.json(
            {
              success: false,
              error: "No tienes permisos para realizar esta acción.",
              requiredPermission: options.requiredPermission,
            },
            { status: 403 },
          );
        }
      }

      // Create auth context
      const authContext: AuthContext = {
        user,
        hasPermission: (permission: string) => checkPermission(user.id, permission),
      };

      // Call the actual handler
      const response = await handler(req, authContext);

      // Check response status
      if (!response.ok) {
        resultado = "fallido";
        const body = await response.clone().json();
        mensajeError = body.error || "Unknown error";
      }

      // Auto-log API access (if not skipped)
      if (!options?.skipAudit) {
        const action = getActionFromMethod(req.method);
        await logAudit({
          usuarioId: user.id,
          sesionId: user.sessionId,
          accion: action,
          resultado,
          mensajeError,
          duracionMs: Date.now() - startTime,
          req,
        });
      }

      return response;
    } catch (error: any) {
      console.error("Error en autenticación de API:", error);
      resultado = "fallido";
      mensajeError = error.message;

      return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
    }
  };
}

/**
 * Map HTTP method to audit action
 */
function getActionFromMethod(method: string): "CREATE" | "READ" | "UPDATE" | "DELETE" {
  switch (method) {
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "READ";
  }
}

/**
 * Extract request IP address
 */
export function getClientIp(req: NextRequest): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get("user-agent") ?? undefined;
}
