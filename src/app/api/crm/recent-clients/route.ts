import { access } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function resolveClientPhotoUrl(fotoUrl: string | null) {
  if (!fotoUrl) return null;
  if (!fotoUrl.startsWith("/uploads/")) return fotoUrl;

  const relativePath = fotoUrl.replace(/^\/uploads\//, "");
  const candidates = [
    path.join(process.cwd(), "public", "uploads", relativePath),
    path.join(process.cwd(), "uploads", relativePath),
  ];

  for (const filePath of candidates) {
    try {
      await access(filePath);
      return fotoUrl;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export async function GET() {
  try {
    const data = await db
      .select({
        id: clientes.id,
        nombre: clientes.nombre,
        apellidos: clientes.apellidos,
        fechaIngreso: clientes.fechaIngreso,
        estado: clientes.estado,
        codigoCliente: clientes.codigoCliente,
        fotoUrl: clientes.fotoUrl,
      })
      .from(clientes)
      .orderBy(desc(clientes.fechaIngreso))
      .limit(10);

    const dataWithSafeAvatar = await Promise.all(
      data.map(async (item) => ({
        ...item,
        fotoUrl: await resolveClientPhotoUrl(item.fotoUrl),
      })),
    );

    return NextResponse.json({ success: true, data: dataWithSafeAvatar });
  } catch (error) {
    console.error("Error fetching recent clients:", error);
    return NextResponse.json({ success: false, error: "Error al cargar clientes recientes" }, { status: 500 });
  }
}
