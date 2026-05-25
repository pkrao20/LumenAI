'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import TopNav from '@/components/common/top-nav';
import LatencyChart from '@/components/dashboard/latency-chart';
import TokensChart from '@/components/dashboard/tokens-chart';
import {
  getSummary,
  getLatency,
  getTokens,
  getRequests,
  type Range,
} from '@/services/ingestion.service';
import type { Summary, LatencyPoint, TokensPoint, InferenceLog } from '@/types/ingestion';

const RANGES: Range[] = ['1h', '24h', '7d', '30d'];

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

function fmtK(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>('24h');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [latency, setLatency] = useState<LatencyPoint[]>([]);
  const [tokens, setTokens] = useState<TokensPoint[]>([]);
  const [logs, setLogs] = useState<InferenceLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [selectedLog, setSelectedLog] = useState<InferenceLog | null>(null);

  const load = useCallback(async (r: Range, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const [s, l, t, req] = await Promise.all([
        getSummary(r),
        getLatency(r),
        getTokens(r),
        getRequests(page),
      ]);
      setSummary(s);
      setLatency(l);
      setTokens(t);
      setLogs(req.data);
      setLogTotal(req.total);
      setRefreshedAt(new Date());
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range, logPage);
  }, [range, logPage, load]);

  const handleRangeChange = (r: Range) => {
    setRange(r);
    setLogPage(1);
  };

  const totalPages = Math.ceil(logTotal / 20);

  return (
    <>
    <div className="app-root">
      <TopNav />

      <div className="dash-body">
        {/* Page header */}
        <div className="dash-header">
          <div>
            <span className="eyebrow">Ingestion</span>
            <h1 className="dash-title">Analytics</h1>
            <p className="dash-sub">
              {loading ? 'Loading…' : `Refreshed ${relTime(refreshedAt.toISOString())}`}
            </p>
          </div>
          <div className="dash-controls">
            <div className="range-tabs">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRangeChange(r)}
                  className={'range-tab' + (r === range ? ' active' : '')}
                  disabled={loading}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => load(range, logPage)}
              disabled={loading}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path
                  d="M11 6.5A4.5 4.5 0 1 1 6.5 2c1.2 0 2.3.47 3.1 1.24L11 5"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
                />
                <path d="M9 5h2V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="dash-error">
            <span>{error}</span>
          </div>
        )}

        <div className="dash-content">
          {/* KPI cards */}
          <div className="stat-row">
            <StatCard
              label="Total Requests"
              value={summary ? fmtNum(summary.totalRequests) : '—'}
              sub1={summary ? `${fmtNum(summary.completedRequests)} completed` : ''}
              sub2={summary ? `${summary.failedRequests} failed` : ''}
              loading={loading}
            />
            <StatCard
              label="Avg Latency"
              value={summary ? fmtMs(summary.avgLatencyMs) : '—'}
              sub1={summary ? `p95 · ${fmtMs(summary.p95LatencyMs)}` : ''}
              loading={loading}
            />
            <StatCard
              label="Total Tokens"
              value={summary ? fmtK(summary.totalTokens) : '—'}
              sub1={summary ? `${fmtNum(summary.avgTokensPerRequest)} avg / request` : ''}
              loading={loading}
            />
            <StatCard
              label="Error Rate"
              value={summary ? `${(summary.errorRate ?? 0).toFixed(2)}%` : '—'}
              sub1={summary && (summary.errorRate ?? 0) > 5 ? 'Above threshold' : 'Healthy'}
              valueClass={summary && (summary.errorRate ?? 0) > 5 ? 'danger' : summary && (summary.errorRate ?? 0) > 2 ? 'warn' : ''}
              loading={loading}
            />
          </div>

          {/* Latency chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Latency over time</span>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--accent)' }} />
                  avg
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--success)' }} />
                  p50
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--warn)' }} />
                  p95
                </span>
              </div>
            </div>
            <div className="chart-body">
              {loading && !latency.length ? (
                <div className="chart-skeleton" />
              ) : (
                <LatencyChart data={latency} range={range} />
              )}
            </div>
          </div>

          {/* Tokens chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Token usage over time</span>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--accent)', opacity: 0.75 }} />
                  prompt
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--accent)', opacity: 0.35 }} />
                  completion
                </span>
              </div>
            </div>
            <div className="chart-body">
              {loading && !tokens.length ? (
                <div className="chart-skeleton" style={{ height: 190 }} />
              ) : (
                <TokensChart data={tokens} range={range} />
              )}
            </div>
          </div>

          {/* Requests table */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Recent requests</span>
              <span className="eyebrow">{logTotal ? `${fmtNum(logTotal)} total` : ''}</span>
            </div>
            <div className="infer-table-wrap">
              {loading && !logs.length ? (
                <div className="table-skeleton">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="table-skeleton-row" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="chart-empty">No requests yet</div>
              ) : (
                <table className="infer-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Model</th>
                      <th>Tokens in</th>
                      <th>Tokens out</th>
                      <th>Latency</th>
                      <th>Status</th>
                      <th>Preview</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className={log.inputPreview || log.outputPreview ? 'has-preview' : ''} onClick={() => (log.inputPreview || log.outputPreview) && setSelectedLog(log)}>
                        <td className="mono td-id">{log.id.slice(0, 8)}</td>
                        <td className="mono">{log.model}</td>
                        <td className="mono">{fmtNum(log.promptTokens)}</td>
                        <td className="mono">{fmtNum(log.completionTokens)}</td>
                        <td className="mono">
                          <span className={'latency-badge' + (
                            (log.latencyMs ?? 0) > 2000 ? ' danger' :
                            (log.latencyMs ?? 0) > 1000 ? ' warn' : ' ok'
                          )}>
                            {fmtMs(log.latencyMs)}
                          </span>
                        </td>
                        <td>
                          <span className={'status-pill ' + log.status}>
                            {log.status}
                          </span>
                        </td>
                        <td className="td-preview">
                          {log.inputPreview || log.outputPreview ? (
                            <div className="preview-snippets">
                              {log.inputPreview && (
                                <span className="preview-line preview-in">
                                  {/* <span className="preview-label">In</span> */}
                                  {log.inputPreview.length > 48 ? log.inputPreview.slice(0, 30) + '…' : log.inputPreview}
                                </span>
                              )}

                              {log.outputPreview && (
                                <span className="preview-line preview-out"> -
                                  {/* <span className="preview-label"> Out </span> */}
                                  {log.outputPreview.length > 48 ? log.outputPreview.slice(0, 30) + '…' : log.outputPreview}
                                </span>
                              )}

                            </div>
                          ) : (
                            <span className="td-empty">—</span>
                          )}
                        </td>
                        <td className="mono td-when">{relTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="table-pagination">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={logPage === 1 || loading}
                  onClick={() => setLogPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span className="eyebrow">
                  {logPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={logPage === totalPages || loading}
                  onClick={() => setLogPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {selectedLog && (
      <PreviewModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    )}
    </>
  );
}

function PreviewModal({ log, onClose }: { log: InferenceLog; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="preview-modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="preview-modal">
        <div className="preview-modal-header">
          <div className="preview-modal-meta">
            <span className="mono td-id">{log.id.slice(0, 8)}</span>
            <span className="mono" style={{ color: 'var(--ink-3)' }}>{log.model}</span>
            <span className={'status-pill ' + log.status}>{log.status}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="preview-modal-body">
          <div className="preview-section">
            <div className="preview-section-label">Input</div>
            <pre className="preview-content">{log.inputPreview ?? '—'}</pre>
          </div>
          <div className="preview-section">
            <div className="preview-section-label">Output</div>
            <pre className="preview-content">{log.outputPreview ?? '—'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub1,
  sub2,
  valueClass,
  loading,
}: {
  label: string;
  value: string;
  sub1?: string;
  sub2?: string;
  valueClass?: string;
  loading: boolean;
}) {
  return (
    <div className="stat-card card">
      <span className="eyebrow">{label}</span>
      {loading ? (
        <div className="stat-skeleton" />
      ) : (
        <div className={'stat-value' + (valueClass ? ` ${valueClass}` : '')}>{value}</div>
      )}
      {sub1 && <div className="stat-sub">{sub1}</div>}
      {sub2 && <div className="stat-sub">{sub2}</div>}
    </div>
  );
}
