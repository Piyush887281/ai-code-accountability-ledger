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
      return NextResponse.json(
        { error: "Missing GitHub webhook headers" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // Store event idempotently
    const isNew = await WebhookService.storeEventIdempotently(
      deliveryId,
      event,
      payload,
    );

    if (!isNew) {
      console.log(`[Webhook] Duplicate delivery ID ${deliveryId} ignored.`);
      return NextResponse.json(
        { message: "Duplicate event ignored" },
        { status: 200 },
      );
    }

    console.log(
      `[Webhook] Stored new ${event} event (Delivery: ${deliveryId})`,
    );

    // Process the event
    if (
      event === "pull_request" &&
      payload.repository &&
      payload.pull_request
    ) {
      const repoExternalId = payload.repository.id.toString();

      // Find the repository in our DB
      const { default: prisma } = await import("@/lib/db");
      const repoRecord = await prisma.repository.findFirst({
        where: { externalId: repoExternalId },
      });

      if (repoRecord) {
        // Upsert PR
        const prRecord = await prisma.pullRequest.upsert({
          where: {
            repositoryId_externalId: {
              repositoryId: repoRecord.id,
              externalId: payload.pull_request.number.toString(),
            },
          },
          update: {
            state: payload.pull_request.state,
            title: payload.pull_request.title,
            updatedAt: new Date(payload.pull_request.updated_at),
          },
          create: {
            repositoryId: repoRecord.id,
            externalId: payload.pull_request.number.toString(),
            state: payload.pull_request.state,
            title: payload.pull_request.title,
            authorName: payload.pull_request.user.login || "unknown",
            url: payload.pull_request.html_url,
            createdAt: new Date(payload.pull_request.created_at),
            updatedAt: new Date(payload.pull_request.updated_at),
          },
        });

        // Trigger Finding Analysis
        try {
          const { FindingService } =
            await import("@/modules/analysis/services/finding.service");
          await FindingService.analyzePullRequest(
            repoRecord.organizationId,
            repoRecord.id,
            payload.pull_request.number.toString(),
          );
        } catch (err) {
          console.error(
            `[Webhook] Failed to analyze PR ${payload.pull_request.number}:`,
            err,
          );
        }
      }
    }

    return NextResponse.json(
      { message: "Event received and processed" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
