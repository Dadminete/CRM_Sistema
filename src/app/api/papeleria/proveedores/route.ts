import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { proveedores } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lista = await db
      .select({
        id: proveedores.id,
        codigo: proveedores.codigo,
        nombre: proveedores.nombre,
        razonSocial: proveedores.razonSocial,
        rnc: proveedores.rnc,
        telefono: proveedores.telefono,
        email: proveedores.email,
        contacto: proveedores.contacto,
      })
      .from(proveedores)
      .where(eq(proveedores.activo, true))
      .orderBy(proveedores.nombre);

    return jsonResponse({ success: true, data: lista });
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return NextResponse.json({ error: "No se pudo cargar los proveedores" }, { status: 500 });
  }
}

function normalizeText(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

// eslint-disable-next-line complexity
function buildProviderPayload(body: Record<string, unknown>, defaults: Partial<Record<string, unknown>> = {}) {
  const normalized = {
    codigo: normalizeText(body.codigo),
    nombre: normalizeText(body.nombre),
    razonSocial: normalizeText(body.razonSocial),
    rnc: normalizeText(body.rnc),
    telefono: normalizeText(body.telefono),
    email: normalizeText(body.email),
    contacto: normalizeText(body.contacto),
  };
  const defaultCode = `PRV-${Date.now().toString().slice(-6)}`;

  return {
    codigo: normalized.codigo ?? String(defaults.codigo ?? defaultCode),
    nombre: normalized.nombre ?? String(defaults.nombre ?? ""),
    razonSocial: normalized.razonSocial ?? (defaults.razonSocial == null ? null : String(defaults.razonSocial)),
    rnc: normalized.rnc ?? (defaults.rnc == null ? null : String(defaults.rnc)),
    telefono: normalized.telefono ?? (defaults.telefono == null ? null : String(defaults.telefono)),
    email: normalized.email ?? (defaults.email == null ? null : String(defaults.email)),
    contacto: normalized.contacto ?? (defaults.contacto == null ? null : String(defaults.contacto)),
    activo: body.activo != null ? Boolean(body.activo) : (defaults.activo ?? true),
  };
}

// eslint-disable-next-line complexity
function buildProviderPatch(body: Record<string, unknown>) {
  const normalized = {
    nombre: normalizeText(body.nombre),
    codigo: normalizeText(body.codigo),
    razonSocial: normalizeText(body.razonSocial),
    rnc: normalizeText(body.rnc),
    telefono: normalizeText(body.telefono),
    email: normalizeText(body.email),
    contacto: normalizeText(body.contacto),
  };

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.nombre !== undefined) patch.nombre = normalized.nombre ?? "";
  if (body.codigo !== undefined) patch.codigo = normalized.codigo ?? `PRV-${Date.now().toString().slice(-6)}`;
  if (body.razonSocial !== undefined) patch.razonSocial = normalized.razonSocial;
  if (body.rnc !== undefined) patch.rnc = normalized.rnc;
  if (body.telefono !== undefined) patch.telefono = normalized.telefono;
  if (body.email !== undefined) patch.email = normalized.email;
  if (body.contacto !== undefined) patch.contacto = normalized.contacto;
  if (body.activo !== undefined) patch.activo = Boolean(body.activo);

  return patch;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const nombre = normalizeText(body.nombre);

    if (!nombre) {
      return jsonResponse({ success: false, error: "El nombre del proveedor es obligatorio" }, { status: 400 });
    }

    const payload = buildProviderPayload(body, { nombre, activo: true });
    const [created] = await db
      .insert(proveedores)
      .values({
        ...payload,
        tipoProveedor: "papeleria",
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return jsonResponse({ success: true, data: created });
  } catch (error) {
    console.error("Error creando proveedor:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "No se pudo crear el proveedor" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = normalizeText(body.id);

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    const patch = buildProviderPatch(body);
    const [updated] = await db.update(proveedores).set(patch).where(eq(proveedores.id, id)).returning();
    return jsonResponse({ success: true, data: updated });
  } catch (error) {
    console.error("Error actualizando proveedor:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar el proveedor" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    await db.delete(proveedores).where(eq(proveedores.id, id));
    return jsonResponse({ success: true, message: "Proveedor eliminado" });
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "No se pudo eliminar el proveedor" },
      { status: 500 },
    );
  }
}
