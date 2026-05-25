import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InferenceLog, InferenceLogStatus } from './entities/inference-log.entity';
import { LLM_INFERENCE_EVENT, LlmInferenceEvent } from './events/llm-inference.event';

export type AnalyticsRange = '1h' | '24h' | '7d' | '30d';

const RANGE_CONFIG: Record<AnalyticsRange, { interval: string; truncUnit: string }> = {
  '1h':  { interval: '1 hour',  truncUnit: 'minute' },
  '24h': { interval: '24 hours', truncUnit: 'hour'   },
  '7d':  { interval: '7 days',   truncUnit: 'day'    },
  '30d': { interval: '30 days',  truncUnit: 'day'    },
};

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(InferenceLog)
    private readonly inferenceLogRepository: Repository<InferenceLog>,
  ) {}

  // ─── Event listener ──────────────────────────────────────────────────────────

  @OnEvent(LLM_INFERENCE_EVENT, { async: true })
  async handleInferenceEvent(event: LlmInferenceEvent): Promise<void> {
    try {
      const log = this.inferenceLogRepository.create({
        requestId: event.requestId,
        provider: event.provider,
        model: event.model,
        status: event.status === 'completed' ? InferenceLogStatus.COMPLETED : InferenceLogStatus.FAILED,
        latencyMs: event.latencyMs,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        inputPreview: event.inputPreview,
        outputPreview: event.outputPreview,
        errorMessage: event.errorMessage,
        metadata: event.metadata,
        startedAt: event.startedAt,
        completedAt: event.completedAt,
      });

      await this.inferenceLogRepository.save(log);
      this.logger.debug(`Saved inference log ${log.requestId} (${event.provider}/${event.model} ${event.latencyMs}ms)`);
    } catch (err) {
      this.logger.error('Failed to save inference log', err instanceof Error ? err.stack : String(err));
    }
  }

  // ─── Analytics queries ────────────────────────────────────────────────────────

  async getSummary(range: AnalyticsRange) {
    const { interval } = RANGE_CONFIG[range];

    const row = await this.inferenceLogRepository
      .createQueryBuilder('log')
      .select('COUNT(*)', 'totalRequests')
      .addSelect(`COUNT(*) FILTER (WHERE log.status = 'COMPLETED')`, 'completedRequests')
      .addSelect(`COUNT(*) FILTER (WHERE log.status = 'FAILED')`, 'failedRequests')
      .addSelect('ROUND(AVG(log.latency_ms))', 'avgLatencyMs')
      .addSelect(`ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY log.latency_ms))`, 'p95LatencyMs')
      .addSelect('SUM(log.total_tokens)', 'totalTokens')
      .addSelect('ROUND(AVG(log.total_tokens))', 'avgTokensPerRequest')
      .where(`log.created_at >= NOW() - INTERVAL '${interval}'`)
      .getRawOne<{
        totalRequests: string;
        completedRequests: string;
        failedRequests: string;
        avgLatencyMs: string;
        p95LatencyMs: string;
        totalTokens: string;
        avgTokensPerRequest: string;
      }>();

    const total = Number(row?.totalRequests ?? 0);
    const failed = Number(row?.failedRequests ?? 0);

    return {
      totalRequests: total,
      completedRequests: Number(row?.completedRequests ?? 0),
      failedRequests: failed,
      errorRate: total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0,
      avgLatencyMs: Number(row?.avgLatencyMs ?? 0),
      p95LatencyMs: Number(row?.p95LatencyMs ?? 0),
      totalTokens: Number(row?.totalTokens ?? 0),
      avgTokensPerRequest: Number(row?.avgTokensPerRequest ?? 0),
    };
  }

  async getLatencyTimeseries(range: AnalyticsRange) {
    const { interval, truncUnit } = RANGE_CONFIG[range];

    const rows = await this.inferenceLogRepository
      .createQueryBuilder('log')
      .select(`DATE_TRUNC('${truncUnit}', log.created_at)`, 'bucket')
      .addSelect('ROUND(AVG(log.latency_ms))', 'avgLatencyMs')
      .addSelect(`ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY log.latency_ms))`, 'p95LatencyMs')
      .addSelect(`ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY log.latency_ms))`, 'p50LatencyMs')
      .addSelect('COUNT(*)', 'requestCount')
      .where(`log.created_at >= NOW() - INTERVAL '${interval}'`)
      .andWhere('log.latency_ms IS NOT NULL')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{
        bucket: string;
        avgLatencyMs: string;
        p95LatencyMs: string;
        p50LatencyMs: string;
        requestCount: string;
      }>();

    return rows.map((r) => ({
      time: r.bucket,
      avgLatencyMs: Number(r.avgLatencyMs),
      p95LatencyMs: Number(r.p95LatencyMs),
      p50LatencyMs: Number(r.p50LatencyMs),
      requestCount: Number(r.requestCount),
    }));
  }

  async getTokenTimeseries(range: AnalyticsRange) {
    const { interval, truncUnit } = RANGE_CONFIG[range];

    const rows = await this.inferenceLogRepository
      .createQueryBuilder('log')
      .select(`DATE_TRUNC('${truncUnit}', log.created_at)`, 'bucket')
      .addSelect('COALESCE(SUM(log.prompt_tokens), 0)', 'promptTokens')
      .addSelect('COALESCE(SUM(log.completion_tokens), 0)', 'completionTokens')
      .addSelect('COALESCE(SUM(log.total_tokens), 0)', 'totalTokens')
      .addSelect('COUNT(*)', 'requestCount')
      .where(`log.created_at >= NOW() - INTERVAL '${interval}'`)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{
        bucket: string;
        promptTokens: string;
        completionTokens: string;
        totalTokens: string;
        requestCount: string;
      }>();

    return rows.map((r) => ({
      time: r.bucket,
      promptTokens: Number(r.promptTokens),
      completionTokens: Number(r.completionTokens),
      totalTokens: Number(r.totalTokens),
      requestCount: Number(r.requestCount),
    }));
  }

  async getRecentRequests(page: number, limit: number) {
    const [data, total] = await this.inferenceLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        requestId: true,
        provider: true,
        model: true,
        status: true,
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        inputPreview: true,
        outputPreview: true,
        errorMessage: true,
        metadata: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
