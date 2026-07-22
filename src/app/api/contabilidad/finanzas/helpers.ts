export type FinanceMovementLike = {
  fecha: string | Date | null;
  tipo: string;
  monto: string | number | null;
  categoriaNombre?: string | null;
  categoriaCodigo?: string | null;
  descripcion?: string | null;
  id?: string | null;
};

function toNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function isWithinRange(dateValue: string | Date | null, start: Date, end: Date) {
  if (!dateValue) return false;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return date >= start && date <= end;
}

export function summarizePeriodTotals(rows: FinanceMovementLike[], start: Date, end: Date) {
  return rows.reduce(
    (acc, row) => {
      if (!isWithinRange(row.fecha, start, end)) {
        return acc;
      }

      const monto = toNumber(row.monto);
      const tipo = String(row.tipo ?? "")
        .trim()
        .toLowerCase();

      if (tipo === "ingreso") {
        acc.ingresos += monto;
      } else if (tipo === "gasto" || tipo === "egreso") {
        acc.gastos += monto;
      }

      return acc;
    },
    { ingresos: 0, gastos: 0, balance: 0 },
  );
}

export function buildCategoryDetails(rows: FinanceMovementLike[], start: Date, end: Date) {
  const byCategory = new Map<
    string,
    {
      nombre: string;
      codigo: string | null;
      total: number;
      items: Array<{ id: string; descripcion: string | null; fecha: string; monto: number }>;
    }
  >();

  for (const row of rows) {
    if (!isWithinRange(row.fecha, start, end)) {
      continue;
    }

    const tipo = String(row.tipo ?? "")
      .trim()
      .toLowerCase();
    if (tipo !== "gasto" && tipo !== "egreso") {
      continue;
    }

    const nombre = row.categoriaNombre?.trim() ?? "Sin categoria";
    const codigo = row.categoriaCodigo?.trim() ?? null;
    const key = `${codigo ?? ""}:${nombre}`;
    const entry = byCategory.get(key) ?? { nombre, codigo, total: 0, items: [] };
    const monto = toNumber(row.monto);

    entry.total += monto;
    entry.items.push({
      id: String(row.id ?? `${nombre}-${entry.items.length}`),
      descripcion: row.descripcion ?? null,
      fecha: row.fecha != null ? new Date(row.fecha).toISOString() : new Date().toISOString(),
      monto,
    });

    byCategory.set(key, entry);
  }

  return Array.from(byCategory.values())
    .map((item) => ({
      ...item,
      items: item.items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    }))
    .sort((a, b) => b.total - a.total);
}
