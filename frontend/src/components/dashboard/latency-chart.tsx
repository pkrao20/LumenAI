'use client';

import type { LatencyPoint } from '@/types/ingestion';
import type { Range } from '@/services/ingestion.service';

function formatTime(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '1h') {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (range === '24h') {
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function fmtMs(ms: number): string {
  if (ms === 0) return '0';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

interface Props {
  data: LatencyPoint[];
  range: Range;
}

export default function LatencyChart({ data, range }: Props) {
  if (!data.length) {
    return <div className="chart-empty">No data for this range</div>;
  }

  const W = 800;
  const H = 230;
  const P = { top: 16, right: 24, bottom: 36, left: 58 };
  const iW = W - P.left - P.right;
  const iH = H - P.top - P.bottom;

  const maxY = Math.max(...data.map((d) => d.p95LatencyMs)) * 1.2 || 1;

  const x = (i: number) =>
    P.left + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const y = (v: number) => P.top + (1 - v / maxY) * iH;

  const pathD = (key: keyof Pick<LatencyPoint, 'avgLatencyMs' | 'p50LatencyMs' | 'p95LatencyMs'>) =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`)
      .join(' ');

  const bottomY = (P.top + iH).toFixed(1);
  const leftX = P.left.toFixed(1);
  const rightX = x(data.length - 1).toFixed(1);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block' }}
      aria-hidden
    >
      {/* Horizontal grid lines + Y labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={P.left} y1={y(v)}
            x2={W - P.right} y2={y(v)}
            stroke="var(--line)" strokeWidth="1"
          />
          <text
            x={P.left - 8} y={y(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="10" fontFamily="var(--mono)" fill="var(--ink-4)"
          >
            {fmtMs(v)}
          </text>
        </g>
      ))}

      {/* Area fills */}
      <path
        d={`${pathD('p95LatencyMs')} L${rightX},${bottomY} L${leftX},${bottomY} Z`}
        fill="var(--warn)" fillOpacity="0.05"
      />
      <path
        d={`${pathD('avgLatencyMs')} L${rightX},${bottomY} L${leftX},${bottomY} Z`}
        fill="var(--accent)" fillOpacity="0.07"
      />

      {/* Lines */}
      <path d={pathD('p95LatencyMs')} fill="none" stroke="var(--warn)" strokeWidth="1.5" strokeOpacity="0.7" />
      <path d={pathD('p50LatencyMs')} fill="none" stroke="var(--success)" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.8" />
      <path d={pathD('avgLatencyMs')} fill="none" stroke="var(--accent)" strokeWidth="2" />

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={i}
            x={x(i)} y={H - 8}
            textAnchor="middle"
            fontSize="10" fontFamily="var(--mono)" fill="var(--ink-4)"
          >
            {formatTime(d.time, range)}
          </text>
        );
      })}
    </svg>
  );
}
