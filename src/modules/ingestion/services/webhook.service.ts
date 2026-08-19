import crypto from 'crypto';
import prisma from "@/lib/db";

export class WebhookService {
  /**
   * Verifies the GitHub HMAC signature.
   */
  static verifyGitHubSignature(payload: string, signature: string | null): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("GITHUB_WEBHOOK_SECRET is not set, skipping signature verification.");
      return true; // For local dev without a secret, though not recommended for production
    }

    if (!signature) {
      return false;
    }

    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");

    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  /**
   * Stores the webhook event if we haven't seen this delivery ID before.
   * Returns true if it was newly stored, false if it was a duplicate.
   */
  static async storeEventIdempotently(
    deliveryId: string,
    event: string,
    payload: any
  ): Promise<boolean> {
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: "github",
          deliveryId,
          event,
          payload,
        },
      });
      return true;
    } catch (error: any) {
      // Prisma error code for unique constraint violation
      if (error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }
}
