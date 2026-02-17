import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql, desc } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { successResponse, errorResponse, CommonErrors } from "@/lib/api-response";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { getPaginationParams, getPaginationOffset, getTotalCount, createPaginatedData } from "@/lib/pagination";
import { validateRequest } from "@/lib/validation";
import { createClienteSchema } from "@/schemas/cliente.schema";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Get pagination parameters
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req);
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const total = await getTotalCount(clientes);

      // Fetch paginated clients
      const allClients = await db
        .select()
        .from(clientes)
        .limit(limit)
        .offset(offset)
        .orderBy(
          sortBy === "nombre"
            ? sortOrder === "asc"
              ? asc(clientes.nombre)
              : desc(clientes.nombre)
            : sortBy === "codigoCliente"
              ? sortOrder === "asc"
                ? asc(clientes.codigoCliente)
                : desc(clientes.codigoCliente)
              : sortOrder === "asc"
                ? asc(clientes.createdAt)
                : desc(clientes.createdAt),
        );

      const serializedClients = JSON.parse(
        JSON.stringify(allClients, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
      );

      return successResponse(createPaginatedData(serializedClients, page, limit, total));
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      return CommonErrors.internalError("Error al obtener clientes");
    }
  },
  { requiredPermission: "clientes:leer" },
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();

      // Validate request body
      const { data: validatedData, error } = await validateRequest(body, createClienteSchema);
      if (error) return error;

      const [newClient] = await db
        .insert(clientes)
        .values({
          ...validatedData,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      return successResponse({ client: newClient }, undefined, 201);
    } catch (error: any) {
      console.error("Error creating client:", error);
      if (error.code === "23505") {
        return errorResponse("El código de cliente ya existe", 409);
      }
      return CommonErrors.internalError("Error al crear cliente");
    }
  },
  { requiredPermission: "clientes:crear" },
);
