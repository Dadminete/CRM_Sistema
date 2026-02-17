import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";

import { hashPassword } from "@/lib/auth";
import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { usuarios, usuariosRoles } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";
import { validateRequest } from "@/lib/validation";
import { createUserSchema } from "@/schemas/user.schema";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const total = await getTotalCount(usuarios);

      // Fetch paginated users with their roles
      // @ts-ignore - Bypassing Drizzle typing error for query schema
      const allUsers = await (db.query as any).usuarios.findMany({
        limit,
        offset,
        orderBy:
          sortBy === "username"
            ? sortOrder === "asc"
              ? [sql`${usuarios.username} ASC`]
              : [desc(usuarios.username)]
            : sortOrder === "asc"
              ? [sql`${usuarios.createdAt} ASC`]
              : [desc(usuarios.createdAt)],
        with: {
          usuariosRoles_usuarioId: {
            with: {
              role: true,
            },
          },
        },
      });

      const serializedUsers = JSON.parse(
        JSON.stringify(allUsers, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedUsers, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      return CommonErrors.internalError("Error al obtener usuarios");
    }
  },
  { requiredPermission: "usuarios:leer" },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();

      // Validate request body
      const { data: validatedData, error } = await validateRequest(body, createUserSchema);
      if (error) return error;

      const { username, nombre, apellido, email, password, rolId, ...otherData } = validatedData!;

      const result = await db.transaction(async (tx) => {
        // 1. Hash the password
        const passwordHash = await hashPassword(password);

        // 2. Create the user
        const [newUser] = await tx
          .insert(usuarios)
          .values({
            username,
            nombre,
            apellido,
            email: email || null,
            passwordHash,
            activo: otherData.activo ?? true,
            esEmpleado: otherData.esEmpleado ?? false,
            esCliente: otherData.esCliente ?? false,
            telefono: otherData.telefono || null,
            cedula: otherData.cedula || null,
            direccion: otherData.direccion || null,
            fechaNacimiento: otherData.fechaNacimiento || null,
            sexo: otherData.sexo || null,
            notas: otherData.notas || null,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .returning();

        // 3. Assign the role if provided
        if (rolId) {
          await tx.insert(usuariosRoles).values({
            usuarioId: newUser.id,
            rolId: Number(rolId),
            activo: true,
            fechaAsignacion: sql`CURRENT_TIMESTAMP`,
          });
        }

        return newUser;
      });

      return successResponse({ user: result }, undefined, 201);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        return errorResponse("El nombre de usuario o email ya existe", 409);
      }
      return CommonErrors.internalError("Error al crear usuario");
    }
  },
  { requiredPermission: "usuarios:crear" },
);
