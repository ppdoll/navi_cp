import { ConfigService } from '@nestjs/config';
import { MapProvider } from '../../00_ENUM/map-provider.enum';
import { RouteOption } from '../../00_ENUM/route-option.enum';
import { DirectionService } from './direction.service';
import { KakaoDirectionClient } from './providers/kakao-direction.client';
import { NaverDirectionClient } from './providers/naver-direction.client';
import { TmapDirectionClient } from './providers/tmap-direction.client';

describe('DirectionService', () => {
  const naverClient = {
    getRoute: jest.fn(),
  } as unknown as NaverDirectionClient;

  const kakaoClient = {
    getRoute: jest.fn(),
  } as unknown as KakaoDirectionClient;

  const tmapClient = {
    getRoute: jest.fn(),
  } as unknown as TmapDirectionClient;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'DIRECTION_CACHE_TTL_SECONDS') {
        return 60;
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sorted routes and summary', async () => {
    (naverClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.NAVER,
      durationMinutes: 40,
      distanceMeters: 10000,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });
    (kakaoClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.KAKAO,
      durationMinutes: 35,
      distanceMeters: 9800,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });
    (tmapClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.TMAP,
      durationMinutes: 50,
      distanceMeters: 11000,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });

    const service = new DirectionService(
      configService,
      naverClient,
      kakaoClient,
      tmapClient,
    );

    const result = await service.compareRoutes({
      origin: '37.5665,126.9780',
      destination: '37.3948,127.1112',
      option: RouteOption.RECOMMENDED,
    });

    expect(result.summary.okCount).toBe(3);
    expect(result.summary.failedCount).toBe(0);
    expect(result.summary.fastestProvider).toBe(MapProvider.KAKAO);
    expect(result.summary.slowestProvider).toBe(MapProvider.TMAP);
    expect(result.summary.spreadMinutes).toBe(15);
    expect(result.routes.map((route) => route.provider)).toEqual([
      MapProvider.KAKAO,
      MapProvider.NAVER,
      MapProvider.TMAP,
    ]);
  });

  it('uses cache for the same request during ttl', async () => {
    (naverClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.NAVER,
      durationMinutes: 40,
      distanceMeters: 10000,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });
    (kakaoClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.KAKAO,
      durationMinutes: 35,
      distanceMeters: 9800,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });
    (tmapClient.getRoute as jest.Mock).mockResolvedValue({
      provider: MapProvider.TMAP,
      durationMinutes: 50,
      distanceMeters: 11000,
      option: RouteOption.RECOMMENDED,
      status: 'ok',
    });

    const service = new DirectionService(
      configService,
      naverClient,
      kakaoClient,
      tmapClient,
    );

    await service.compareRoutes({
      origin: '37.5665,126.9780',
      destination: '37.3948,127.1112',
      option: RouteOption.RECOMMENDED,
    });

    await service.compareRoutes({
      origin: '37.5665,126.9780',
      destination: '37.3948,127.1112',
      option: RouteOption.RECOMMENDED,
    });

    expect(naverClient.getRoute).toHaveBeenCalledTimes(1);
    expect(kakaoClient.getRoute).toHaveBeenCalledTimes(1);
    expect(tmapClient.getRoute).toHaveBeenCalledTimes(1);
  });
});

