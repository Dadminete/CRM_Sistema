import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { cajas, categoriasCuentas, cuentasBancarias, movimientosContables, ventasPapeleria } from "@/lib/db/schema";

async function main() {
  const categoriaIngreso = await db
    .select({ id: categoriasCuentas.id, nombre: categoriasCuentas.nombre })
    .from(categoriasCuentas)
    .where(
      or(
        sql`LOWER(${categoriasCuentas.nombre}) LIKE '%venta%'`,
        sql`LOWER(${categoriasCuentas.nombre}) LIKE '%ingreso%'`
      )
    )
    .limit(1);

  if (!categoriaIngreso[0]?.id) {
    throw new Error("No se encontró una categoría contable de ingreso o venta para registrar ventas históricas.");
  }

  const ventasSinMovimiento = await db
    .select({
      id: ventasPapeleria.id,
      numeroVenta: ventasPapeleria.numeroVenta,
      usuarioId: ventasPapeleria.usuarioId,
      total: ventasPapeleria.total,
      metodoPago: ventasPapeleria.metodoPago,
      cajaId: ventasPapeleria.cajaId,
      cuentaBancariaId: ventasPapeleria.cuentaBancariaId,
      fechaVenta: ventasPapeleria.fechaVenta,
    })
    .from(ventasPapeleria)
    .where(and(eq(ventasPapeleria.estado, "COMPLETADA"), isNull(ventasPapeleria.movimientoContableId)));

  if (ventasSinMovimiento.length === 0) {
    console.log("No hay ventas de papeleria pendientes de reparar.");
    return;
  }

  console.log(`Se encontraron ${ventasSinMovimiento.length} ventas sin movimiento contable.`);

  for (const venta of ventasSinMovimiento) {
    await db.transaction(async (tx) => {
      let bankId: string | null = null;

      if (venta.cuentaBancariaId) {
        const cuenta = await tx
          .select({ bankId: cuentasBancarias.bankId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, venta.cuentaBancariaId))
          .limit(1);

        bankId = cuenta[0]?.bankId ?? null;
      }

      const metodoContable = venta.metodoPago === "EFECTIVO" ? "efectivo" : "banco";

      const [movimiento] = await tx
        .insert(movimientosContables)
        .values({
          tipo: "ingreso",
          monto: venta.total,
          categoriaId: categoriaIngreso[0].id,
          metodo: metodoContable,
          cajaId: venta.metodoPago === "EFECTIVO" ? (venta.cajaId ?? null) : null,
          bankId,
          cuentaBancariaId: venta.metodoPago === "EFECTIVO" ? null : (venta.cuentaBancariaId ?? null),
          descripcion: `Backfill venta de papeleria ${venta.numeroVenta}`,
          fecha: venta.fechaVenta,
          usuarioId: venta.usuarioId,
          updatedAt: new Date().toISOString(),
        })
        .returning({ id: movimientosContables.id });

      await tx
        .update(ventasPapeleria)
        .set({
          movimientoContableId: movimiento.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ventasPapeleria.id, venta.id));

      if (venta.metodoPago === "EFECTIVO" && venta.cajaId) {
        await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${venta.total} WHERE id = ${venta.cajaId}`);
      }
    });

    console.log(`Venta reparada: ${venta.numeroVenta}`);
  }

  console.log("Backfill completado.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando backfill de ventas de papeleria:", error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });