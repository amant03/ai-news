import { runAgent } from './agent';
import { writeStatus, readStatus } from './status';

interface CliOptions {
  loop: boolean;
  regenerateKB: boolean;
  intervalMs: number;
  sourceFilter?: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    loop: argv.includes('--loop'),
    regenerateKB: argv.includes('--kb') || argv.includes('--regenerate-kb'),
    intervalMs: parseInt(process.env.AGENT_INTERVAL_MS || '14400000', 10), // default 4h
  };
  const srcIdx = argv.indexOf('--sources');
  if (srcIdx >= 0 && argv[srcIdx + 1]) {
    opts.sourceFilter = argv[srcIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
  }
  const intervalIdx = argv.indexOf('--interval');
  if (intervalIdx >= 0 && argv[intervalIdx + 1]) {
    const parsed = parseInt(argv[intervalIdx + 1], 10);
    if (!isNaN(parsed)) opts.intervalMs = parsed;
  }
  return opts;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function runOnce(opts: CliOptions): Promise<void> {
  const result = await runAgent({
    regenerateKB: opts.regenerateKB,
    sourceFilter: opts.sourceFilter,
  });

  console.log('\n📋 Run summary:');
  for (const [key, count] of Object.entries(result.sourceCounts)) {
    console.log(`   ${key.padEnd(12)} ${count}`);
  }
  console.log(`   ${'INSERTED'.padEnd(12)} ${result.inserted}`);
  console.log(`   ${'TOTAL'.padEnd(12)} ${result.totalAfter}`);
  console.log(`   ${'DURATION'.padEnd(12)} ${formatDuration(result.durationMs)}`);

  // Update nextRun in status
  const status = readStatus();
  status.nextRun = new Date(Date.now() + opts.intervalMs).toISOString();
  writeStatus(status);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  await runOnce(opts);

  if (!opts.loop) {
    process.exit(0);
  }

  console.log(`\n🔁 Loop mode: next run in ${(opts.intervalMs / 60000).toFixed(0)} min (Ctrl+C to stop)`);
  while (true) {
    await new Promise(r => setTimeout(r, opts.intervalMs));
    console.log(`\n⏰ Scheduled run at ${new Date().toISOString()}`);
    try {
      await runOnce(opts);
    } catch (error) {
      console.error('Scheduled run failed:', error);
    }
  }
}

main().catch(err => {
  console.error('Agent failed:', err);
  process.exit(1);
});
