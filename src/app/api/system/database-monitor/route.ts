import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

// Cache this heavy admin query for 60 seconds
export const revalidate = 60;

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        // Only CEO/Admin should access this system page
        if (auth.role !== 'ceo') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 1. Fetch all user tables in 'public' and 'telemetry' schemas with row counts and sizes
        const tablesQuery = `
      SELECT 
        schemaname as schema_name, 
        relname as table_name, 
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_total_relation_size(relid) as size_bytes
      FROM pg_stat_user_tables 
      WHERE schemaname IN ('public', 'telemetry')
      ORDER BY schemaname ASC, size_bytes DESC;
    `;

        const tablesResult = await telemetryDb.execute(sql.raw(tablesQuery));
        const tables = tablesResult as any[];

        // 2. Fetch min/max dates for each table dynamically
        const enrichedTables = await Promise.all(tables.map(async (table) => {
            let oldest_record = null;
            let newest_record = null;

            try {
                // Find if this table has a standard time column
                const colsQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${table.schema_name}' 
            AND table_name = '${table.table_name}' 
            AND column_name IN ('time', 'created_at', 'activated_at')
          LIMIT 1;
        `;
                const colsResult = await telemetryDb.execute(sql.raw(colsQuery));
                const timeCol = colsResult[0]?.column_name;

                if (timeCol) {
                    // Query min/max (using fast planner for indexed columns)
                    const minMaxQuery = `
            SELECT 
              MIN(${timeCol}) as oldest, 
              MAX(${timeCol}) as newest 
            FROM "${table.schema_name}"."${table.table_name}"
          `;

                    // Only attempt if table has data (avoid hanging on empty tables)
                    if (table.row_count > 0) {
                        const mmResult = await telemetryDb.execute(sql.raw(minMaxQuery));
                        if (mmResult.length > 0) {
                            oldest_record = mmResult[0].oldest;
                            newest_record = mmResult[0].newest;
                        }
                    }
                }
            } catch (err) {
                console.error(`Error fetching dates for ${table.schema_name}.${table.table_name}:`, err);
            }

            return {
                ...table,
                oldest_record,
                newest_record
            };
        }));

        return NextResponse.json(enrichedTables, { status: 200 });

    } catch (error) {
        console.error('Error in database monitor:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
