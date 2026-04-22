import { NextRequest, NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    traspasos,
    cajas,
    cuentasBancarias,
    movimientosContables,
    categoriasCuentas,
} from "@/lib/db/schema";
import { withAuth } from "@/lib/api-auth";
import { jsonResponse } from "@/lib/serializers";

async function getTraspasoCategoryId(tx = db) {
    const row = await tx
        .select({ id: categoriasCuentas.id })
        .from(categoriasCuentas)
        .where(eq(categoriasCuentas.codigo, "TRASP-001"))
        .limit(1);
    if (row.length) return row[0].id;

    const [created] = await tx
        .insert(categoriasCuentas)
        .values({
            codigo: "TRASP-001",
            nombre: "Traspasos",
            tipo: "Transferencia",
            subtipo: "Interna",
            esDetalle: true,
            activa: true,
            nivel: 1,
        })
        .returning({ id: categoriasCuentas.id });

    return created.id;
}

export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
        const id = params.id;
        const result = await db.query.traspasos.findFirst({
            where: eq(traspasos.id, id),
        });

        if (!result) {
            return NextResponse.json({ success: false, error: "Traspaso no encontrado" }, { status: 404 });
        }

        return jsonResponse({ success: true, data: result });
    } catch (error: any) {
        console.error("GET /api/traspasos/[id] error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});

export const PATCH = withAuth(async (request: NextRequest, { params, user }: { params: { id: string }; user: any }) => {
    try {
        const id = params.id;
        const body = await request.json();
        const { monto, concepto, fecha, origenTipo, origenId, destinoTipo, destinoId } = body;

        const result = await db.transaction(async (tx) => {
            // 1. Get existing transfer
            const existing = await tx.query.traspasos.findFirst({
                where: eq(traspasos.id, id),
            });

            if (!existing) throw new Error("Traspaso no encontrado");

            const oldMonto = Number(existing.monto);

            // 2. Revert old balances
            // Revert Origen (add back)
            if (existing.cajaOrigenId) {
                await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${oldMonto} WHERE id = ${existing.cajaOrigenId}`);
            } else if (existing.bancoOrigenId) {
                const bank = await tx.query.cuentasBancarias.findFirst({ where: eq(cuentasBancarias.id, existing.bancoOrigenId) });
                if (bank?.cuentaContableId) {
                    await tx.execute(sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${oldMonto} WHERE id = ${bank.cuentaContableId}`);
                }
            }

            // Revert Destino (subtract)
            if (existing.cajaDestinoId) {
                await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual - ${oldMonto} WHERE id = ${existing.cajaDestinoId}`);
            } else if (existing.bancoDestinoId) {
                const bank = await tx.query.cuentasBancarias.findFirst({ where: eq(cuentasBancarias.id, existing.bancoDestinoId) });
                if (bank?.cuentaContableId) {
                    await tx.execute(sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual - ${oldMonto} WHERE id = ${bank.cuentaContableId}`);
                }
            }

            // 3. Update the transfer record
            const updatedFecha = fecha || existing.fechaTraspaso;
            await tx.update(traspasos)
                .set({
                    monto: String(monto),
                    conceptoTraspaso: concepto,
                    fechaTraspaso: updatedFecha,
                    cajaOrigenId: origenTipo === "caja" ? origenId : null,
                    bancoOrigenId: origenTipo === "banco" ? origenId : null,
                    cajaDestinoId: destinoTipo === "caja" ? destinoId : null,
                    bancoDestinoId: destinoTipo === "banco" ? destinoId : null,
                })
                .where(eq(traspasos.id, id));

            // 4. Apply new balances
            const newMonto = Number(monto);
            let bankOrigenId: string | null = null;
            let bankDestinoId: string | null = null;

            // New Origen (subtract)
            if (origenTipo === "caja") {
                await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual - ${newMonto} WHERE id = ${origenId}`);
            } else {
                const bank = await tx.query.cuentasBancarias.findFirst({ where: eq(cuentasBancarias.id, origenId) });
                if (!bank) throw new Error("Cuenta bancaria origen no encontrada");
                bankOrigenId = bank.bankId;
                if (bank.cuentaContableId) {
                    await tx.execute(sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual - ${newMonto} WHERE id = ${bank.cuentaContableId}`);
                }
            }

            // New Destino (add)
            if (destinoTipo === "caja") {
                await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${newMonto} WHERE id = ${destinoId}`);
            } else {
                const bank = await tx.query.cuentasBancarias.findFirst({ where: eq(cuentasBancarias.id, destinoId) });
                if (!bank) throw new Error("Cuenta bancaria destino no encontrada");
                bankDestinoId = bank.bankId;
                if (bank.cuentaContableId) {
                    await tx.execute(sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${newMonto} WHERE id = ${bank.cuentaContableId}`);
                }
            }

            // 5. Update Movements
            const descMatch = `Traspaso ${existing.numeroTraspaso}:%`;
            await tx.delete(movimientosContables).where(sql`descripcion LIKE ${descMatch}`);

            const categoriaId = await getTraspasoCategoryId(tx);
            const descripcion = `Traspaso ${existing.numeroTraspaso}: ${concepto}`;

            // Mov origen (salida)
            await tx.insert(movimientosContables).values({
                tipo: "gasto",
                monto: String(monto),
                categoriaId,
                metodo: origenTipo === "banco" ? "banco" : "caja",
                cajaId: origenTipo === "caja" ? origenId : null,
                bankId: bankOrigenId,
                cuentaBancariaId: origenTipo === "banco" ? origenId : null,
                descripcion,
                fecha: updatedFecha,
                usuarioId: user.id,
                updatedAt: new Date().toISOString(),
            });

            // Mov destino (entrada)
            await tx.insert(movimientosContables).values({
                tipo: "ingreso",
                monto: String(monto),
                categoriaId,
                metodo: destinoTipo === "banco" ? "banco" : "caja",
                cajaId: destinoTipo === "caja" ? destinoId : null,
                bankId: bankDestinoId,
                cuentaBancariaId: destinoTipo === "banco" ? destinoId : null,
                descripcion,
                fecha: updatedFecha,
                usuarioId: user.id,
                updatedAt: new Date().toISOString(),
            });

            return { id };
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error("PATCH /api/traspasos/[id] error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
