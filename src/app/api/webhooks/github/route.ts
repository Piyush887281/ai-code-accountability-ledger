import { NextResponse } from "next/server";
import { WebhookService } from "@/modules/ingestion/services/webhook.service";

export async function POST(req: Request) {
  try {
    // Read the raw body as text for signature verification
    const rawBody = await req.text();
    
    // Parse headers
    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event");
    const deliveryId = req.headers.get("x-github-delivery");

    if (!event || !deliveryId) {
      return NextResponse.json({ error: "Missing GitHub webhook headers" }, { status: 400 });
    }

    // Verify signature
    const isValid = WebhookService.verifyGitHubSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Store event idempotently
    const isNew = await WebhookService.storeEventIdempotently(deliveryId, event, payload);
    
    if (!isNew) {
      console.log(`[Webhook] Duplicate delivery ID ${deliveryId} ignored.`);
      return NextResponse.json({ message: "Duplicate event ignored" }, { status: 200 });
    }

    console.log(`[Webhook] Stored new ${event} event (Delivery: ${deliveryId})`);

    // In a full implementation, we would publish this event to the background job queue (pg-boss) here
    // e.g. await queue.send('webhook-event', { eventId: record.id });

    return NextResponse.json({ message: "Event received and stored" }, { status: 200 });

  } catch (error: any) {
    console.error("[Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
