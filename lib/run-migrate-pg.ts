import { initPgSchema, upsertNewsItemsPg, upsertModelsPg, hasPg } from './pg';
import { readStore } from './db';
import { readModelDatabase } from './model-registry';
import { readStatus } from './status';
import { writeStatusPg } from './pg';

async function main() {
  if (!hasPg()) {
    console.error('❌ DATABASE_URL not set — add it to .env.local (e.g. postgresql://postgres:postgres@127.0.0.1:5432/ainews)');
    process.exit(1);
  }

  console.log('📦 Initializing Postgres schema...');
  await initPgSchema();

  const store = readStore();
  console.log(`\n📰 Migrating ${store.items.length} news items...`);
  const { inserted, known } = await upsertNewsItemsPg(store.items);
  console.log(`   inserted: ${inserted}, already-known: ${known}`);

  const db = readModelDatabase();
  if (db) {
    console.log(`\n🤖 Migrating ${db.models.length} models...`);
    await upsertModelsPg(db.models as unknown as Array<Record<string, unknown>>);
    console.log('   done');
  } else {
    console.log('\n🤖 No models.json found — skipping models');
  }

  const status = readStatus();
  if (status.lastRun) {
    await writeStatusPg('status', status);
    console.log('\n📊 Migrated status snapshot');
  }

  console.log('\n✅ Migration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});