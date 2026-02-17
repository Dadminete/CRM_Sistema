import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pagosClientes,
  cuentasPorCobrar,
  facturasClientes,
  movimientosContables,
  sesionesCaja,
  clientes,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      facturaId,
      clienteId,
      monto,
      metodoPago,
      numeroReferencia,
      cajaId,
      cuentaBancariaId,
      observaciones,
      usuarioId = "00000000-0000-0000-0000-000000000000",
    } = body;

    // 1. Validar que la factura existe y tiene balance pendiente
    const cxc = await db.select().from(cuentasPorCobrar).where(eq(cuentasPorCobrar.facturaId, facturaId)).limit(1);

    if (cxc.length === 0) {
      return NextResponse.json(
        { success: false, error: "Factura no encontrada en cuentas por cobrar." },
        { status: 404 },
      );
    }

    const balanceActual = Number(cxc[0].montoPendiente);
    const montoAPagar = Number(monto);

    if (montoAPagar <= 0) {
      return NextResponse.json({ success: false, error: "El monto a pagar debe ser mayor a 0." }, { status: 400 });
    }

    if (montoAPagar > balanceActual) {
      return NextResponse.json(
        { success: false, error: "El monto no puede ser mayor al balance pendiente." },
        { status: 400 },
      );
    }

    // 2. Si el pago es en efectivo, validar sesión de caja abierta
    if (metodoPago === "efectivo") {
      if (!cajaId) {
        return NextResponse.json(
          { success: false, error: "Debe seleccionar una caja para pagos en efectivo." },
          { status: 400 },
        );
      }

      const session = await db
        .select()
        .from(sesionesCaja)
        .where(and(eq(sesionesCaja.cajaId, cajaId), eq(sesionesCaja.estado, "abierta")))
        .limit(1);

      if (session.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "La caja seleccionada está cerrada. Debe abrirla para procesar el pago.",
          },
          { status: 403 },
        );
      }
    }

    // 0. Obtener una categoría válida para el movimiento (Ingreso)
    const categoria = await db.query.categoriasCuentas.findFirst({
      where: (categorias, { eq, or, ilike }) =>
        or(
          ilike(categorias.nombre, "%ingreso%"),
          ilike(categorias.nombre, "%venta%"),
          ilike(categorias.nombre, "%factur%"),
        ),
    });

    // Si no existe ninguna, usar null o lanzar error (dependiendo de si el campo es nullable, en schema es notNull)
    // En schema: categoriaId: uuid("categoria_id").notNull()
    if (!categoria) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se encontró una categoría válida para registrar el ingreso. Por favor cree una categoría de 'Ingresos' o 'Ventas' en contabilidad.",
        },
        { status: 400 },
      );
    }

    // 0.1 Obtener nombre del cliente
    const clienteData = await db
      .select({ nombre: clientes.nombre, apellidos: clientes.apellidos })
      .from(clientes)
      .where(eq(clientes.id, clienteId))
      .limit(1);

    const nombreCliente =
      clienteData.length > 0 ? `${clienteData[0].nombre} ${clienteData[0].apellidos}`.trim() : "Cliente Desconocido";

    // 3. Procesar el pago (Transacción)
    const result = await db.transaction(async (tx) => {
      // A. Generar número de pago correlativo
      const lastPago = await tx
        .select({ num: pagosClientes.numeroPago })
        .from(pagosClientes)
        .orderBy(desc(pagosClientes.numeroPago))
        .limit(1);

      let nextNum = "PAG-0001";
      if (lastPago.length > 0) {
        const current = parseInt(lastPago[0].num.split("-")[1]);
        nextNum = `PAG-${(current + 1).toString().padStart(4, "0")}`;
      }

      // B. Insertar registro de pago
      const [pago] = await tx
        .insert(pagosClientes)
        .values({
          facturaId,
          clienteId,
          numeroPago: nextNum,
          fechaPago: new Date().toISOString().split("T")[0],
          monto: monto.toString(),
          metodoPago,
          numeroReferencia,
          cajaId,
          cuentaBancariaId,
          recibidoPor: usuarioId,
          observaciones,
          updatedAt: new Date().toISOString(),
        })
        .returning();

      // C. Actualizar cuenta por cobrar
      const nuevoBalance = balanceActual - montoAPagar;
      const nuevoEstado = nuevoBalance === 0 ? "pagado" : "parcial";

      await tx
        .update(cuentasPorCobrar)
        .set({
          montoPendiente: nuevoBalance.toString(),
          estado: nuevoEstado,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cuentasPorCobrar.facturaId, facturaId));

      // D. Actualizar estado de la factura
      await tx
        .update(facturasClientes)
        .set({
          estado: nuevoEstado,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(facturasClientes.id, facturaId));

      // E. Crear movimiento contable (Ingreso)
      await tx.insert(movimientosContables).values({
        tipo: "ingreso",
        monto: monto.toString(),
        categoriaId: categoria.id,
        metodo: metodoPago,
        cajaId,
        cuentaBancariaId,
        descripcion: `Pago de factura ${nextNum} - ${nombreCliente}`,
        fecha: new Date().toISOString(),
        usuarioId,
        updatedAt: new Date().toISOString(),
      });

      return pago;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
