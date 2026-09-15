import { describe, expect, it } from 'vitest';
import { dedupeProviders, toProviderRow } from '@/lib/provider-endpoints';

describe('toProviderRow', () => {
  it('maps pricing to per-1M + 3:1 blend', () => {
    const row = toProviderRow({
      provider_name: 'DeepInfra',
      context_length: 163840,
      pricing: { prompt: '0.00000032', completion: '0.00000089' },
      quantization: 'fp4',
      throughput_last_30m: 87.5,
      latency_last_30m: 0.42,
      supported_parameters: ['tools', 'response_format', 'temperature'],
    });
    expect(row).not.toBeNull();
    expect(row!.name).toBe('DeepInfra');
    expect(row!.context).toBe('164K');
    expect(row!.inputPrice).toBeCloseTo(0.32, 2);
    expect(row!.outputPrice).toBeCloseTo(0.89, 2);
    expect(row!.blendedPrice).toBeCloseTo((0.32 * 3 + 0.89) / 4, 2);
    expect(row!.functionCalling).toBe(true);
    expect(row!.jsonMode).toBe(true);
    expect(row!.speed).toBe(87.5);
    expect(row!.firstChunk).toBe(0.42);
    expect(row!.license).toBe('fp4');
  });

  it('leaves unknown metrics null instead of fabricating', () => {
    const row = toProviderRow({ provider_name: 'Azure', pricing: {} });
    expect(row!.speed).toBeNull();
    expect(row!.firstChunk).toBeNull();
    expect(row!.license).toBe('—');
  });

  it('computes reference-workload task cost from live prices', () => {
    const row = toProviderRow({
      provider_name: 'X',
      pricing: { prompt: '0.00000032', completion: '0.00000089' },
    });
    // 10K in @ $0.32/M + 2K out @ $0.89/M = 0.0032 + 0.00178 ≈ $0.005
    expect(row!.costPerTask).toBeCloseTo(0.005, 5);
  });

  it('rejects nameless endpoints', () => {
    expect(toProviderRow({})).toBeNull();
  });
});

describe('dedupeProviders', () => {
  const row = (name: string, blendedPrice: number) => ({
    name,
    context: '—',
    license: '—',
    functionCalling: false,
    jsonMode: false,
    costPerTask: null,
    speed: null,
    firstChunk: null,
    totalResponse: null,
    reasoningTime: null,
    blendedPrice,
    inputPrice: 0,
    outputPrice: 0,
  });

  it('collapses repeat providers to the cheapest variant', () => {
    const out = dedupeProviders([
      row('Azure', 20),
      row('azure', 18),
      row('Anthropic', 20),
      row('AZURE', 25),
    ]);
    expect(out.map(r => r.name)).toEqual(['azure', 'Anthropic']);
    expect(out[0].blendedPrice).toBe(18);
  });
});
