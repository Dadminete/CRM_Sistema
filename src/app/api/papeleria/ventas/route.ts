import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  ventasPapeleria, 
  detallesVentaPapeleria, 
  productosPapeleria,
  movimientosInventario,
  movimientosContables,
  categoriasCuentas,
  banks,
  cajas,
  cuentasBancarias,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";
import { withAuth } from "@/lib/api-auth";
import { z } from "zod";

// DTO del carrito
const carritoItemSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive(),
  lote: z.string().optional()
});

const ventaPOSSchema = z.object({
  usuarioId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  clienteNombre: z.string().optional(),
  clienteCedula: z.string().optional(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO", "OTRO"]).default("EFECTIVO"),
  cajaId: z.string().uuid().optional(),
  cuentaBancariaId: z.string().uuid().optional(),
  notas: z.string().optional(),
  items: z.array(carritoItemSchema).min(1, "El carrito no puede estar vacío")
});

const ventaUpdateSchema = z.object({
  ventaId: z.string().uuid("ID de venta inválido"),
  clienteNombre: z.string().optional().nullable(),
  clienteCedula: z.string().optional().nullable(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO", "OTRO"]).optional(),
  estado: z.enum(["PENDIENTE", "COMPLETADA", "CANCELADA", "DEVUELTA"]).optional(),
  cajaId: z.string().uuid().optional().nullable(),
  cuentaBancariaId: z.string().uuid().optional().nullable(),
  notas: z.string().optional().nullable(),
  items: z.array(
    z.object({
      detalleId: z.string().uuid("Detalle inválido"),
      cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
      precioUnitario: z.number().positive("El precio debe ser mayor a 0"),
      descuento: z.number().min(0).default(0),
    })
  ).optional(),
});

export async function GET() {
  try {
    const ventasDb = await db
      .select({
        id: ventasPapeleria.id,
        numeroVenta: ventasPapeleria.numeroVenta,
        fechaVenta: ventasPapeleria.fechaVenta,
        clienteNombre: ventasPapeleria.clienteNombre,
        clienteCedula: ventasPapeleria.clienteCedula,
        subtotal: ventasPapeleria.subtotal,
        impuestos: ventasPapeleria.impuestos,
        descuentos: ventasPapeleria.descuentos,
        total: ventasPapeleria.total,
        metodoPago: ventasPapeleria.metodoPago,
        estado: ventasPapeleria.estado,
        notas: ventasPapeleria.notas,
        cajaId: ventasPapeleria.cajaId,
        cuentaBancariaId: ventasPapeleria.cuentaBancariaId,
        cajaNombre: cajas.nombre,
        cuentaBancariaNumero: cuentasBancarias.numeroCuenta,
      })
      .from(ventasPapeleria)
      .leftJoin(cajas, eq(ventasPapeleria.cajaId, cajas.id))
      .leftJoin(cuentasBancarias, eq(ventasPapeleria.cuentaBancariaId, cuentasBancarias.id))
      .orderBy(desc(ventasPapeleria.fechaVenta));

    if (ventasDb.length === 0) {
      return jsonResponse({ success: true, data: [] });
    }

    const ventasIds = ventasDb.map((venta) => venta.id);

    const detallesDb = await db
      .select({
        id: detallesVentaPapeleria.id,
        ventaId: detallesVentaPapeleria.ventaId,
        productoId: detallesVentaPapeleria.productoId,
        nombreProducto: detallesVentaPapeleria.nombreProducto,
        cantidad: detallesVentaPapeleria.cantidad,
        precioUnitario: detallesVentaPapeleria.precioUnitario,
        subtotal: detallesVentaPapeleria.subtotal,
        impuesto: detallesVentaPapeleria.impuesto,
        descuento: detallesVentaPapeleria.descuento,
        total: detallesVentaPapeleria.total,
      })
      .from(detallesVentaPapeleria)
      .where(inArray(detallesVentaPapeleria.ventaId, ventasIds));

    const detallesPorVenta = new Map<string, typeof detallesDb>();

    for (const detalle of detallesDb) {
      const current = detallesPorVenta.get(detalle.ventaId) ?? [];
      current.push(detalle);
      detallesPorVenta.set(detalle.ventaId, current);
    }

    const data = ventasDb.map((venta) => ({
      ...venta,
      items: detallesPorVenta.get(venta.id) ?? [],
    }));

    return jsonResponse({ success: true, data });
  } catch (error: any) {
    console.error("Error listando ventas de papelería:", error);
    return NextResponse.json({ error: "No se pudo cargar el listado de ventas" }, { status: 500 });
  }
}

export const POST = withAuth(async (req: NextRequest, { user }: { user: { id: string } }) => {
  try {
    const body = await req.json();
    const parseResult = ventaPOSSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: "Datos de venta inválidos", details: parseResult.error.format() }, { status: 400 });
    }
    const data = parseResult.data;
    const usuarioId = user.id;

    const categoriaIngreso = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(sql`LOWER(${categoriasCuentas.nombre}) LIKE '%papelería%' OR LOWER(${categoriasCuentas.nombre}) LIKE '%papeleria%'`)
      .limit(1);

    if (!categoriaIngreso[0]?.id) {
      return NextResponse.json(
        { error: "No se encontró una categoría contable de ingreso o venta para registrar la venta." },
        { status: 400 }
      );
    }

    // Procesar transacción
    const resultadoVenta = await db.transaction(async (tx) => {
      // 1. Obtener los IDs de los productos del carrito
      const productIds = data.items.map(item => item.productoId);
      
      // 2. Extraer los productos de la base de datos
      const productosDb = await tx.select().from(productosPapeleria).where(inArray(productosPapeleria.id, productIds));
      
      if (productosDb.length !== productIds.length) {
        throw new Error("Uno o más productos no existen en la base de datos.");
      }

      let subtotalTotal = 0;
      let impuestosTotal = 0;
      let totalFinal = 0;

      const detallesParaInsertar = [];
      const movimientosParaInsertar = [];
      const productosParaActualizar = [];

      // Generar número de venta simple (VP-Timestamp)
      const numeroVenta = `VP-${Date.now()}`;

      // 3. Validar stock, calcular precios y preparar arreglos
      for (const item of data.items) {
        const prodDb = productosDb.find((p) => Number(p.id) === Number(item.productoId));
        if (!prodDb) continue;

        if (prodDb.stockActual < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto: ${prodDb.nombre}`);
        }

        const precioMonto = Number(prodDb.precioVenta);
        const subtotalItem = precioMonto * item.cantidad;
        
        // ITBIS: Calculado solo si aplica (Tú indicaste que estará apagado por defecto)
        let impuestoItem = 0;
        if (prodDb.aplicaImpuesto) {
          impuestoItem = subtotalItem * (Number(prodDb.tasaImpuesto) / 100);
        }

        const totalItem = subtotalItem + impuestoItem;

        subtotalTotal += subtotalItem;
        impuestosTotal += impuestoItem;
        totalFinal += totalItem;

        // Preparar actualización de stock
        productosParaActualizar.push({
          id: prodDb.id,
          nuevoStock: prodDb.stockActual - item.cantidad
        });

        // Preparar líneas de detalle conectadas al producto (aún nos falta el ID de venta, se inyecta después)
        detallesParaInsertar.push({
          productoId: prodDb.id,
          nombreProducto: prodDb.nombre,
          cantidad: item.cantidad,
          precioUnitario: precioMonto.toString(),
          subtotal: subtotalItem.toString(),
          impuesto: impuestoItem.toString(),
          descuento: "0",
          total: totalItem.toString(),
          lote: item.lote,
          cantidadDevuelta: 0
        });

        // Preparar log de inventario
        movimientosParaInsertar.push({
          productoId: prodDb.id,
          usuarioId,
          tipoMovimiento: "SALIDA_VENTA",
          cantidad: item.cantidad,
          cantidadAnterior: prodDb.stockActual,
          cantidadNueva: prodDb.stockActual - item.cantidad,
          motivo: `Venta POS #${numeroVenta}`,
          referencia: numeroVenta
        });
      }

      if (detallesParaInsertar.length === 0) {
        throw new Error("No se pudo construir el detalle de la venta. Verifica los productos seleccionados.");
      }

      // 4. Insertar Cabecera de la VentaPapeleria
      const [nuevaVenta] = await tx.insert(ventasPapeleria).values({
        numeroVenta,
        usuarioId,
        clienteId: data.clienteId,
        clienteNombre: data.clienteNombre,
        clienteCedula: data.clienteCedula,
        subtotal: subtotalTotal.toString(),
        impuestos: impuestosTotal.toString(),
        descuentos: "0",
        total: totalFinal.toString(),
        metodoPago: data.metodoPago as any,
        estado: "COMPLETADA",
        notas: data.notas,
        cajaId: data.cajaId,
        cuentaBancariaId: data.cuentaBancariaId,
        moneda: "DOP", // o dinámico
        updatedAt: new Date().toISOString(),
      }).returning();

      let bankId: string | null = null;
      if (data.cuentaBancariaId) {
        const cuentaBancaria = await tx
          .select({ bankId: cuentasBancarias.bankId })
          .from(cuentasBancarias)
          .where(eq(cuentasBancarias.id, data.cuentaBancariaId))
          .limit(1);

        bankId = cuentaBancaria[0]?.bankId ?? null;
      }

      const metodoContable = data.metodoPago === "EFECTIVO" ? "efectivo" : "banco";

      const [movimientoContable] = await tx
        .insert(movimientosContables)
        .values({
          tipo: "ingreso",
          monto: totalFinal.toString(),
          categoriaId: categoriaIngreso[0].id,
          metodo: metodoContable,
          cajaId: data.metodoPago === "EFECTIVO" ? (data.cajaId ?? null) : null,
          bankId,
          cuentaBancariaId: data.metodoPago === "EFECTIVO" ? null : (data.cuentaBancariaId ?? null),
          descripcion: `Venta de papeleria ${numeroVenta}`,
          fecha: new Date().toISOString(),
          usuarioId,
          updatedAt: new Date().toISOString(),
        })
        .returning({ id: movimientosContables.id });

      await tx
        .update(ventasPapeleria)
        .set({ movimientoContableId: movimientoContable.id })
        .where(eq(ventasPapeleria.id, nuevaVenta.id));

      if (data.metodoPago === "EFECTIVO" && data.cajaId) {
        await tx.execute(sql`UPDATE cajas SET saldo_actual = saldo_actual + ${totalFinal} WHERE id = ${data.cajaId}`);
      }

      // 5. Inyectar el ID de la venta en los detalles e insertarlos
      const detallesConVenta = detallesParaInsertar.map(d => ({ ...d, ventaId: nuevaVenta.id }));
      await tx.insert(detallesVentaPapeleria).values(detallesConVenta);

      // 6. Actualizar Stocks Individuales
      for (const req of productosParaActualizar) {
        await tx.update(productosPapeleria)
          .set({ stockActual: req.nuevoStock })
          .where(eq(productosPapeleria.id, req.id));
      }

      // 7. Generar log/movimientos de inventario
      await tx.insert(movimientosInventario).values(movimientosParaInsertar as any);

      return nuevaVenta;
    });

    return jsonResponse({ 
      success: true, 
      message: "Venta registrada con éxito", 
      venta: resultadoVenta
    });

  } catch (error: any) {
    console.error("Error procesando venta POS:", error);
    return NextResponse.json({ 
      error: error.message || "Error interno del servidor procesando la venta" 
    }, { status: 400 }); // Status 400 por si lanzó error de Stock
  }
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = ventaUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    const ventaActualizada = await db.transaction(async (tx) => {
      const [ventaActual] = await tx
        .select()
        .from(ventasPapeleria)
        .where(eq(ventasPapeleria.id, data.ventaId))
        .limit(1);

      if (!ventaActual) {
        throw new Error("La venta no existe");
      }

      if (data.items && data.items.length > 0) {
        const detallesActuales = await tx
          .select()
          .from(detallesVentaPapeleria)
          .where(eq(detallesVentaPapeleria.ventaId, data.ventaId));

        const detalleMap = new Map(detallesActuales.map((d) => [d.id, d]));

        let nuevoSubtotal = 0;
        let nuevoImpuesto = 0;
        let nuevoDescuento = 0;

        for (const item of data.items) {
          const detalleExistente = detalleMap.get(item.detalleId);
          if (!detalleExistente) {
            throw new Error(`Detalle no encontrado: ${item.detalleId}`);
          }

          const diferenciaCantidad = item.cantidad - detalleExistente.cantidad;

          if (diferenciaCantidad !== 0) {
            const [producto] = await tx
              .select({ id: productosPapeleria.id, stockActual: productosPapeleria.stockActual })
              .from(productosPapeleria)
              .where(eq(productosPapeleria.id, detalleExistente.productoId))
              .limit(1);

            if (!producto) {
              throw new Error("Producto asociado al detalle no encontrado");
            }

            // diferencia > 0 => se vendió más, debe disminuir stock.
            // diferencia < 0 => se vendió menos, se devuelve al stock.
            const nuevoStock = producto.stockActual - diferenciaCantidad;

            if (nuevoStock < 0) {
              throw new Error("Stock insuficiente para aumentar cantidad en la venta");
            }

            await tx
              .update(productosPapeleria)
              .set({ stockActual: nuevoStock })
              .where(eq(productosPapeleria.id, producto.id));
          }

          const subtotalLinea = item.cantidad * item.precioUnitario;
          const descuentoLinea = item.descuento;
          const totalLinea = Math.max(0, subtotalLinea - descuentoLinea);

          nuevoSubtotal += subtotalLinea;
          nuevoDescuento += descuentoLinea;
          nuevoImpuesto += Number(detalleExistente.impuesto ?? "0");

          await tx
            .update(detallesVentaPapeleria)
            .set({
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario.toFixed(2),
              subtotal: subtotalLinea.toFixed(2),
              descuento: descuentoLinea.toFixed(2),
              total: totalLinea.toFixed(2),
            })
            .where(and(eq(detallesVentaPapeleria.id, item.detalleId), eq(detallesVentaPapeleria.ventaId, data.ventaId)));
        }

        await tx
          .update(ventasPapeleria)
          .set({
            subtotal: nuevoSubtotal.toFixed(2),
            descuentos: nuevoDescuento.toFixed(2),
            impuestos: nuevoImpuesto.toFixed(2),
            total: (nuevoSubtotal + nuevoImpuesto - nuevoDescuento).toFixed(2),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(ventasPapeleria.id, data.ventaId));
      }

      if (data.estado === "CANCELADA" && ventaActual.estado !== "CANCELADA") {
        if (ventaActual.cajaId && ventaActual.metodoPago === "EFECTIVO") {
          await tx.update(cajas).set({ saldoActual: sql`${cajas.saldoActual} - ${ventaActual.total}` }).where(eq(cajas.id, ventaActual.cajaId));
        }
        
        if (ventaActual.movimientoContableId) {
          await tx.delete(movimientosContables).where(eq(movimientosContables.id, ventaActual.movimientoContableId));
        }

        const detalles = await tx.select().from(detallesVentaPapeleria).where(eq(detallesVentaPapeleria.ventaId, ventaActual.id));
        for (const d of detalles) {
          const [prod] = await tx.select().from(productosPapeleria).where(eq(productosPapeleria.id, d.productoId)).limit(1);
          if (prod) {
             await tx.update(productosPapeleria).set({ stockActual: prod.stockActual + d.cantidad }).where(eq(productosPapeleria.id, prod.id));
          }
        }
      }

      await tx
        .update(ventasPapeleria)
        .set({
          clienteNombre: data.clienteNombre ?? ventaActual.clienteNombre,
          clienteCedula: data.clienteCedula ?? ventaActual.clienteCedula,
          metodoPago: (data.metodoPago ?? ventaActual.metodoPago) as any,
          estado: (data.estado ?? ventaActual.estado) as any,
          cajaId: data.estado === "CANCELADA" ? null : (data.cajaId === undefined ? ventaActual.cajaId : data.cajaId),
          cuentaBancariaId: data.estado === "CANCELADA" ? null : (data.cuentaBancariaId === undefined ? ventaActual.cuentaBancariaId : data.cuentaBancariaId),
          movimientoContableId: data.estado === "CANCELADA" ? null : ventaActual.movimientoContableId,
          notas: data.notas ?? ventaActual.notas,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ventasPapeleria.id, data.ventaId));

      const [ventaFinal] = await tx
        .select()
        .from(ventasPapeleria)
        .where(eq(ventasPapeleria.id, data.ventaId))
        .limit(1);

      return ventaFinal;
    });

    return jsonResponse({ success: true, message: "Venta actualizada", data: ventaActualizada });
  } catch (error: any) {
    console.error("Error actualizando venta de papelería:", error);
    return NextResponse.json({ error: error.message ?? "No se pudo actualizar la venta" }, { status: 400 });
  }
}