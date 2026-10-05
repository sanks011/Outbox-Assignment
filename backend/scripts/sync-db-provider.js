import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend or root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || '';
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf-8');

  let targetProvider = 'postgresql';
  if (dbUrl.startsWith('mysql://')) {
    targetProvider = 'mysql';
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    targetProvider = 'postgresql';
  }

  const currentProviderMatch = schema.match(/provider\s*=\s*"([^"]+)"/g);
  if (currentProviderMatch && currentProviderMatch.length > 1) {
    // Second provider in datasource db
    schema = schema.replace(
      /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"/,
      `datasource db {\n  provider = "${targetProvider}"`
    );
    fs.writeFileSync(schemaPath, schema, 'utf-8');
    console.log(`✅ Synchronized Prisma provider to: "${targetProvider}" based on DATABASE_URL`);
  }
}
