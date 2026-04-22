import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { clientes, roles, respuestasTickets, tickets, usuarios, usuariosRoles } from "@/lib/db/schema";
import { notifyNewOutageBulk } from "@/lib/notifications";

// WhatsApp tokens from .env
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "dadminete_v3_secure_token";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const SYSTEM_USER_ID = process.env.WHATSAPP_SYSTEM_USER_ID || "14794b8f-cd71-4f2b-91c5-eafae9561994"; // Fallback to Dadmin (Daniel Beras)
const NOTIFY_ROLE_NAMES = (process.env.WHATSAPP_NOTIFY_ROLES || "Administrador,Asistente,Tecnico")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

/**
 * Helper to download media from WhatsApp
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<string | null> {
    if (!ACCESS_TOKEN) {
        console.error("WHATSAPP_ACCESS_TOKEN not configured");
        return null;
    }

    try {
        // 1. Get Media URL
        const urlRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });
        const mediaData = await urlRes.json();

        if (!mediaData.url) {
            console.error("Could not get media URL from WhatsApp API", mediaData);
            return null;
        }

        // 2. Download Media
        const mediaRes = await fetch(mediaData.url, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        if (!mediaRes.ok) {
            console.error("Failed to download media source", mediaRes.statusText);
            return null;
        }

        const buffer = await mediaRes.arrayBuffer();
        const mimeType = mediaData.mime_type || "application/octet-stream";
        const base64 = Buffer.from(buffer).toString("base64");

        // Store media directly in DB as a data URL string
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error("Error downloading WhatsApp media:", error);
        return null;
    }
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!APP_SECRET) return true;
    if (!signatureHeader) return false;

    const [scheme, signature] = signatureHeader.split("=");
    if (scheme !== "sha256" || !signature) return false;

    const expected = createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");

    if (expected.length !== signature.length) return false;

    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function getNotifyUserIds(): Promise<string[]> {
    if (NOTIFY_ROLE_NAMES.length === 0) return [SYSTEM_USER_ID];

    const rows = await db
        .select({ usuarioId: usuariosRoles.usuarioId })
        .from(usuariosRoles)
        .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
        .innerJoin(usuarios, eq(usuariosRoles.usuarioId, usuarios.id))
        .where(
            and(
                eq(usuariosRoles.activo, true),
                eq(usuarios.activo, true),
                inArray(roles.nombreRol, NOTIFY_ROLE_NAMES),
            ),
        );

    const uniqueIds = [...new Set(rows.map((row) => row.usuarioId))];

    return uniqueIds.length > 0 ? uniqueIds : [SYSTEM_USER_ID];
}

// GET: Webhook Verification
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WHATSAPP_WEBHOOK_VERIFIED");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse(null, { status: 403 });
        }
    }
    return new NextResponse(null, { status: 400 });
}

// POST: Receive WhatsApp Messages
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();

        if (!verifyWebhookSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);

        // Check if it's a WhatsApp message
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const message = body.entry[0].changes[0].value.messages[0];
            const from = message.from; // Phone number

            // Extract text or caption
            let text = message.text?.body || "";
            let mediaId = null;
            let mediaType = null;

            if (message.type === "image") {
                mediaId = message.image.id;
                text = message.image.caption || "Imagen recibida";
                mediaType = "image";
            } else if (message.type === "video") {
                mediaId = message.video.id;
                text = message.video.caption || "Video recibido";
                mediaType = "video";
            }

            console.log(`WhatsApp message (${message.type}) received from ${from}: ${text}`);

            // 1. Identify Client
            const cleanPhone = from.replace(/\D/g, "");
            const searchPattern = "%" + cleanPhone.slice(-10);

            console.log(`Searching for client with normalized phone ending in: ${searchPattern} (Original: ${from})`);

            const [client] = await db
                .select()
                .from(clientes)
                .where(
                    or(
                        sql`regexp_replace(${clientes.telefono}, '[^0-9]', '', 'g') LIKE ${searchPattern}`,
                        sql`regexp_replace(${clientes.telefonoSecundario}, '[^0-9]', '', 'g') LIKE ${searchPattern}`
                    )
                )
                .limit(1);

            if (!client) {
                console.log(`No client found with phone matching ${searchPattern}`);
                return NextResponse.json({ success: true, message: "Client not found" });
            }

            // 2. Keyword Detection (or always create if it has media?)
            const keywords = ["internet", "averia", "falla", "lento", "señal", "wifi", "router", "corte", "problema", "no funciona"];
            const lowerText = text.toLowerCase();
            const isOutageReport = keywords.some(k => lowerText.includes(k)) || mediaId !== null;

            if (isOutageReport) {
                const [existingTicket] = await db
                    .select({ id: tickets.id, numeroTicket: tickets.numeroTicket })
                    .from(tickets)
                    .where(and(eq(tickets.clienteId, client.id), eq(tickets.estado, "abierto")))
                    .orderBy(desc(tickets.fechaCreacion))
                    .limit(1);

                let ticketId = existingTicket?.id || null;
                let numeroTicket = existingTicket?.numeroTicket || null;
                let ticketCreated = false;

                if (!ticketId) {
                    const [lastTicket] = await db
                        .select({ numeroTicket: tickets.numeroTicket })
                        .from(tickets)
                        .orderBy(sql`numero_ticket DESC`)
                        .limit(1);

                    let nextNumber = 1;
                    if (lastTicket && lastTicket.numeroTicket.startsWith("TK-")) {
                        const currentSeq = parseInt(lastTicket.numeroTicket.split("-")[1]);
                        if (!isNaN(currentSeq)) nextNumber = currentSeq + 1;
                    }
                    numeroTicket = `TK-${nextNumber.toString().padStart(6, "0")}`;

                    const [newTicket] = await db
                        .insert(tickets)
                        .values({
                            numeroTicket,
                            clienteId: client.id,
                            usuarioId: SYSTEM_USER_ID,
                            asunto: "Reporte WhatsApp: " + (text.substring(0, 50) || "Sin asunto"),
                            descripcion: text || "Reporte recibido vía WhatsApp.",
                            categoria: "Internet",
                            prioridad: lowerText.includes("urgente") || lowerText.includes("critico") ? "alta" : "media",
                            estado: "abierto",
                            fechaCreacion: sql`CURRENT_TIMESTAMP`,
                            createdAt: sql`CURRENT_TIMESTAMP`,
                            updatedAt: sql`CURRENT_TIMESTAMP`,
                        })
                        .returning();

                    ticketId = newTicket?.id || null;
                    ticketCreated = !!ticketId;
                }

                if (ticketId) {
                    const mediaDataUrl = mediaId ? await downloadWhatsAppMedia(mediaId) : null;

                    await db.insert(respuestasTickets).values({
                        ticketId,
                        usuarioId: SYSTEM_USER_ID,
                        mensaje: text || "Reporte recibido vía WhatsApp.",
                        imagenUrl: mediaDataUrl || null,
                        esInterno: false,
                        fechaRespuesta: sql`CURRENT_TIMESTAMP`,
                    });
                }

                if (ticketCreated && numeroTicket) {
                    const notifyUserIds = await getNotifyUserIds();
                    await notifyNewOutageBulk(notifyUserIds, `${client.nombre} ${client.apellidos}`, numeroTicket);
                    console.log(`Ticket ${numeroTicket} created for client ${client.nombre}`);
                }
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true, message: "Not a message event" });
    } catch (error: any) {
        console.error("WhatsApp Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
