import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ventasPapeleria, movimientosContables, cajas, productosPapeleria, detallesVentaPapeleria, movimientosInventario } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const anuladas = await db.select().from(ventasPapeleria).where(eq(ventasPapeleria.estado, "CANCELADA"));
  
  const results = [];
  
  for (const venta of anuladas) {
    if (venta.cajaId) {
      // Revertir caja si fue efectivo y aún no se ha descontado
      await db.update(cajas).set({ saldoActual: sql`${cajas.saldoActual} - ${venta.total}` }).where(eq(cajas.id, venta.cajaId));
      
      // Para no volver a descontar si llamamos esto de nuevo, le quitamos el cajaId (como un truco de flag de que ya se limpió) o mejor validamos en el script original.
      await db.update(ventasPapeleria).set({ cajaId: null }).where(eq(ventasPapeleria.id, venta.id));
      
      results.push(`Reverted ${venta.total} from caja ${venta.cajaId} for sale ${venta.numeroVenta}`);
    }
    
    if (venta.movimientoContableId) {
      await db.delete(movimientosContables).where(eq(movimientosContables.id, venta.movimientoContableId));
      await db.update(ventasPapeleria).set({ movimientoContableId: null }).where(eq(ventasPapeleria.id, venta.id));
      results.push(`Deleted accounting movement ${venta.movimientoContableId} for sale ${venta.numeroVenta}`);
    }
  }
  return NextResponse.json({ success: true, results, count: anuladas.length });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack });
  }
}
