import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cajas } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

export async function GET() {
  try {
    const rows = await db
      .select({ id: cajas.id, nombre: cajas.nombre, saldoActual: cajas.saldoActual, activa: cajas.activa })
      .from(cajas)
      .where(eq(cajas.activa, true))
      .orderBy(desc(cajas.nombre));
    return jsonResponse({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET /api/traspasos/cuentas/cajas error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}