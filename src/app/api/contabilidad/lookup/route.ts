import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoriasCuentas, banks, cuentasBancarias, cajas, cuentasPorPagar, proveedores } from "@/lib/db/schema";
import { eq, asc, and, or, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipoCategoria = searchParams.get("tipoCategoria"); // e.g., "gasto" or "ingreso"

    // 1. Categorías de cuentas — filter by tipo if given, otherwise return all active
    const categoriasQuery = tipoCategoria
      ? db
          .select()
          .from(categoriasCuentas)
          .where(
            and(
              eq(categoriasCuentas.activa, true),
              // Match both lowercase and uppercase since DB may have either
              or(
                eq(categoriasCuentas.tipo, tipoCategoria),
                eq(categoriasCuentas.tipo, tipoCategoria.toUpperCase()),
                eq(categoriasCuentas.tipo, tipoCategoria.toLowerCase()),
              ),
            ),
          )
          .orderBy(asc(categoriasCuentas.codigo))
      : db
          .select()
          .from(categoriasCuentas)
          .where(eq(categoriasCuentas.activa, true))
          .orderBy(asc(categoriasCuentas.codigo));

    // 2. Bancos activos
    const bancosQuery = db.select().from(banks).where(eq(banks.activo, true)).orderBy(asc(banks.nombre));

    // 3. Cuentas bancarias activas con nombre de banco
    const cuentasBancariasQuery = db
      .select({
        id: cuentasBancarias.id,
        numeroCuenta: cuentasBancarias.numeroCuenta,
        tipoCuenta: cuentasBancarias.tipoCuenta,
        moneda: cuentasBancarias.moneda,
        nombreOficialCuenta: cuentasBancarias.nombreOficialCuenta,
        bankId: cuentasBancarias.bankId,
        bankNombre: banks.nombre,
      })
      .from(cuentasBancarias)
      .leftJoin(banks, eq(cuentasBancarias.bankId, banks.id))
      .where(eq(cuentasBancarias.activo, true))
      .orderBy(asc(cuentasBancarias.numeroCuenta));

    // 4. Cajas activas
    const cajasQuery = db.select().from(cajas).where(eq(cajas.activa, true)).orderBy(asc(cajas.nombre));

    // 5. Cuentas por pagar pendientes con proveedor
    const cuentasPorPagarQuery = db
      .select({
        id: cuentasPorPagar.id,
        numeroDocumento: cuentasPorPagar.numeroDocumento,
        concepto: cuentasPorPagar.concepto,
        montoOriginal: cuentasPorPagar.montoOriginal,
        montoPendiente: cuentasPorPagar.montoPendiente,
        proveedorId: cuentasPorPagar.proveedorId,
        proveedorNombre: proveedores.nombre,
      })
      .from(cuentasPorPagar)
      .leftJoin(proveedores, eq(cuentasPorPagar.proveedorId, proveedores.id))
      .where(eq(cuentasPorPagar.estado, "pendiente"))
      .orderBy(asc(cuentasPorPagar.numeroDocumento));

    const [categorias, bancos, cuentasBancariasData, cajasData, cuentasPorPagarData] = await Promise.all([
      categoriasQuery,
      bancosQuery,
      cuentasBancariasQuery,
      cajasQuery,
      cuentasPorPagarQuery,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        categorias,
        bancos,
        cuentasBancarias: cuentasBancariasData,
        cajas: cajasData,
        cuentasPorPagar: cuentasPorPagarData,
      },
    });
  } catch (error: any) {
    console.error("Error fetching lookup data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
