import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { categoriasCuentas } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

const ACCOUNT_TYPE_PREFIX: Record<string, string> = {
  ACTIVO: "1",
  PASIVO: "2",
  CAPITAL: "3",
  INGRESOS: "4",
  COSTOS: "5",
  GASTOS: "6",
};

const ACCOUNT_TYPE_ALIASES: Record<string, string> = {
  ACTIVO: "ACTIVO",
  ACTIVOS: "ACTIVO",
  PASIVO: "PASIVO",
  PASIVOS: "PASIVO",
  CAPITAL: "CAPITAL",
  PATRIMONIO: "CAPITAL",
  INGRESO: "INGRESOS",
  INGRESOS: "INGRESOS",
  COSTO: "COSTOS",
  COSTOS: "COSTOS",
  GASTO: "GASTOS",
  GASTOS: "GASTOS",
};

type CategoryRecord = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  subtipo: string | null;
  padreId: string | null;
  nivel: number;
  esDetalle: boolean;
  activa: boolean;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeAccountType(rawType: unknown) {
  const value = normalizeText(rawType)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return ACCOUNT_TYPE_ALIASES[value] ?? "";
}

function sanitizeCode(rawCode: unknown) {
  return normalizeText(rawCode).replace(/\s+/g, "").toUpperCase();
}

function getCodeParts(codigo: string) {
  return codigo
    .split("-")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => Number(segment))
    .filter((segment) => Number.isFinite(segment));
}

function padSegment(value: number) {
  return String(value).padStart(2, "0");
}

async function buildAutoCode(input: { tipo: string; padreId: string | null; parent?: CategoryRecord | null }) {
  const { tipo, padreId, parent } = input;
  const typePrefix = ACCOUNT_TYPE_PREFIX[tipo];

  if (!typePrefix) {
    throw new Error("Tipo de cuenta inválido para generar código automático");
  }

  if (padreId && parent) {
    const children = await db.query.categoriasCuentas.findMany({
      where: eq(categoriasCuentas.padreId, padreId),
      orderBy: [asc(categoriasCuentas.codigo)],
    });

    const nextSegment = children.reduce((maxValue, child) => {
      const parts = getCodeParts(child.codigo);
      const value = parts[parts.length - 1] ?? 0;
      return value > maxValue ? value : maxValue;
    }, 0);

    return `${parent.codigo}-${padSegment(nextSegment + 1)}`;
  }

  const rootCategories = await db.query.categoriasCuentas.findMany({
    where: and(eq(categoriasCuentas.tipo, tipo), isNull(categoriasCuentas.padreId)),
    orderBy: [asc(categoriasCuentas.codigo)],
  });

  const nextRootSegment = rootCategories.reduce((maxValue, item) => {
    const parts = getCodeParts(item.codigo);
    if (parts[0] !== Number(typePrefix)) return maxValue;
    const rootSegment = parts[1] ?? 0;
    return rootSegment > maxValue ? rootSegment : maxValue;
  }, 0);

  return `${typePrefix}-${padSegment(nextRootSegment + 1)}`;
}

async function ensureUniqueCode(codigo: string, excludeId?: string) {
  const normalizedCode = sanitizeCode(codigo);
  const existing = await db.query.categoriasCuentas.findFirst({
    where: excludeId
      ? and(eq(categoriasCuentas.codigo, normalizedCode), ne(categoriasCuentas.id, excludeId))
      : eq(categoriasCuentas.codigo, normalizedCode),
  });

  if (existing) {
    throw new Error(`El código ${normalizedCode} ya existe`);
  }

  return normalizedCode;
}

