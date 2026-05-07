import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DirectionCompareResponseDto } from './dto/direction-compare-response.dto';
import { GetDirectionsDto } from './dto/get-directions.dto';
import { parseCoordinate } from './direction.utils';
import {
  DirectionCompareSummary,
  ProviderRouteResult,
} from './direction.types';
import { KakaoDirectionClient } from './providers/kakao-direction.client';
import { NaverDirectionClient } from './providers/naver-direction.client';
import { TmapDirectionClient } from './providers/tmap-direction.client';

@Injectable()
export class DirectionService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: DirectionCompareResponseDto }
  >();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly naverDirectionClient: NaverDirectionClient,
    private readonly kakaoDirectionClient: KakaoDirectionClient,
    private readonly tmapDirectionClient: TmapDirectionClient,
  ) {
    const ttlSeconds = Number(
      this.configService.get('DIRECTION_CACHE_TTL_SECONDS') ?? 60,
    );
    this.cacheTtlMs = ttlSeconds * 1000;
  }

  async compareRoutes(query: GetDirectionsDto): Promise<DirectionCompareResponseDto> {
    const cacheKey = `${query.origin}|${query.destination}|${query.option}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const origin = parseCoordinate(query.origin);
    const destination = parseCoordinate(query.destination);

    const [naver, kakao, tmap] = await Promise.all([
      this.naverDirectionClient.getRoute({
        origin,
        destination,
        option: query.option,
      }),
      this.kakaoDirectionClient.getRoute({
        origin,
        destination,
        option: query.option,
      }),
      this.tmapDirectionClient.getRoute({
        origin,
        destination,
        option: query.option,
      }),
    ]);

    const sortedRoutes = [naver, kakao, tmap].sort((left, right) => {
      if (left.durationMinutes === null && right.durationMinutes === null) {
        return 0;
      }

      if (left.durationMinutes === null) {
        return 1;
      }

      if (right.durationMinutes === null) {
        return -1;
      }

      return left.durationMinutes - right.durationMinutes;
    });

    const response: DirectionCompareResponseDto = {
      origin: query.origin,
      destination: query.destination,
      option: query.option,
      comparedAt: new Date().toISOString(),
      summary: this.buildSummary(sortedRoutes),
      routes: sortedRoutes,
    };

    this.cache.set(cacheKey, {
      expiresAt: now + this.cacheTtlMs,
      value: response,
    });

    return response;
  }

  private buildSummary(routes: ProviderRouteResult[]): DirectionCompareSummary {
    const okRoutes = routes.filter(
      (route): route is ProviderRouteResult & { durationMinutes: number } =>
        route.status === 'ok' && route.durationMinutes !== null,
    );

    const failedCount = routes.length - okRoutes.length;

    if (okRoutes.length === 0) {
      return {
        okCount: 0,
        failedCount,
        fastestProvider: null,
        slowestProvider: null,
        spreadMinutes: null,
      };
    }

    const fastest = okRoutes[0];
    const slowest = okRoutes[okRoutes.length - 1];

    return {
      okCount: okRoutes.length,
      failedCount,
      fastestProvider: fastest.provider,
      slowestProvider: slowest.provider,
      spreadMinutes: Number(
        (slowest.durationMinutes - fastest.durationMinutes).toFixed(1),
      ),
    };
  }
}
