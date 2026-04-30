import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(
  async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: "La sincronización incremental ha sido desactivada. El sistema opera ahora al 100% en la nube." })}\n\n`));
        controller.close();
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

