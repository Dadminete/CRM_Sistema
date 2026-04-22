import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";
import { CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { roles, usuariosRoles } from "@/lib/db/schema";

// GET /api/auth/me-role - Returns the authenticated user's role and admin flag
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const rows = await db
      .select({ nombreRol: roles.nombreRol })
      .from(usuariosRoles)
      .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
      .where(and(eq(usuariosRoles.usuarioId, user.id), eq(usuariosRoles.activo, true)))
      .limit(1);

    const nombreRol = rows.length > 0 ? rows[0].nombreRol : null;
    const isAdmin = nombreRol !== null && nombreRol.toLowerCase().includes("admin");

    return successResponse({ isAdmin, nombreRol, userId: user.id });
  } catch (error: any) {
    console.error("Error fetching user role:", error);
    return CommonErrors.internalError("Error al obtener el rol del usuario");
  }
});
