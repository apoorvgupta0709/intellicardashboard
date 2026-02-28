import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Initializes a postgres.js connection specifically for telemetry operations.
 * If telemetry lives in the same Supabase database, this uses the main DATABASE_URL.
 */

// Connection string ensuring we don't accidentally try to connect at build time without vars
const connectionString = process.env.DATABASE_URL || '';

// In serverless environments (Next.js Edge or API routes without pooling),
// using a single connection or connection pool correctly is crucial.
// `postgres.js` handles pooling automatically.
const client = postgres(connectionString, {
    prepare: false, // Recommended for pgbouncer/Supabase connection routing
});

export const telemetryDb = drizzle(client);
