import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoriasPapeleria } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// GET: devuelve categorías (activas por defecto, todas si ?todos=true)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const todos = searchParams.get("todos") === "true";

    const condicion = todos ? undefined : eq(categoriasPapeleria.activo, true);
    const categorias = await db
      .select({
        id: categoriasPapeleria.id,
        nombre: categoriasPapeleria.nombre,
        descripcion: categoriasPapeleria.descripcion,
        color: categoriasPapeleria.color,
        icono: categoriasPapeleria.icono,
        orden: categoriasPapeleria.orden,
        activo: categoriasPapeleria.activo,
        createdAt: categoriasPapeleria.createdAt,
      })
      .from(categoriasPapeleria)
      .where(condicion)
      .orderBy(categoriasPapeleria.orden, categoriasPapeleria.nombre);

    return jsonResponse({ success: true, data: categorias });
  } catch (error) {
    console.error("Error obteniendo categorías:", error);
    return NextResponse.json({ error: "No se pudo cargar las categorías" }, { status: 500 });
  }
}

const categoriaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  icono: z.string().optional().nullable(),
  orden: z.coerce.number().int().default(0),
  activo: z.boolean().default(true),
});

// POST: crear categoría
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = categoriaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    const [nueva] = await db
      .insert(categoriasPapeleria)
      .values({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion ?? null,
        color: data.color ?? null,
        icono: data.icono ?? null,
        orden: data.orden,
        activo: data.activo,
        updatedAt: now,
      })
      .returning();

    return jsonResponse({ success: true, data: nueva }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando categoría:", error);
    const msg = String(error?.message ?? "");
    if (msg.includes("categorias_papeleria_nombre_key")) {
      return NextResponse.json({ error: "El nombre ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}

const categoriaUpdateSchema = categoriaSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

// PATCH: editar categoría
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = categoriaUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const { id, ...campos } = parsed.data;
    const now = new Date().toISOString();

    const setCampos: Record<string, unknown> = { updatedAt: now };
    if (campos.nombre !== undefined) setCampos.nombre = campos.nombre;
    if (campos.descripcion !== undefined) setCampos.descripcion = campos.descripcion;
    if (campos.color !== undefined) setCampos.color = campos.color;
    if (campos.icono !== undefined) setCampos.icono = campos.icono;
    if (campos.orden !== undefined) setCampos.orden = campos.orden;
    if (campos.activo !== undefined) setCampos.activo = campos.activo;

    const [actualizada] = await db
      .update(categoriasPapeleria)
      .set(setCampos as any)
      .where(eq(categoriasPapeleria.id, BigInt(id!)))
      .returning();

    if (!actualizada) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return jsonResponse({ success: true, data: actualizada });
  } catch (error: any) {
    console.error("Error actualizando categoría:", error);
    const msg = String(error?.message ?? "");
    if (msg.includes("categorias_papeleria_nombre_key")) {
      return NextResponse.json({ error: "El nombre ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar la categoría" }, { status: 500 });
  }
}

// DELETE: eliminar categoría
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(body);

    const [eliminada] = await db
      .delete(categoriasPapeleria)
      .where(eq(categoriasPapeleria.id, BigInt(id)))
      .returning();

    if (!eliminada) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return jsonResponse({ success: true, data: { message: "Categoría eliminada" } });
  } catch (error) {
    console.error("Error eliminando categoría:", error);
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 500 });
  }
}
