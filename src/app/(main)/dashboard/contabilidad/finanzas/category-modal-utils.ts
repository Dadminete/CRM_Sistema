export type CategoryModalItem = {
  id: string;
  descripcion: string | null;
  fecha: string;
  monto: number;
};

export type CategoryModalSelection = {
  name: string;
  source: "expense" | "trend";
};

export type CategoryModalData = {
  name: string;
  source: "expense" | "trend";
  currentMonthTotal: number;
  currentMonthPercentage: number;
  changePct: number | null;
  currentMonthItems: CategoryModalItem[];
  trendSeries: number[];
  trendMonths: string[];
};

export function buildCategoryModalData({
  categoryName,
  kind,
  topExpenseCategories,
  monthlyCategoryTrends,
  monthlyTrend,
}: {
  categoryName: string;
  kind: CategoryModalSelection["source"];
  topExpenseCategories: Array<{
    nombre: string;
    total: number;
    percentage: number;
    items: CategoryModalItem[];
  }>;
  monthlyCategoryTrends: Array<{
    categoria: string;
    changePct: number;
    currentMonthTotal: number;
    currentMonthPercentage: number;
    currentMonthItems: CategoryModalItem[];
    series: number[];
  }>;
  monthlyTrend: Array<{ month: string }>;
}): CategoryModalData | null {
  const expenseMatch = topExpenseCategories.find((row) => row.nombre === categoryName);
  const trendMatch = monthlyCategoryTrends.find((row) => row.categoria === categoryName);

  if (!expenseMatch && !trendMatch) {
    return null;
  }

  const currentMonthItems =
    (kind === "expense" ? expenseMatch?.items : trendMatch?.currentMonthItems) ??
    trendMatch?.currentMonthItems ??
    expenseMatch?.items ??
    [];

  const currentMonthTotal =
    (kind === "expense" ? expenseMatch?.total : trendMatch?.currentMonthTotal) ??
    trendMatch?.currentMonthTotal ??
    expenseMatch?.total ??
    0;

  const currentMonthPercentage =
    (kind === "expense" ? expenseMatch?.percentage : trendMatch?.currentMonthPercentage) ??
    trendMatch?.currentMonthPercentage ??
    expenseMatch?.percentage ??
    0;

  return {
    name: categoryName,
    source: kind,
    currentMonthTotal,
    currentMonthPercentage,
    changePct: trendMatch?.changePct ?? null,
    currentMonthItems,
    trendSeries: trendMatch?.series ?? [],
    trendMonths: monthlyTrend.map((month) => month.month),
  };
}
