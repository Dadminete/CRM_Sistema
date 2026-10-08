import { and, count, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { isTransferMovementRecord } from "@/lib/contabilidad/transfer-utils";
import { db } from "@/lib/db";
import {
  movimientosContables,
  categoriasCuentas,
  banks,
  cuentasBancarias,
  cajas,
  pagosPagosFijos,
  cuentasPorPagar,
  pagosCuentasPorPagar,
} from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

function calcDiasVencido(fechaVencimiento: string, montoPendiente: number) {
  if (montoPendiente <= 0) return 0;
  const due = new Date(`${fechaVencimiento}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  const diff = Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calcEstado(montoOriginal: number, montoPendiente: number) {
  if (montoPendiente <= 0) return "pagada";
  if (montoPendiente < montoOriginal) return "parcial";
  return "pendiente";
}

async function applyCuentaPorPagarPayment(
  tx: any,
  {
    cuentaPorPagarId,
    monto,
    fecha,
    metodo,
    usuarioId,
    movementId,
  }: {
    cuentaPorPagarId: string;
    monto: number;
    fecha?: string;
    metodo: string;
    usuarioId?: string | null;
    movementId: string;
  },
) {
  const cuenta = await tx
    .select({
      id: cuentasPorPagar.id,
      montoOriginal: cuentasPorPagar.montoOriginal,
      montoPendiente: cuentasPorPagar.montoPendiente,
      fechaVencimiento: cuentasPorPagar.fechaVencimiento,
    })
    .from(cuentasPorPagar)
    .where(eq(cuentasPorPagar.id, cuentaPorPagarId))
    .limit(1);

  if (!cuenta[0]) return;

  const montoOriginal = Number(cuenta[0].montoOriginal ?? 0);
  const applied = Math.max(0, Number(monto ?? 0));
  const previousPayments = await tx
    .select({ total: sql<number>`COALESCE(SUM(CAST(${pagosCuentasPorPagar.monto} AS numeric)), 0)` })
    .from(pagosCuentasPorPagar)
    .where(eq(pagosCuentasPorPagar.cuentaPorPagarId, cuentaPorPagarId));
  const totalPagosPrevios = Number(previousPayments[0]?.total ?? 0);
  const nuevoPendiente = Math.max(0, montoOriginal - (totalPagosPrevios + applied));
  const estado = calcEstado(montoOriginal, nuevoPendiente);
  const fechaPago = (fecha ? String(fecha) : new Date().toISOString()).split("T")[0];

  await tx.insert(pagosCuentasPorPagar).values({
    cuentaPorPagarId,
    monto: String(applied),
    fechaPago,
    metodoPago: metodo,
    numeroReferencia: null,
    observaciones: `[MOV:${movementId}] Pago desde /contabilidad/ingresos-gastos`,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    creadoPor: usuarioId || null,
    updatedAt: new Date().toISOString(),
  });

  await tx
    .update(cuentasPorPagar)
    .set({
      montoPendiente: String(nuevoPendiente),
      estado,
      diasVencido: calcDiasVencido(String(cuenta[0].fechaVencimiento), nuevoPendiente),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(cuentasPorPagar.id, cuentaPorPagarId));
}

function isBankMovement(metodo: string | null | undefined, cuentaBancariaId: string | null | undefined) {
  return metodo !== "efectivo" && !!cuentaBancariaId;
}

function parseAmountToCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  const parts = normalized.split(".");
  if (parts.length > 2) return null;
  const units = parts[0];
  const decimals = parts[1] ?? "";
  const isDigits = (part: string) =>
    part.length > 0 && [...part].every((character) => character >= "0" && character <= "9");
  if (!isDigits(units) || decimals.length > 2 || (parts.length === 2 && !isDigits(decimals))) {
    return null;
  }
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
}

async function revertCuentaPorPagarPaymentByMovement(tx: any, movementId: string) {
  const pagos = await tx
    .select({
      id: pagosCuentasPorPagar.id,
      cuentaPorPagarId: pagosCuentasPorPagar.cuentaPorPagarId,
      monto: pagosCuentasPorPagar.monto,
    })
    .from(pagosCuentasPorPagar)
    .where(sql`${pagosCuentasPorPagar.observaciones} LIKE ${`%[MOV:${movementId}]%`}`)
    .limit(1);

  if (pagos.length === 0) return;

  const pago = pagos[0];
  const cuenta = await tx
    .select({
      id: cuentasPorPagar.id,
      montoOriginal: cuentasPorPagar.montoOriginal,
      montoPendiente: cuentasPorPagar.montoPendiente,
      fechaVencimiento: cuentasPorPagar.fechaVencimiento,
    })
    .from(cuentasPorPagar)
    .where(eq(cuentasPorPagar.id, pago.cuentaPorPagarId))
    .limit(1);

  if (cuenta[0]) {
    const montoOriginal = Number(cuenta[0].montoOriginal ?? 0);
    const pendienteActual = Number(cuenta[0].montoPendiente ?? 0);
    const pagoMonto = Number(pago.monto ?? 0);
    const nuevoPendiente = Math.min(montoOriginal, pendienteActual + pagoMonto);
    const estado = calcEstado(montoOriginal, nuevoPendiente);

    await tx
      .update(cuentasPorPagar)
      .set({
        montoPendiente: String(nuevoPendiente),
        estado,
        diasVencido: calcDiasVencido(String(cuenta[0].fechaVencimiento), nuevoPendiente),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cuentasPorPagar.id, pago.cuentaPorPagarId));
  }

  await tx.delete(pagosCuentasPorPagar).where(eq(pagosCuentasPorPagar.id, pago.id));
}

async function getMovements(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") ?? "gasto";
    const excludeTraspasos = searchParams.get("excludeTraspasos") !== "false";
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10), 1), 100);
    const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = Number.isNaN(rawOffset) ? (page - 1) * limit : Math.max(rawOffset, 0);
    const cajaId = searchParams.get("cajaId");
    const cuentaBancariaId = searchParams.get("cuentaBancariaId");
    const categoriaId = searchParams.get("categoriaId");
    const metodo = searchParams.get("metodo");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = (searchParams.get("search") ?? "").trim();

    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    const isTransferRequest = tipo === "traspaso";
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const isSpecificAccount = !!(cajaId || cuentaBancariaId);

    // If it's a transfer type request, we look by category instead of internal "ingreso/gasto" type
    const baseFilters =
      isTransferRequest && traspasoCatId
        ? [eq(movimientosContables.categoriaId, traspasoCatId)]
        : [eq(movimientosContables.tipo, tipo)];

    // By default, we exclude transfers from general lists unless specifically requested or looking at an account
    if (excludeTraspasos && !isTransferRequest && !isSpecificAccount && traspasoCatId) {
      baseFilters.push(ne(movimientosContables.categoriaId, traspasoCatId));
    }

    if (cajaId) baseFilters.push(eq(movimientosContables.cajaId, cajaId));
    if (cuentaBancariaId) baseFilters.push(eq(movimientosContables.cuentaBancariaId, cuentaBancariaId));
    if (categoriaId) baseFilters.push(eq(movimientosContables.categoriaId, categoriaId));
    if (metodo) baseFilters.push(eq(movimientosContables.metodo, metodo));
    if (startDate) baseFilters.push(gte(movimientosContables.fecha, `${startDate}T00:00:00.000Z`));
    if (endDate) baseFilters.push(lte(movimientosContables.fecha, `${endDate}T23:59:59.999Z`));

    const searchFilter = search
      ? or(
          ilike(categoriasCuentas.nombre, `%${search}%`),
          ilike(categoriasCuentas.codigo, `%${search}%`),
          ilike(movimientosContables.descripcion, `%${search}%`),
          sql`CAST(${movimientosContables.monto} AS TEXT) ILIKE ${`%${search}%`}`,
        )
      : undefined;

    const whereClause = searchFilter ? and(...baseFilters, searchFilter) : and(...baseFilters);

    // Run count and data queries in parallel
    const [countResult, movimientos] = await Promise.all([
      db
        .select({ total: count() })
        .from(movimientosContables)
        .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
        .where(whereClause),
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
        .where(whereClause)
        .orderBy(desc(movimientosContables.fecha))
        .limit(limit)
        .offset(offset),
    ]);

    const filteredMovimientos = (movimientos as Array<Record<string, unknown>>).filter((movement) => {
      if (!excludeTraspasos || isTransferRequest || isSpecificAccount) {
        return true;
      }

      return !isTransferMovementRecord({
        tipo: String(movement.tipo ?? ""),
        categoriaId: movement.categoriaId ? String(movement.categoriaId) : null,
        descripcion: movement.descripcion ? String(movement.descripcion) : null,
        transferCategoryId: traspasoCatId,
      });
    });

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const currentPage = Math.floor(offset / limit) + 1;

    return jsonResponse({
      success: true,
      data: filteredMovimientos,
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching movimientos:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

async function createMovement(req: Request) {
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
      pagoFijoId,
    } = body;

    const normalizedPagoFijoId = typeof pagoFijoId === "string" && pagoFijoId.trim() ? pagoFijoId.trim() : null;
    const normalizedCuentaPorPagarId =
      typeof cuentaPorPagarId === "string" && cuentaPorPagarId.trim() ? cuentaPorPagarId.trim() : null;

    if (!tipo || !monto || !categoriaId || !metodo || !usuarioId) {
      return jsonResponse(
        {
          success: false,
          error: "Campos requeridos: tipo, monto, categoriaId, metodo, usuarioId",
        },
        { status: 400 },
      );
    }

    const totalCents = parseAmountToCents(monto);
    if (totalCents === null || totalCents <= 0) {
      return jsonResponse(
        { success: false, error: "El monto debe ser mayor que cero y tener máximo dos decimales" },
        {
          status: 400,
        },
      );
    }

    type MovementPayment = {
      montoCents: number;
      metodo: string;
      cajaId: string | null;
      bankId: string | null;
      cuentaBancariaId: string | null;
    };

    let payments: MovementPayment[];
    if (body.pagos !== undefined) {
      if (tipo !== "gasto" || metodo !== "mixto" || !Array.isArray(body.pagos) || body.pagos.length !== 2) {
        return jsonResponse(
          { success: false, error: "El pago mixto requiere efectivo y transferencia en un gasto" },
          {
            status: 400,
          },
        );
      }

      payments = [];
      for (const payment of body.pagos) {
        if (!payment || typeof payment !== "object" || !["efectivo", "transferencia"].includes(payment.metodo)) {
          return jsonResponse({ success: false, error: "Los métodos del pago mixto no son válidos" }, { status: 400 });
        }

        const amountCents = parseAmountToCents(payment.monto);
        if (amountCents === null || amountCents <= 0) {
          return jsonResponse(
            { success: false, error: "Cada parte del pago mixto debe ser mayor que cero" },
            {
              status: 400,
            },
          );
        }

        const paymentCajaId = typeof payment.cajaId === "string" ? payment.cajaId : null;
        const paymentBankId = typeof payment.bankId === "string" ? payment.bankId : null;
        const paymentCuentaBancariaId = typeof payment.cuentaBancariaId === "string" ? payment.cuentaBancariaId : null;

        if (payment.metodo === "efectivo" && !paymentCajaId) {
          return jsonResponse({ success: false, error: "Selecciona la caja del pago en efectivo" }, { status: 400 });
        }
        if (payment.metodo === "transferencia" && (!paymentBankId || !paymentCuentaBancariaId)) {
          return jsonResponse(
            { success: false, error: "Selecciona el banco y la cuenta de la transferencia" },
            { status: 400 },
          );
        }

        payments.push({
          montoCents: amountCents,
          metodo: payment.metodo,
          cajaId: paymentCajaId,
          bankId: paymentBankId,
          cuentaBancariaId: paymentCuentaBancariaId,
        });
      }

      if (
        new Set(payments.map((payment) => payment.metodo)).size !== 2 ||
        payments.reduce((sum, payment) => sum + payment.montoCents, 0) !== totalCents
      ) {
        return jsonResponse(
          { success: false, error: "El pago mixto debe incluir efectivo y transferencia y sumar el monto total" },
          { status: 400 },
        );
      }
    } else {
      if (metodo === "mixto") {
        return jsonResponse(
          { success: false, error: "Debes indicar el detalle de cada parte del pago mixto" },
          {
            status: 400,
          },
        );
      }
      payments = [
        {
          montoCents: totalCents,
          metodo,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          cajaId: cajaId || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          bankId: bankId || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          cuentaBancariaId: cuentaBancariaId || null,
        },
      ];
    }

    const result = await db.transaction(async (tx) => {
      const createdMovements = [];
      for (const payment of payments) {
        const paymentAmount = (payment.montoCents / 100).toFixed(2);
        const [newMovimiento] = await tx
          .insert(movimientosContables)
          .values({
            tipo,
            monto: paymentAmount,
            categoriaId,
            metodo: payment.metodo,
            cajaId: payment.cajaId,
            bankId: payment.bankId,
            cuentaBancariaId: payment.cuentaBancariaId,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            descripcion: descripcion || null,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            fecha: fecha || new Date().toISOString(),
            usuarioId,
            cuentaPorPagarId: normalizedCuentaPorPagarId,
            updatedAt: new Date().toISOString(),
          })
          .returning();
        createdMovements.push(newMovimiento);

        if (payment.metodo === "efectivo" && payment.cajaId) {
          const adjustment = tipo === "ingreso" ? payment.montoCents / 100 : -payment.montoCents / 100;
          await tx.execute(
            sql`UPDATE cajas SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${payment.cajaId}`,
          );
        } else if (payment.metodo !== "efectivo" && payment.cuentaBancariaId) {
          const account = await tx
            .select({ id: cuentasBancarias.cuentaContableId })
            .from(cuentasBancarias)
            .where(eq(cuentasBancarias.id, payment.cuentaBancariaId))
            .limit(1);

          if (account.length > 0 && account[0].id) {
            const adjustment = tipo === "ingreso" ? payment.montoCents / 100 : -payment.montoCents / 100;
            await tx.execute(
              sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${account[0].id}`,
            );
          }
        }

        if (tipo === "gasto" && normalizedPagoFijoId) {
          const fechaPago = (fecha ? String(fecha) : new Date().toISOString()).split("T")[0];

          await tx.insert(pagosPagosFijos).values({
            pagoFijoId: normalizedPagoFijoId,
            fechaPago,
            montoPagado: paymentAmount,
            metodoPago: payment.metodo,
            numeroReferencia: null,
            observaciones: `[MOV:${newMovimiento.id}] Pago desde /contabilidad/ingresos-gastos`,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            pagadoPor: usuarioId || null,
          });
        }

        if (tipo === "gasto" && normalizedCuentaPorPagarId) {
          await applyCuentaPorPagarPayment(tx, {
            cuentaPorPagarId: normalizedCuentaPorPagarId,
            monto: payment.montoCents / 100,
            fecha,
            metodo: payment.metodo,
            usuarioId,
            movementId: newMovimiento.id,
          });
        }
      }

      return createdMovements;
    });

    return jsonResponse({ success: true, data: result.length === 1 ? result[0] : result });
  } catch (error: unknown) {
    console.error("Error creating movimiento:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

async function updateMovement(req: Request) {
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
      pagoFijoId,
    } = body;

    const hasPagoFijoField = Object.prototype.hasOwnProperty.call(body, "pagoFijoId");
    const normalizedPagoFijoId = typeof pagoFijoId === "string" && pagoFijoId.trim() ? pagoFijoId.trim() : null;
    const normalizedCuentaPorPagarId =
      typeof cuentaPorPagarId === "string" && cuentaPorPagarId.trim() ? cuentaPorPagarId.trim() : null;

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Get old movement to revert balance
      const oldMov = await tx.select().from(movimientosContables).where(eq(movimientosContables.id, id)).limit(1);

      if (oldMov.length === 0) throw new Error("Movimiento no encontrado");

      const old = oldMov[0];

      await revertCuentaPorPagarPaymentByMovement(tx, id);

      // 2. Revert Old Balance
      if (old.metodo === "efectivo" && old.cajaId) {
        const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
        await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${old.cajaId}`);
      } else if (isBankMovement(old.metodo, old.cuentaBancariaId)) {
        const account = await tx
          .select({ id: cuentasBancarias.cuentaContableId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, old.cuentaBancariaId))
          .limit(1);

        if (account.length > 0 && account[0].id) {
          const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
          await tx.execute(
            sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${account[0].id}`,
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
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          cajaId: cajaId || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          bankId: bankId || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          cuentaBancariaId: cuentaBancariaId || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          descripcion: descripcion || null,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          fecha: fecha || undefined,
          cuentaPorPagarId: normalizedCuentaPorPagarId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(movimientosContables.id, id))
        .returning();

      // 4. Apply New Balance
      if (metodo === "efectivo" && cajaId) {
        const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
        await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${cajaId}`);
      } else if (isBankMovement(metodo, cuentaBancariaId)) {
        const account = await tx
          .select({ id: cuentasBancarias.cuentaContableId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, cuentaBancariaId))
          .limit(1);

        if (account.length > 0 && account[0].id) {
          const adjustment = tipo === "ingreso" ? Number(monto) : -Number(monto);
          await tx.execute(
            sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${adjustment} WHERE id = ${account[0].id}`,
          );
        }
      }

      const fixedPayment = await tx
        .select({ id: pagosPagosFijos.id })
        .from(pagosPagosFijos)
        .where(sql`${pagosPagosFijos.observaciones} LIKE ${`%[MOV:${id}]%`}`)
        .limit(1);

      if (tipo === "gasto" && normalizedPagoFijoId) {
        const fechaPago = (fecha ? String(fecha) : new Date().toISOString()).split("T")[0];
        if (fixedPayment.length > 0) {
          await tx
            .update(pagosPagosFijos)
            .set({
              pagoFijoId: normalizedPagoFijoId,
              fechaPago,
              montoPagado: String(monto),
              metodoPago: metodo,
              observaciones: `[MOV:${id}] Pago desde /contabilidad/ingresos-gastos (actualizado)`,
            })
            .where(eq(pagosPagosFijos.id, fixedPayment[0].id));
        } else {
          await tx.insert(pagosPagosFijos).values({
            pagoFijoId: normalizedPagoFijoId,
            fechaPago,
            montoPagado: String(monto),
            metodoPago: metodo,
            numeroReferencia: null,
            observaciones: `[MOV:${id}] Pago desde /contabilidad/ingresos-gastos`,
            pagadoPor: old.usuarioId ?? null,
          });
        }
      } else if ((tipo !== "gasto" || (hasPagoFijoField && !normalizedPagoFijoId)) && fixedPayment.length > 0) {
        await tx.delete(pagosPagosFijos).where(eq(pagosPagosFijos.id, fixedPayment[0].id));
      }

      if (tipo === "gasto" && normalizedCuentaPorPagarId) {
        await applyCuentaPorPagarPayment(tx, {
          cuentaPorPagarId: normalizedCuentaPorPagarId,
          monto: Number(monto),
          fecha,
          metodo,
          usuarioId: old.usuarioId ?? null,
          movementId: id,
        });
      }

      return updated;
    });

    return jsonResponse({ success: true, data: result });
  } catch (error: unknown) {
    console.error("Error updating movimiento:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

async function deleteMovement(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // 1. Get movement to revert balance
      const mov = await tx.select().from(movimientosContables).where(eq(movimientosContables.id, id)).limit(1);

      if (mov.length > 0) {
        const old = mov[0];
        // 2. Revert Balance
        if (old.metodo === "efectivo" && old.cajaId) {
          const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
          await tx.execute(
            sql`UPDATE cajas SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${old.cajaId}`,
          );
        } else if (isBankMovement(old.metodo, old.cuentaBancariaId)) {
          const account = await tx
            .select({ id: cuentasBancarias.cuentaContableId })
            .from(cuentasBancarias)
            .where(eq(cuentasBancarias.id, old.cuentaBancariaId))
            .limit(1);

          if (account.length > 0 && account[0].id) {
            const revertAmount = old.tipo === "ingreso" ? -Number(old.monto) : Number(old.monto);
            await tx.execute(
              sql`UPDATE cuentas_contables SET saldo_actual = saldo_actual + ${revertAmount} WHERE id = ${account[0].id}`,
            );
          }
        }
      }

      // 3. Delete Movement
      await revertCuentaPorPagarPaymentByMovement(tx, id);
      await tx.delete(pagosPagosFijos).where(sql`${pagosPagosFijos.observaciones} LIKE ${`%[MOV:${id}]%`}`);
      await tx.delete(movimientosContables).where(eq(movimientosContables.id, id));
    });

    return jsonResponse({ success: true, message: "Movimiento eliminado" });
  } catch (error: unknown) {
    console.error("Error deleting movimiento:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = withAuth(async (req) => getMovements(req), { requiredPermission: "contabilidad.balance_general" });
export const POST = withAuth(async (req) => createMovement(req), {
  requiredPermission: "contabilidad.ingresos_gastos",
});
export const PUT = withAuth(async (req) => updateMovement(req), { requiredPermission: "contabilidad.ingresos_gastos" });
export const DELETE = withAuth(async (req) => deleteMovement(req), {
  requiredPermission: "contabilidad.ingresos_gastos",
});
