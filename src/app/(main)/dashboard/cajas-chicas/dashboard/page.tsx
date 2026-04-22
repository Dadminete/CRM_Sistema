"use client";

import { useEffect, useState, lazy, Suspense } from "react";

import { DashboardLoader } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components para reducir bundle inicial
const InsightCards = lazy(() => import("./_components/insight-cards").then((mod) => ({ default: mod.InsightCards })));
const OverviewCards = lazy(() =>
  import("./_components/overview-cards").then((mod) => ({ default: mod.OverviewCards })),
);
const OperationalCards = lazy(() =>
  import("./_components/operational-cards").then((mod) => ({ default: mod.OperationalCards })),
);
const TableCards = lazy(() => import("./_components/table-cards").then((mod) => ({ default: mod.TableCards })));

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cajas/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardLoader />;
  }

  if (!data) return <div>Error cargando datos del dashboard.</div>;

  return (
    <div className="animate-in fade-in flex flex-col gap-4 duration-500 md:gap-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <InsightCards distribution={data.distribution} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OverviewCards data={data.overview} history={data.history} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OperationalCards
          boxes={data.boxes}
          discrepancias={data.overview.discrepancias}
          activeSessions={data.activeSessions || []}
        />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TableCards recent={data.recent} transfers={data.transfers} />
      </Suspense>
    </div>
  );
}
