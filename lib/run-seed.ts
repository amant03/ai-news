import { seedKnowledgeBase } from './seed-knowledge-base';

async function main() {
  console.log('🌱 Seeding knowledge base...');
  const count = await seedKnowledgeBase();
  console.log(`✅ Done. Seeded ${count} items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
