import { lazy, Suspense } from "react";
import { CardLoader } from "@/components/ui/loaders";

const AccountOverview = lazy(() =>
  import("./_components/account-overview").then((mod) => ({ default: mod.AccountOverview })),
);
const CurrencyExchange = lazy(() =>
  import("../../finance/_components/currency-exchange").then((mod) => ({ default: mod.CurrencyExchange })),
);
const ExpenseSummary = lazy(() =>
  import("../../finance/_components/expense-summary").then((mod) => ({ default: mod.ExpenseSummary })),
);
const FinancialOverview = lazy(() =>
  import("./_components/financial-overview").then((mod) => ({ default: mod.FinancialOverview })),
);

export default async function Page({ params }: { params: Promise<{ bankSlug: string }> }) {
  const { bankSlug } = await params;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Suspense fallback={<CardLoader />}>
          <AccountOverview bankSlug={bankSlug} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-2">
        <div className="flex-1">
          <Suspense fallback={<CardLoader />}>
            <FinancialOverview bankSlug={bankSlug} />
          </Suspense>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs md:grid-cols-2">
          <Suspense fallback={<CardLoader />}>
            <ExpenseSummary />
          </Suspense>
          <Suspense fallback={<CardLoader />}>
            <CurrencyExchange />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
