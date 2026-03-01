import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = postgres(process.env.DATABASE_URL!);

async function checkTable() {
    try {
        const columns = await client`
      SELECT table_schema, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicle_can_events';
    `;
        console.log('--- COLUMNS ---');
        console.log(columns);

        if (columns.length > 0) {
            const schema = columns[0].table_schema;
            const data = await client`SELECT * FROM ${client(schema)}.vehicle_can_events LIMIT 1;`;
            console.log('--- SAMPLE ROW ---');
            console.log(data);
        } else {
            console.log('Table vehicle_can_events not found in information_schema.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

checkTable();
