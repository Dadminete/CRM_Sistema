import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cuentasBancarias, banks } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: cuentasBancarias.id,
        numeroCuenta: cuentasBancarias.numeroCuenta,
        bancoNombre: banks.nombre,
        bankId: banks.id,
        cuentaContableId: cuentasBancarias.cuentaContableId,
        activo: cuentasBancarias.activo,
      })
      .from(cuentasBancarias)
      .leftJoin(banks, eq(cuentasBancarias.bankId, banks.id))
      .where(eq(cuentasBancarias.activo, true))
      .orderBy(desc(cuentasBancarias.createdAt));

    return jsonResponse({ success: true, data: rows });
  } catch (error: any) {
    console.error("GET /api/traspasos/cuentas/bancos error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}