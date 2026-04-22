import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoriasPapeleria, productosPapeleria } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// GET: devuelve todos los productos (incluye inactivos si ?todos=true)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoriaId");
    const todos = searchParams.get("todos") === "true";

    const condiciones: ReturnType<typeof eq>[] = [];

    if (!todos) condiciones.push(eq(productosPapeleria.activo, true));
    if (categoriaId) condiciones.push(eq(productosPapeleria.categoriaId, parseInt(categoriaId)));

    const productosDb = await db
      .select({
        id: productosPapeleria.id,
        codigo: productosPapeleria.codigo,
        codigoBarras: productosPapeleria.codigoBarras,
        nombre: productosPapeleria.nombre,
        descripcion: productosPapeleria.descripcion,
        marca: productosPapeleria.marca,
        modelo: productosPapeleria.modelo,
        unidadMedida: productosPapeleria.unidadMedida,
        precioCompra: productosPapeleria.precioCompra,
        precioVenta: productosPapeleria.precioVenta,
        margenGanancia: productosPapeleria.margenGanancia,
        stockMinimo: productosPapeleria.stockMinimo,
        stockActual: productosPapeleria.stockActual,
        ubicacion: productosPapeleria.ubicacion,
        imagen: productosPapeleria.imagen,
        activo: productosPapeleria.activo,
        categoriaId: productosPapeleria.categoriaId,
        proveedorId: productosPapeleria.proveedorId,
        aplicaImpuesto: productosPapeleria.aplicaImpuesto,
        tasaImpuesto: productosPapeleria.tasaImpuesto,
        costoPromedio: productosPapeleria.costoPromedio,
        createdAt: productosPapeleria.createdAt,
        categoria: {
          id: categoriasPapeleria.id,
          nombre: categoriasPapeleria.nombre,
          color: categoriasPapeleria.color,
        },
      })
      .from(productosPapeleria)
      .leftJoin(categoriasPapeleria, eq(productosPapeleria.categoriaId, categoriasPapeleria.id))
      .where(condiciones.length > 0 ? and(...condiciones) : undefined);

    return jsonResponse({ success: true, data: productosDb });
  } catch (error) {
    console.error("Error obteniendo productos de papelería:", error);
    return NextResponse.json({ error: "No se pudo cargar el catálogo de productos" }, { status: 500 });
  }
}

const productoSchema = z.object({
  codigo: z.string().min(1),
  codigoBarras: z.string().optional().nullable(),
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  categoriaId: z.coerce.number().int().positive(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  unidadMedida: z.string().min(1),
  precioCompra: z.coerce.number().min(0),
  precioVenta: z.coerce.number().min(0),
  margenGanancia: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().int().min(0).default(0),
  stockActual: z.coerce.number().int().min(0).default(0),
  ubicacion: z.string().optional().nullable(),
  imagen: z.string().optional().nullable(),
  activo: z.boolean().default(true),
  proveedorId: z.string().uuid().optional().nullable(),
  aplicaImpuesto: z.boolean().default(false),
  tasaImpuesto: z.coerce.number().min(0).default(0),
  costoPromedio: z.coerce.number().min(0).default(0),
});

// POST: crear nuevo producto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = productoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    const [nuevo] = await db
      .insert(productosPapeleria)
      .values({
        codigo: data.codigo,
        codigoBarras: data.codigoBarras ?? null,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        categoriaId: data.categoriaId,
        marca: data.marca ?? null,
        modelo: data.modelo ?? null,
        unidadMedida: data.unidadMedida,
        precioCompra: data.precioCompra.toString(),
        precioVenta: data.precioVenta.toString(),
        margenGanancia: data.margenGanancia.toString(),
        stockMinimo: data.stockMinimo,
        stockActual: data.stockActual,
        ubicacion: data.ubicacion ?? null,
        imagen: data.imagen ?? null,
        activo: data.activo,
        proveedorId: data.proveedorId ?? null,
        aplicaImpuesto: data.aplicaImpuesto,
        tasaImpuesto: data.tasaImpuesto.toString(),
        costoPromedio: data.costoPromedio.toString(),
        updatedAt: now,
      })
      .returning();

    return jsonResponse({ success: true, data: nuevo }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando producto:", error);
    const msg = String(error?.message ?? "");
    if (msg.includes("productos_papeleria_codigo_key")) {
      return NextResponse.json({ error: "El código ya está en uso" }, { status: 409 });
    }
    if (msg.includes("productos_papeleria_codigo_barras_key")) {
      return NextResponse.json({ error: "El código de barras ya está en uso" }, { status: 409 });
    }
    return NextResponse.json({ 
      error: "No se pudo crear el producto", 
      detail: msg,
      code: error?.code,
      pgDetail: error?.detail,
    }, { status: 500 });
  }
}

