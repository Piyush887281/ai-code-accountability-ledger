// eslint-disable-next-line @typescript-eslint/no-require-imports
const PgBoss = require('pg-boss');

// Use a singleton pattern to prevent multiple connections in dev (HMR)
const globalForQueue = globalThis as unknown as {
  boss: any | undefined;
};

let boss: any;

if (globalForQueue.boss) {
  boss = globalForQueue.boss;
} else {
  // We use the same database URL as Prisma
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  boss = new PgBoss({
    connectionString,
    // Optional: add schema option if you want pg-boss to use a different schema than public
  });

  boss.on('error', (error: Error) => console.error('[pg-boss] Error:', error));

  // Initialize asynchronously
  // In Next.js, this might get called multiple times during build, so we handle it gracefully
  boss.start().then(() => {
    console.log('[pg-boss] Queue started');
  }).catch((e: Error) => {
    // If it's already started, ignore the error
    if (e.message !== 'boss is already started') {
      console.error('[pg-boss] Failed to start:', e);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    globalForQueue.boss = boss;
  }
}

export default boss;
