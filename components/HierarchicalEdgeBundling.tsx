'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { AI_FLOWS, AI_COUNTRIES, REGION_COLORS, FLOW_CATEGORY_COLORS, type AIFlow, type AICountryNode } from '@/lib/ai-supply-demand-data';

const WIDTH = 700;
const HEIGHT = 700;
const RADIUS = 280;

interface Props {
  className?: string;
}

export default function HierarchicalEdgeBundling({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredFlow, setHoveredFlow] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const countries = useMemo(() => AI_COUNTRIES, []);
  const flows = useMemo(() => {
    if (selectedCategory === 'all') return AI_FLOWS;
    return AI_FLOWS.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

  // Compute node positions in a circle, grouped by region
  const nodePositions = useMemo(() => {
    const regions = [...new Set(countries.map(c => c.region))];
    const regionAngle = (2 * Math.PI) / regions.length;
    const positions: Record<string, { x: number; y: number; region: string }> = {};

    regions.forEach((region, ri) => {
      const regionCountries = countries.filter(c => c.region === region);
      const regionStart = ri * regionAngle - Math.PI / 2;
      const spread = regionAngle * 0.7;

      regionCountries.forEach((country, ci) => {
        const angle = regionStart + (ci / Math.max(1, regionCountries.length - 1)) * spread - spread / 2;
        positions[country.id] = {
          x: WIDTH / 2 + RADIUS * Math.cos(angle),
          y: HEIGHT / 2 + RADIUS * Math.sin(angle),
          region,
        };
      });
    });
    return positions;
  }, [countries]);

  // Render
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Draw region arcs (background)
    const regions = [...new Set(countries.map(c => c.region))];
    const regionAngle = (2 * Math.PI) / regions.length;
    regions.forEach((region, ri) => {
      const startAngle = ri * regionAngle - Math.PI / 2 - regionAngle * 0.35;
      const endAngle = startAngle + regionAngle * 0.7;
      const arc = d3.arc<any, any>()
        .innerRadius(RADIUS - 30)
        .outerRadius(RADIUS + 30)
        .startAngle(startAngle + Math.PI / 2)
        .endAngle(endAngle + Math.PI / 2);
      g.append('path')
        .attr('d', arc({} as any) || '')
        .attr('transform', `translate(${WIDTH / 2},${HEIGHT / 2})`)
        .attr('fill', REGION_COLORS[region] || '#6b7280')
        .attr('fill-opacity', 0.06)
        .attr('stroke', REGION_COLORS[region] || '#6b7280')
        .attr('stroke-opacity', 0.15)
        .attr('stroke-width', 1);

      // Region label
      const labelAngle = (startAngle + endAngle) / 2;
      const labelR = RADIUS + 50;
      g.append('text')
        .attr('x', WIDTH / 2 + labelR * Math.cos(labelAngle))
        .attr('y', HEIGHT / 2 + labelR * Math.sin(labelAngle))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', REGION_COLORS[region] || '#6b7280')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.05em')
        .text(region.toUpperCase());
    });

    // Draw edges (bundled curves)
    const maxFlowValue = Math.max(...flows.map(f => f.value));
    flows.forEach((flow, fi) => {
      const src = nodePositions[flow.source];
      const tgt = nodePositions[flow.target];
      if (!src || !tgt) return;

      const isHighlighted = !hoveredNode || hoveredNode === flow.source || hoveredNode === flow.target;
      const isFlowHovered = hoveredFlow === fi;
      const strokeW = Math.max(1, (flow.value / maxFlowValue) * 5);
      const opacity = isFlowHovered ? 0.9 : isHighlighted ? 0.35 : 0.06;

      // Bundled curve: quadratic bezier through center
      const midX = (src.x + tgt.x) / 2;
      const midY = (src.y + tgt.y) / 2;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = 0.3;
      const cx = midX + dy * curvature;
      const cy = midY - dx * curvature;

      g.append('path')
        .attr('d', `M${src.x},${src.y} Q${cx},${cy} ${tgt.x},${tgt.y}`)
        .attr('fill', 'none')
        .attr('stroke', FLOW_CATEGORY_COLORS[flow.category])
        .attr('stroke-width', isFlowHovered ? strokeW + 1.5 : strokeW)
        .attr('stroke-opacity', opacity)
        .attr('stroke-linecap', 'round')
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredFlow(fi))
        .on('mouseleave', () => setHoveredFlow(null));
    });

    // Draw nodes
    countries.forEach(country => {
      const pos = nodePositions[country.id];
      if (!pos) return;
      const isHovered = hoveredNode === country.id;
      const nodeR = isHovered ? 10 : 7;

      // Glow
      if (isHovered) {
        g.append('circle')
          .attr('cx', pos.x)
          .attr('cy', pos.y)
          .attr('r', nodeR + 6)
          .attr('fill', REGION_COLORS[pos.region])
          .attr('fill-opacity', 0.15);
      }

      // Node circle
      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeR)
        .attr('fill', '#fff')
        .attr('stroke', REGION_COLORS[pos.region])
        .attr('stroke-width', isHovered ? 3 : 2)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredNode(country.id))
        .on('mouseleave', () => setHoveredNode(null));

      // Label
      const labelR = RADIUS + 18;
      const angle = Math.atan2(pos.y - HEIGHT / 2, pos.x - WIDTH / 2);
      const lx = WIDTH / 2 + labelR * Math.cos(angle);
      const ly = HEIGHT / 2 + labelR * Math.sin(angle);

      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', angle > -Math.PI / 2 && angle < Math.PI / 2 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isHovered ? REGION_COLORS[pos.region] : 'var(--dim)')
        .attr('font-size', isHovered ? '12px' : '11px')
        .attr('font-weight', isHovered ? '600' : '400')
        .style('cursor', 'pointer')
        .text(country.shortLabel)
        .on('mouseenter', () => setHoveredNode(country.id))
        .on('mouseleave', () => setHoveredNode(null));
    });

  }, [nodePositions, countries, flows, hoveredNode, hoveredFlow]);

  // Flow detail tooltip
  const hoveredFlowData = hoveredFlow !== null ? flows[hoveredFlow] : null;
  const hoveredCountryData = hoveredNode ? countries.find(c => c.id === hoveredNode) : null;

  return (
    <div className={className}>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all', label: 'All Flows', color: '#6b7280' },
          { key: 'investment', label: 'Investment', color: FLOW_CATEGORY_COLORS.investment },
          { key: 'compute', label: 'Compute Supply', color: FLOW_CATEGORY_COLORS.compute },
          { key: 'talent', label: 'Talent', color: FLOW_CATEGORY_COLORS.talent },
          { key: 'models', label: 'Models / APIs', color: FLOW_CATEGORY_COLORS.models },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
              selectedCategory === cat.key
                ? 'border-transparent font-medium'
                : 'border-[var(--color-line)] text-[var(--dim)]'
            }`}
            style={selectedCategory === cat.key ? { backgroundColor: cat.color, color: '#fff' } : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Chart */}
        <div className="flex-1">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto max-h-[600px]"
          />
        </div>

        {/* Tooltip / Detail panel */}
        <div className="w-full lg:w-64 shrink-0">
          {hoveredFlowData ? (
            <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--card)]">
              <div className="text-xs font-medium text-[var(--dim)] uppercase tracking-wider mb-2">Flow Detail</div>
              <div className="text-sm font-medium mb-1">{hoveredFlowData.source} → {hoveredFlowData.target}</div>
              <div className="text-xs text-[var(--dim)] mb-2">{hoveredFlowData.label}</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: FLOW_CATEGORY_COLORS[hoveredFlowData.category] }} />
                <span className="text-xs capitalize">{hoveredFlowData.category}</span>
              </div>
            </div>
          ) : hoveredCountryData ? (
            <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--card)]">
              <div className="text-xs font-medium text-[var(--dim)] uppercase tracking-wider mb-2">Country Profile</div>
              <div className="text-sm font-medium mb-1">{hoveredCountryData.id}</div>
              <div className="text-xs text-[var(--dim)] mb-3">{hoveredCountryData.region}</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--dim)]">Compute Supply</span>
                  <span className="font-medium">{hoveredCountryData.computeSupply}/100</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${hoveredCountryData.computeSupply}%`, background: REGION_COLORS[hoveredCountryData.region] }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dim)]">Model Production</span>
                  <span className="font-medium">{hoveredCountryData.modelSupply}/100</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${hoveredCountryData.modelSupply}%`, background: REGION_COLORS[hoveredCountryData.region] }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dim)]">AI Investment</span>
                  <span className="font-medium">${hoveredCountryData.investmentSupply}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dim)]">Talent Concentration</span>
                  <span className="font-medium">{hoveredCountryData.talentDemand}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dim)]">Enterprise Adoption</span>
                  <span className="font-medium">{hoveredCountryData.adoptionDemand}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--card)]">
              <div className="text-xs font-medium text-[var(--dim)] uppercase tracking-wider mb-2">How to read</div>
              <p className="text-xs text-[var(--dim)] leading-relaxed">
                Each node is a country, grouped by region. Curved edges show AI supply/demand flows between countries —
                investment capital, GPU/compute supply, AI talent migration, and model/API access.
                Hover over a node or edge to see details.
              </p>
              <div className="mt-3 space-y-1.5">
                {Object.entries(FLOW_CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-2 text-[11px]">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: color }} />
                    <span className="capitalize text-[var(--dim)]">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
