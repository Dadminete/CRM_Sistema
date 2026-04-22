"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { DashboardLoader } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components
const InsightCards = lazy(() =>
  import("./_components/insight-cards").then(mod => ({ default: mod.InsightCards }))
);
const OverviewCards = lazy(() =>
  import("./_components/overview-cards").then(mod => ({ default: mod.OverviewCards }))
);
const OperationalCards = lazy(() =>
  import("./_components/operational-cards").then(mod => ({ default: mod.OperationalCards }))
);
const TableCards = lazy(() =>
  import("./_components/table-cards").then(mod => ({ default: mod.TableCards }))
);

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetch("/api/banco/dashboard");
        const rawBody = await res.text();

        let parsed: any = null;
        if (rawBody.trim().length > 0) {
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            throw new Error("El servidor devolvio una respuesta invalida.");
          }
        }

        if (!res.ok) {
          const backendMessage = parsed?.error ?? parsed?.message;
          throw new Error(backendMessage || `Error del servidor (${res.status}).`);
        }

        if (!parsed?.success || !parsed?.data) {
          throw new Error("No se pudieron cargar los datos del dashboard.");
        }

        setData(parsed.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado cargando dashboard.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <DashboardLoader />;
  }

  if (!data) {
    return <div className="p-8 text-center">{error || "Error cargando datos del dashboard de bancos."}</div>;
  }

  return (
    <div className="animate-in fade-in flex flex-col gap-4 duration-500 md:gap-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <InsightCards distribution={data.distribution} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OverviewCards data={data.overview} history={data.history} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OperationalCards boxes={data.boxes} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TableCards recent={data.recent} transfers={data.transfers} />
      </Suspense>
    </div>
  );
}
