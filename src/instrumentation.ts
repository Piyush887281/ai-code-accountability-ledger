/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically called by Next.js once when the server starts.
 * We use it to start background workers that need to run for the lifetime
 * of the application (e.g., the pg-boss backfill job worker).
 * 
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only start workers on the Node.js server runtime (not during build or on Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { BackfillJobService } = await import('@/modules/ingestion/jobs/backfill.job');
      await BackfillJobService.startWorker();
      console.log('[Instrumentation] Backfill worker started successfully.');
    } catch (error) {
      console.error('[Instrumentation] Failed to start backfill worker:', error);
    }
  }
}
