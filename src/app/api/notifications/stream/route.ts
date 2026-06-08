import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        let countInterval: ReturnType<typeof setInterval> | null = null;
        let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

        const enqueue = (payload: string) => {
          if (closed) return;

          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            closeStream();
          }
        };

        const sendCount = async () => {
          if (closed) return;

          try {
            const [result] = await db.execute(sql`
              SELECT COUNT(*)::int as count
              FROM notificaciones
              WHERE usuario_id = ${user.id} AND leida = false
            `);

            const count = (result as any)?.count || 0;
            enqueue(`event: notification\ndata: ${JSON.stringify({ count })}\n\n`);
          } catch {
            if (!closed) {
              enqueue(`event: notification\ndata: ${JSON.stringify({ count: 0 })}\n\n`);
            }
          }
        };

        const sendKeepAlive = () => {
          enqueue(": keep-alive\n\n");
        };

        const closeStream = () => {
          if (closed) return;
          closed = true;
          if (countInterval) clearInterval(countInterval);
          if (keepAliveInterval) clearInterval(keepAliveInterval);

          try {
            controller.close();
          } catch {
            // Stream already closed by the runtime.
          }
        };

        sendCount();

        countInterval = setInterval(sendCount, 5000);
        keepAliveInterval = setInterval(sendKeepAlive, 15000);

        req.signal.addEventListener("abort", closeStream);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { skipAudit: true },
);