const productoUpdateSchema = productoSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

// PATCH: editar producto existente
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = productoUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const { id, ...campos } = parsed.data;
    const now = new Date().toISOString();

    const setCampos: Record<string, unknown> = { updatedAt: now };
    if (campos.codigo !== undefined) setCampos.codigo = campos.codigo;
    if (campos.codigoBarras !== undefined) setCampos.codigoBarras = campos.codigoBarras;
    if (campos.nombre !== undefined) setCampos.nombre = campos.nombre;
    if (campos.descripcion !== undefined) setCampos.descripcion = campos.descripcion;
    if (campos.categoriaId !== undefined) setCampos.categoriaId = campos.categoriaId;
    if (campos.marca !== undefined) setCampos.marca = campos.marca;
    if (campos.modelo !== undefined) setCampos.modelo = campos.modelo;
    if (campos.unidadMedida !== undefined) setCampos.unidadMedida = campos.unidadMedida;
    if (campos.precioCompra !== undefined) setCampos.precioCompra = String(campos.precioCompra);
    if (campos.precioVenta !== undefined) setCampos.precioVenta = String(campos.precioVenta);
    if (campos.margenGanancia !== undefined) setCampos.margenGanancia = String(campos.margenGanancia);
    if (campos.stockMinimo !== undefined) setCampos.stockMinimo = campos.stockMinimo;
    if (campos.stockActual !== undefined) setCampos.stockActual = campos.stockActual;
    if (campos.ubicacion !== undefined) setCampos.ubicacion = campos.ubicacion;
    if (campos.imagen !== undefined) setCampos.imagen = campos.imagen;
    if (campos.activo !== undefined) setCampos.activo = campos.activo;
    if (campos.proveedorId !== undefined) setCampos.proveedorId = campos.proveedorId;
    if (campos.aplicaImpuesto !== undefined) setCampos.aplicaImpuesto = campos.aplicaImpuesto;
    if (campos.tasaImpuesto !== undefined) setCampos.tasaImpuesto = String(campos.tasaImpuesto);
    if (campos.costoPromedio !== undefined) setCampos.costoPromedio = String(campos.costoPromedio);

    const [actualizado] = await db
      .update(productosPapeleria)
      .set(setCampos as any)
      .where(eq(productosPapeleria.id, BigInt(id!)))
      .returning();

    if (!actualizado) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return jsonResponse({ success: true, data: actualizado });
  } catch (error: any) {
    console.error("Error actualizando producto:", error);
    const msg = String(error?.message ?? "");
    if (msg.includes("productos_papeleria_codigo_key")) {
      return NextResponse.json({ error: "El código ya está en uso" }, { status: 409 });
    }
    if (msg.includes("productos_papeleria_codigo_barras_key")) {
      return NextResponse.json({ error: "El código de barras ya está en uso" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el producto" }, { status: 500 });
  }
}

// DELETE: eliminar producto
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(body);

    const [eliminado] = await db
      .delete(productosPapeleria)
      .where(eq(productosPapeleria.id, BigInt(id)))
      .returning();

    if (!eliminado) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return jsonResponse({ success: true, data: { message: "Producto eliminado" } });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    return NextResponse.json({ error: "No se pudo eliminar el producto" }, { status: 500 });
  }
}
