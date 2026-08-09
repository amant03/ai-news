import { seedKnowledgeBase } from './seed-knowledge-base';
import { generateKnowledgeBase } from './knowledge-base-generator';

async function main() {
  console.log('📚 Seeding and generating knowledge base...\n');

  const seeded = await seedKnowledgeBase();
  console.log(`\n📝 Regenerating knowledge base file...`);
  const result = await generateKnowledgeBase();

  console.log(`\n✅ Done!`);
  console.log(`   Items seeded: ${seeded}`);
  console.log(`   Total in KB: ${result.itemCount}`);
  console.log(`   File: ${result.path}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
