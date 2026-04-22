import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoriasCuentas } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { jsonResponse } from '@/lib/serializers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = db.select().from(categoriasCuentas);

    if (type) {
      // query = query.where(eq(categoriasCuentas.tipo, type));
      // array filtering might be needed if using raw sql or complex query builder
      // for simple query:
      const allCategories = await db.query.categoriasCuentas.findMany({
        where: eq(categoriasCuentas.tipo, type),
        orderBy: [asc(categoriasCuentas.codigo)],
      });
      return jsonResponse({ success: true, data: allCategories });
    }

    const allCategories = await db.query.categoriasCuentas.findMany({
      orderBy: [asc(categoriasCuentas.codigo)],
    });

    return jsonResponse({ success: true, data: allCategories });
  } catch (error: any) {
    console.error("Error fetching account categories:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { codigo, nombre, tipo, padreId, nivel, esDetalle } = body;

    // Basic validation
    if (!codigo || !nombre || !tipo) {
      return jsonResponse({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newCategory = await db
      .insert(categoriasCuentas)
      .values({
        codigo,
        nombre,
        tipo,
        padreId: padreId || null,
        nivel: nivel || 1, // Default to level 1 if not provided
        esDetalle: esDetalle !== undefined ? esDetalle : true, // Default to detail
        activa: true,
      })
      .returning();

    return jsonResponse({ success: true, data: newCategory[0] });
  } catch (error: any) {
    console.error("Error creating account category:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, codigo, nombre, tipo, padreId, nivel, esDetalle, activa } = body;

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const updatedCategory = await db
      .update(categoriasCuentas)
      .set({
        codigo,
        nombre,
        padreId,
        nivel,
        esDetalle,
        activa,
        // tipo is usually not changeable easily if it breaks hierarchy, but allow it for now
        tipo,
      })
      .where(eq(categoriasCuentas.id, id))
      .returning();

    return jsonResponse({ success: true, data: updatedCategory[0] });
  } catch (error: any) {
    console.error("Error updating account category:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    // Check for children before deleting?
    // For now, let DB constraints handle it (set null or restrict)
    // Schema says: padreId foreign key on delete set null.
    // But we might want to prevent deletion if it has children or related accounts.

    await db.delete(categoriasCuentas).where(eq(categoriasCuentas.id, id));

    return jsonResponse({ success: true, message: "Category deleted" });
  } catch (error: any) {
    console.error("Error deleting account category:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}
