export type CategoryTrendState = "Sube" | "Baja" | "Estable";

export function getCategoryTrendState(changePct: number | null | undefined): CategoryTrendState {
  if (changePct === null || changePct === undefined) return "Estable";
  if (changePct > 0) return "Sube";
  if (changePct < 0) return "Baja";
  return "Estable";
}
