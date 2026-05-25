'use client';

import type { TokensPoint } from '@/types/ingestion';
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

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

interface Props {
  data: TokensPoint[];
  range: Range;
}

export default function TokensChart({ data, range }: Props) {
  if (!data.length) {
    return <div className="chart-empty">No data for this range</div>;
  }

  const W = 800;
  const H = 190;
  const P = { top: 12, right: 24, bottom: 32, left: 50 };
  const iW = W - P.left - P.right;
  const iH = H - P.top - P.bottom;

  const maxY = Math.max(...data.map((d) => d.totalTokens)) * 1.2 || 1;
  const chartBottom = P.top + iH;

  const barSlot = iW / data.length;
  const barW = Math.max(4, barSlot * 0.65);
  const barX = (i: number) => P.left + i * barSlot + (barSlot - barW) / 2;

  const barH = (v: number) => (v / maxY) * iH;
  const barTop = (v: number) => chartBottom - barH(v);

  const yTicks = [0, maxY * 0.5, maxY];
  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block' }}
      aria-hidden
    >
      {/* Horizontal grid + Y labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={P.left} y1={barTop(v)}
            x2={W - P.right} y2={barTop(v)}
            stroke="var(--line)" strokeWidth="1"
          />
          <text
            x={P.left - 6} y={barTop(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="10" fontFamily="var(--mono)" fill="var(--ink-4)"
          >
            {fmtK(v)}
          </text>
        </g>
      ))}

      {/* Stacked bars: prompt (bottom, darker) + completion (top, lighter) */}
      {data.map((d, i) => {
        const cx = barX(i);
        const promptTop = barTop(d.promptTokens);
        const promptHeight = barH(d.promptTokens);
        const compTop = barTop(d.totalTokens);
        const compHeight = barH(d.completionTokens);

        return (
          <g key={i}>
            <rect
              x={cx} y={promptTop}
              width={barW} height={promptHeight}
              fill="var(--accent)" opacity="0.75"
            />
            <rect
              x={cx} y={compTop}
              width={barW} height={compHeight}
              fill="var(--accent)" opacity="0.35"
              rx="2"
            />
          </g>
        );
      })}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={i}
            x={barX(i) + barW / 2} y={H - 6}
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
