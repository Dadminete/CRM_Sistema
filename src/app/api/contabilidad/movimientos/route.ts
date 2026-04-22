import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movimientosContables, categoriasCuentas, banks, cuentasBancarias, cajas } from "@/lib/db/schema";
import { eq, desc, and, sql, ne, count } from "drizzle-orm";
import { jsonResponse } from '@/lib/serializers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") || "gasto";
    const excludeTraspasos = searchParams.get("excludeTraspasos") !== "false";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const cajaId = searchParams.get("cajaId");
    const cuentaBancariaId = searchParams.get("cuentaBancariaId");

    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    const isTransferRequest = tipo === "traspaso";
    const isSpecificAccount = !!(cajaId || cuentaBancariaId);
    
    // If it's a transfer type request, we look by category instead of internal "ingreso/gasto" type
    const baseFilters = isTransferRequest && traspasoCatId
      ? [eq(movimientosContables.categoriaId, traspasoCatId)]
      : [eq(movimientosContables.tipo, tipo)];

    // By default, we exclude transfers from general lists unless specifically requested or looking at an account
    if (excludeTraspasos && !isTransferRequest && !isSpecificAccount && traspasoCatId) {
      baseFilters.push(ne(movimientosContables.categoriaId, traspasoCatId));
    }

    if (cajaId) baseFilters.push(eq(movimientosContables.cajaId, cajaId));
    if (cuentaBancariaId) baseFilters.push(eq(movimientosContables.cuentaBancariaId, cuentaBancariaId));

    // Run count and data queries in parallel
    const [countResult, movimientos] = await Promise.all([
      db
        .select({ total: count() })
        .from(movimientosContables)
        .where(and(...baseFilters)),
      db
        .select({
          id: movimientosContables.id,
          tipo: movimientosContables.tipo,
          monto: movimientosContables.monto,
          categoriaId: movimientosContables.categoriaId,
          categoriaNombre: categoriasCuentas.nombre,
          categoriaCodigo: categoriasCuentas.codigo,
          metodo: movimientosContables.metodo,
          cajaId: movimientosContables.cajaId,
          cajaNombre: cajas.nombre,
          bankId: movimientosContables.bankId,
          bankNombre: banks.nombre,
          cuentaBancariaId: movimientosContables.cuentaBancariaId,
          cuentaBancariaNombre: cuentasBancarias.numeroCuenta,
          descripcion: movimientosContables.descripcion,
          fecha: movimientosContables.fecha,
          usuarioId: movimientosContables.usuarioId,
          cuentaPorPagarId: movimientosContables.cuentaPorPagarId,
          createdAt: movimientosContables.createdAt,
        })
        .from(movimientosContables)
        .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
        .leftJoin(banks, eq(movimientosContables.bankId, banks.id))
        .leftJoin(cuentasBancarias, eq(movimientosContables.cuentaBancariaId, cuentasBancarias.id))
        .leftJoin(cajas, eq(movimientosContables.cajaId, cajas.id))
        .where(and(...baseFilters))
        .orderBy(desc(movimientosContables.fecha))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.total ?? 0;

    return jsonResponse({ success: true, data: movimientos, total, limit, offset });
  } catch (error: any) {
    console.error("Error fetching movimientos:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tipo,
      monto,
      categoriaId,
      metodo,
      cajaId,
      bankId,
      cuentaBancariaId,
      descripcion,
      fecha,
      usuarioId,
      cuentaPorPagarId,
    } = body;

    if (!tipo || !monto || !categoriaId || !metodo || !usuarioId) {
      return jsonResponse(
        {
          success: false,
          error: "Campos requeridos: tipo, monto, categoriaId, metodo, usuarioId",
        },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      // 1. Insert Movement
      const [newMovimiento] = await tx
        .insert(movimientosContables)
        .values({
          tipo,
          monto: String(monto),
          categoriaId,
          metodo,
          cajaId: cajaId || null,
          bankId: bankId || null,
          cuentaBancariaId: cuentaBancariaId || null,
          descripcion: descripcion || null,
          fecha: fecha || new Date().toISOString(),
          usuarioId,
          cuentaPorPagarId: cuentaPorPagarId || null,
          updatedAt: new Date().toISOString(),
        })
        .returning();

      // 2. Update Balance if it's a cash movement (caja)
      if (metodo === "efectivo" && cajaId) {
        const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
        await tx.execute(
          sql`UPDATE cajas SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${cajaId}`
        );
      } else if (metodo === "banco" && cuentaBancariaId) {
        // If it's a bank movement, we update the associated accounting account
        const account = await tx
          .select({ id: cuentasBancarias.cuentaContableId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, cuentaBancariaId))
          .limit(1);

        if (account.length > 0 && account[0].id) {
          const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
          await tx.execute(
            sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${account[0].id}`
          );
        }
      }

      return newMovimiento;
    });

    return jsonResponse({ success: true, data: result });
  } catch (error: any) {
    console.error("Error creating movimiento:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      tipo,
      monto,
      categoriaId,
      metodo,
      cajaId,
      bankId,
      cuentaBancariaId,
      descripcion,
      fecha,
      cuentaPorPagarId,
    } = body;

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Get old movement to revert balance
      const oldMov = await tx
        .select()
        .from(movimientosContables)
        .where(eq(movimientosContables.id, id))
        .limit(1);

      if (oldMov.length === 0) throw new Error("Movimiento no encontrado");

      const old = oldMov[0];

      // 2. Revert Old Balance
      if (old.metodo === "efectivo" && old.cajaId) {
        const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
        await tx.execute(
          sql`UPDATE cajas SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${old.cajaId}`
        );
      } else if (old.metodo === "banco" && old.cuentaBancariaId) {
        const account = await tx
          .select({ id: cuentasBancarias.cuentaContableId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, old.cuentaBancariaId))
          .limit(1);

        if (account.length > 0 && account[0].id) {
          const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
          await tx.execute(
            sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${account[0].id}`
          );
        }
      }

      // 3. Update Movement
      const [updated] = await tx
        .update(movimientosContables)
        .set({
          tipo,
          monto: String(monto),
          categoriaId,
          metodo,
          cajaId: cajaId || null,
          bankId: bankId || null,
          cuentaBancariaId: cuentaBancariaId || null,
          descripcion: descripcion || null,
          fecha: fecha || undefined,
          cuentaPorPagarId: cuentaPorPagarId || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(movimientosContables.id, id))
        .returning();

      // 4. Apply New Balance
      if (metodo === "efectivo" && cajaId) {
        const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
        await tx.execute(
          sql`UPDATE cajas SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${cajaId}`
        );
      } else if (metodo === "banco" && cuentaBancariaId) {
        const account = await tx
          .select({ id: cuentasBancarias.cuentaContableId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, cuentaBancariaId))
          .limit(1);

        if (account.length > 0 && account[0].id) {
          const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
          await tx.execute(
            sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${account[0].id}`
          );
        }
      }

      return updated;
    });

    return jsonResponse({ success: true, data: result });
  } catch (error: any) {
    console.error("Error updating movimiento:", error);
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

    await db.transaction(async (tx) => {
      // 1. Get movement to revert balance
      const mov = await tx
        .select()
        .from(movimientosContables)
        .where(eq(movimientosContables.id, id))
        .limit(1);

      if (mov.length > 0) {
        const old = mov[0];
        // 2. Revert Balance
        if (old.metodo === "efectivo" && old.cajaId) {
          const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
          await tx.execute(
            sql`UPDATE cajas SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${old.cajaId}`
          );
        } else if (old.metodo === "banco" && old.cuentaBancariaId) {
          const account = await tx
            .select({ id: cuentasBancarias.cuentaContableId })
            .from(cuentasBancarias)
            .where(eq(cuentasBancarias.id, old.cuentaBancariaId))
            .limit(1);

          if (account.length > 0 && account[0].id) {
            const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
            await tx.execute(
              sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${account[0].id}`
            );
          }
        }
      }

      // 3. Delete Movement
      await tx.delete(movimientosContables).where(eq(movimientosContables.id, id));
    });

    return jsonResponse({ success: true, message: "Movimiento eliminado" });
  } catch (error: any) {
    console.error("Error deleting movimiento:", error);
    return jsonResponse({ success: false, error: error.message }, { status: 500 });
  }
}
