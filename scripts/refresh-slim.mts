import { refreshSlimOpenRouter } from '../lib/model-registry';

async function main() {
  const slim = await refreshSlimOpenRouter();
  console.log(`[refresh-slim] wrote ${slim.total} models at ${slim.updatedAt}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
