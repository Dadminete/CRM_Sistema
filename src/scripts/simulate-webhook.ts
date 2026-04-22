/**
 * Script for simulating a WhatsApp Webhook POST request
 * Use this to test the ticket creation logic locally.
 */

async function simulateWebhook() {
    const APP_URL = "http://localhost:3000";
    const WEBHOOK_URL = `${APP_URL}/api/whatsapp/webhook`;

    // --- CONFIGURATION ---
    const TEST_PHONE = "8492538204"; // <--- CAMBIA ESTO por un número que exista en tu base de datos
    // -----------------------

    const textPayload = {
        object: "whatsapp_business_account",
        entry: [
            {
                id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
                changes: [
                    {
                        value: {
                            messaging_product: "whatsapp",
                            messages: [
                                {
                                    from: TEST_PHONE,
                                    id: "wamid." + Math.random().toString(36).substring(7),
                                    timestamp: Math.floor(Date.now() / 1000),
                                    text: { body: "Hola, mi internet está muy lento y falla a veces." },
                                    type: "text"
                                }
                            ]
                        },
                        field: "messages"
                    }
                ]
            }
        ]
    };

    console.log(`--- Simulating WhatsApp Outage Report from ${TEST_PHONE} ---`);
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(textPayload)
        });

        const result = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(result, null, 2));

        if (response.ok) {
            if (result.message === "Client not found") {
                console.log("\n[NOTA]: El Webhook funciona perfectamente, pero el número " + TEST_PHONE + " no existe en tu base de datos.");
                console.log("Para una prueba real, edita este archivo (src/scripts/simulate-webhook.ts) y pon un número de teléfono de alguno de tus clientes.");
            } else {
                console.log("\n¡ÉXITO TOTAL! El ticket ha sido creado. Revísalo en tu dashboard.");
            }
        } else {
            console.error("\nError al simular el webhook.");
        }
    } catch (error: any) {
        console.error("Connection Error:", error.message);
        console.log("Make sure the dev server is running on", APP_URL);
    }
}

simulateWebhook();
