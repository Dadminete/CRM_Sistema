import { NextRequest } from "next/server";

import { eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { verifyPassword } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { RateLimits, withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAuth(
    async (req: NextRequest, { user }) => {
      const body = await req.json().catch(() => null);
      const password = typeof body?.password === "string" ? body.password : "";

      if (!password.trim()) {
        return errorResponse("Debes ingresar tu clave para desbloquear", 400);
      }

      const [dbUser] = await db
        .select({
          passwordHash: usuarios.passwordHash,
          activo: usuarios.activo,
        })
        .from(usuarios)
        .where(eq(usuarios.id, user.id))
        .limit(1);

      if (!dbUser || !dbUser.activo) {
        return errorResponse("Usuario no disponible", 403);
      }

      const isValidPassword = await verifyPassword(password, dbUser.passwordHash);
      if (!isValidPassword) {
        return errorResponse("Clave incorrecta", 401);
      }

      return successResponse({ verified: true });
    },
    { skipAudit: true },
  ),
  RateLimits.auth,
);
