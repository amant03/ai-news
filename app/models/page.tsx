'use client';

import { useMemo, useState } from 'react';
import NewsletterSignup from '@/components/NewsletterSignup';
import modelsData from '@/data/models.json';

type Model = (typeof modelsData.models)[number];

const CHART_COLORS = {
  intelligence: '#9a7bd4',
  speed: '#d9a35c',
  cost: '#d06b77',
};

function BarChart({
  title,
  color,
  items,
  valueLabel,
}: {
  title: string;
  color: string;
  items: { label: string; provider: string; value: number; display: string }[];
  valueLabel: string;
}) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 12,
        padding: '28px 24px 20px',
        border: '1px solid var(--line)',
        flex: 1,
        minWidth: 280,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--fore)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 22,
                  background: 'var(--skeleton)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(item.value / max) * 100}%`,
                    background: color,
                    borderRadius: 4,
                    opacity: 0.85,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fore)',
                  minWidth: 44,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.display}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--mut)',
                lineHeight: 1.2,
                paddingLeft: 2,
              }}
            >
              {item.provider} / {item.label}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--dim)',
          marginTop: 14,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {valueLabel}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const [sortBy, setSortBy] = useState<'intelligenceIndex' | 'elo' | 'cost'>('intelligenceIndex');

  const { intelligenceTop, speedTop, costTop, allModels } = useMemo(() => {
    const models = modelsData.models as Model[];

    const withIntel = models
      .filter((m) => m.intelligenceIndex != null)
      .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));

    const intelligenceTop = withIntel.slice(0, 12).map((m) => ({
      label: m.name,
      provider: m.provider,
      value: m.intelligenceIndex ?? 0,
      display: String(m.intelligenceIndex ?? 0),
    }));

    const withSpeed = models
      .filter((m) => m.codingIndex != null)
      .sort((a, b) => (b.codingIndex ?? 0) - (a.codingIndex ?? 0));

    const speedTop = withSpeed.slice(0, 12).map((m) => ({
      label: m.name,
      provider: m.provider,
      value: m.codingIndex ?? 0,
      display: `${m.codingIndex ?? 0}`,
    }));

    const withCost = models
      .filter((m) => m.promptPrice != null && m.completionPrice != null)
      .map((m) => ({
        ...m,
        avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2,
      }))
      .sort((a, b) => a.avgCost - b.avgCost);

    const costTop = withCost.slice(0, 12).map((m) => ({
      label: m.name,
      provider: m.provider,
      value: m.avgCost,
      display: `$${m.avgCost.toFixed(2)}`,
    }));

    const allModels = models
      .filter((m) => m.intelligenceIndex != null)
      .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));

    return { intelligenceTop, speedTop, costTop, allModels };
  }, []);

  const sortedAll = useMemo(() => {
    const models = modelsData.models as Model[];
    const withIntel = models.filter((m) => m.intelligenceIndex != null);

    if (sortBy === 'intelligenceIndex') {
      return withIntel.sort(
        (a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)
      );
    }
    if (sortBy === 'elo') {
      return withIntel.sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    }
    return withIntel
      .map((m) => ({
        ...m,
        avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2,
      }))
      .sort((a, b) => a.avgCost - b.avgCost);
  }, [sortBy]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-body)',
        color: 'var(--fore)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '48px 24px 80px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
              color: 'var(--fore)',
            }}
          >
            Models
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--mut)',
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Benchmark rankings, pricing, and provider info for{' '}
            {modelsData.models.length} AI models.
          </p>
        </div>

        {/* Highlights */}
        <section style={{ marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--dim)',
              margin: '0 0 20px',
            }}
          >
            Highlights
          </h2>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <BarChart
              title="Intelligence"
              color={CHART_COLORS.intelligence}
              items={intelligenceTop}
              valueLabel="Intelligence Index"
            />
            <BarChart
              title="Coding Performance"
              color={CHART_COLORS.speed}
              items={speedTop}
              valueLabel="Coding Index"
            />
            <BarChart
              title="Cost per Task"
              color={CHART_COLORS.cost}
              items={costTop}
              valueLabel="Avg $/M tokens"
            />
          </div>
        </section>

        {/* Table */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--dim)',
                margin: 0,
              }}
            >
              All Models
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {(
                [
                  ['intelligenceIndex', 'Intelligence'],
                  ['elo', 'ELO'],
                  ['cost', 'Cost'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background:
                      sortBy === key ? 'var(--accent)' : 'transparent',
                    color: sortBy === key ? '#fff' : 'var(--mut)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {[
                    { label: 'Rank', width: 56 },
                    { label: 'Model', width: undefined },
                    { label: 'Provider', width: 120 },
                    { label: 'Intelligence', width: 100 },
                    { label: 'Coding', width: 80 },
                    { label: 'ELO', width: 72 },
                    { label: 'Prompt $/M', width: 90 },
                    { label: 'Completion $/M', width: 110 },
                    { label: 'Context', width: 80 },
                    { label: 'Type', width: 100 },
                  ].map((col) => (
                    <th
                      key={col.label}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--dim)',
                        whiteSpace: 'nowrap',
                        width: col.width,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAll.map((m, idx) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--dim)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontWeight: 500,
                        color: 'var(--fore)',
                      }}
                    >
                      {m.name}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--mut)',
                      }}
                    >
                      {m.provider}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fore)',
                      }}
                    >
                      {m.intelligenceIndex ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fore)',
                      }}
                    >
                      {m.codingIndex ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fore)',
                      }}
                    >
                      {m.elo ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fore)',
                      }}
                    >
                      {m.promptPrice != null ? `$${m.promptPrice.toFixed(2)}` : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--fore)',
                      }}
                    >
                      {m.completionPrice != null
                        ? `$${m.completionPrice.toFixed(2)}`
                        : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        color: 'var(--mut)',
                      }}
                    >
                      {m.context ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background:
                            m.family === 'closed'
                              ? 'rgba(208, 107, 119, 0.12)'
                              : 'rgba(124, 191, 139, 0.12)',
                          color:
                            m.family === 'closed'
                              ? 'var(--bad)'
                              : 'var(--ok)',
                          fontWeight: 500,
                        }}
                      >
                        {m.family === 'closed' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8">
          <NewsletterSignup />
        </div>
      </div>
    </div>
  );
}
