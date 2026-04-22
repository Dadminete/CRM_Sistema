import { optimizedSyncService } from "@/lib/db/optimized-sync-service";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(
  async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const onLog = (msg: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));
        };

        try {
          onLog("[CLIENTE] Conexión establecida. Iniciando Sincronización Incremental...");
          
          const result = await optimizedSyncService.syncAlteredTables(onLog);
          
          if (result.success) {
            onLog("[SUCCESS] Proceso finalizado correctamente.");
          } else {
            onLog(`[ERROR] ${result.error || "Error desconocido"}`);
          }
        } catch (error: any) {
          onLog(`[CRITICAL] ${error.message}`);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  },
  { requiredPermission: "database:manage" }
);