async function resolveParent(padreId: string | null) {
  if (!padreId) return null;
  const parent = await db.query.categoriasCuentas.findFirst({ where: eq(categoriasCuentas.id, padreId) });
  if (!parent) {
    throw new Error("La cuenta padre seleccionada no existe");
  }
  return parent as CategoryRecord;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const normalizedType = normalizeAccountType(searchParams.get("type"));

    const allCategories = await db.query.categoriasCuentas.findMany({
      where: normalizedType ? eq(categoriasCuentas.tipo, normalizedType) : undefined,
      orderBy: [asc(categoriasCuentas.codigo)],
    });

    return jsonResponse({ success: true, data: allCategories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error fetching account categories:", error);
    return jsonResponse({ success: false, error: message }, { status: 500 });
  }
}

// eslint-disable-next-line complexity
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nombre = normalizeText(body.nombre);
    const subtipo = normalizeText(body.subtipo) || null;
    const tipo = normalizeAccountType(body.tipo);
    const padreId = normalizeText(body.padreId) || null;
    const esDetalle = typeof body.esDetalle === "boolean" ? body.esDetalle : true;
    const activa = typeof body.activa === "boolean" ? body.activa : true;

    if (!nombre || !tipo) {
      return jsonResponse(
        {
          success: false,
          error: "Nombre y tipo son obligatorios",
        },
        { status: 400 },
      );
    }

    const parent = await resolveParent(padreId);
    if (parent && normalizeAccountType(parent.tipo) !== tipo) {
      return jsonResponse(
        {
          success: false,
          error: "La cuenta hija debe tener el mismo tipo que su cuenta padre",
        },
        { status: 400 },
      );
    }

    const nivel = parent ? parent.nivel + 1 : 1;
    const providedCode = sanitizeCode(body.codigo);
    const generatedCode = providedCode || (await buildAutoCode({ tipo, padreId, parent }));
    const codigo = await ensureUniqueCode(generatedCode);

    const newCategory = await db
      .insert(categoriasCuentas)
      .values({
        codigo,
        nombre,
        tipo,
        subtipo,
        padreId,
        nivel,
        esDetalle,
        activa,
      })
      .returning();

    return jsonResponse({ success: true, data: newCategory[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error creating account category:", error);
    return jsonResponse({ success: false, error: message }, { status: 500 });
  }
}

// eslint-disable-next-line complexity
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = normalizeText(body.id);

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const currentCategory = await db.query.categoriasCuentas.findFirst({
      where: eq(categoriasCuentas.id, id),
    });

    if (!currentCategory) {
      return jsonResponse({ success: false, error: "Categoría no encontrada" }, { status: 404 });
    }

    const nombre = normalizeText(body.nombre) || currentCategory.nombre;
    const tipo = normalizeAccountType(body.tipo) || normalizeAccountType(currentCategory.tipo);
    const subtipo = normalizeText(body.subtipo) || null;
    const padreId = normalizeText(body.padreId) || null;
    const esDetalle = typeof body.esDetalle === "boolean" ? body.esDetalle : currentCategory.esDetalle;
    const activa = typeof body.activa === "boolean" ? body.activa : currentCategory.activa;

    if (padreId === id) {
      return jsonResponse(
        { success: false, error: "Una categoría no puede ser su propia cuenta padre" },
        { status: 400 },
      );
    }

    const parent = await resolveParent(padreId);
    if (parent && normalizeAccountType(parent.tipo) !== tipo) {
      return jsonResponse(
        {
          success: false,
          error: "La cuenta hija debe tener el mismo tipo que su cuenta padre",
        },
        { status: 400 },
      );
    }

    const nivel = parent ? parent.nivel + 1 : 1;
    const providedCode = sanitizeCode(body.codigo);
    const generatedCode = providedCode || currentCategory.codigo;
    const codigo = await ensureUniqueCode(generatedCode, id);

    const updatedCategory = await db
      .update(categoriasCuentas)
      .set({
        codigo,
        nombre,
        tipo,
        subtipo,
        padreId,
        nivel,
        esDetalle,
        activa,
      })
      .where(eq(categoriasCuentas.id, id))
      .returning();

    return jsonResponse({ success: true, data: updatedCategory[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error updating account category:", error);
    return jsonResponse({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "Missing ID" }, { status: 400 });
    }

    // Check for children before deleting?
    // For now, let DB constraints handle it (set null or restrict)
    // Schema says: padreId foreign key on delete set null.
    // But we might want to prevent deletion if it has children or related accounts.

    await db.delete(categoriasCuentas).where(eq(categoriasCuentas.id, id));

    return jsonResponse({ success: true, message: "Category deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error deleting account category:", error);
    return jsonResponse({ success: false, error: message }, { status: 500 });
  }
}
