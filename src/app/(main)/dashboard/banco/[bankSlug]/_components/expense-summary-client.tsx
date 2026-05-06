"use client";

import dynamic from "next/dynamic";

import { CardLoader } from "@/components/ui/loaders";

const ExpenseSummary = dynamic(
  () => import("../../../finance/_components/expense-summary").then((mod) => ({ default: mod.ExpenseSummary })),
  { ssr: false, loading: () => <CardLoader /> },
);

export function ExpenseSummaryClient({ bankSlug }: { bankSlug: string }) {
  return <ExpenseSummary bankSlug={bankSlug} />;
}
