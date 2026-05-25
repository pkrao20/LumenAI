import { Controller, Get, ParseIntPipe, Query, DefaultValuePipe } from '@nestjs/common';
import { IngestionService, AnalyticsRange } from './ingestion.service';

const VALID_RANGES: AnalyticsRange[] = ['1h', '24h', '7d', '30d'];

function parseRange(raw: string): AnalyticsRange {
  return VALID_RANGES.includes(raw as AnalyticsRange) ? (raw as AnalyticsRange) : '24h';
}

@Controller({ path: 'ingestion/analytics', version: '1' })
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * KPI cards — totals, avg latency, p95, error rate, token totals
   * GET /ingestion/analytics/summary?range=24h
   */
  @Get('summary')
  getSummary(@Query('range') range = '24h') {
    return this.ingestionService.getSummary(parseRange(range));
  }

  /**
   * Latency line chart — avg / p50 / p95 per time bucket
   * GET /ingestion/analytics/latency?range=24h
   */
  @Get('latency')
  getLatency(@Query('range') range = '24h') {
    return this.ingestionService.getLatencyTimeseries(parseRange(range));
  }

  /**
   * Token usage stacked bar — prompt / completion / total per time bucket
   * GET /ingestion/analytics/tokens?range=24h
   */
  @Get('tokens')
  getTokens(@Query('range') range = '24h') {
    return this.ingestionService.getTokenTimeseries(parseRange(range));
  }

  /**
   * Recent requests table with full metadata
   * GET /ingestion/analytics/requests?page=1&limit=20
   */
  @Get('requests')
  getRequests(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safLimit = Math.min(limit, 100);
    return this.ingestionService.getRecentRequests(page, safLimit);
  }
}
