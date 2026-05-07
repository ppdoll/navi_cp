import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RouteOption } from '../src/00_ENUM/route-option.enum';
import { AppModule } from '../src/modules/app.module';
import { KakaoDirectionClient } from '../src/modules/direction/providers/kakao-direction.client';
import { NaverDirectionClient } from '../src/modules/direction/providers/naver-direction.client';
import { TmapDirectionClient } from '../src/modules/direction/providers/tmap-direction.client';

describe('Directions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NaverDirectionClient)
      .useValue({
        getRoute: jest.fn().mockResolvedValue({
          provider: 'NAVER',
          durationMinutes: 40,
          distanceMeters: 10000,
          option: RouteOption.RECOMMENDED,
          status: 'ok',
        }),
      })
      .overrideProvider(KakaoDirectionClient)
      .useValue({
        getRoute: jest.fn().mockResolvedValue({
          provider: 'KAKAO',
          durationMinutes: 35,
          distanceMeters: 9800,
          option: RouteOption.RECOMMENDED,
          status: 'ok',
        }),
      })
      .overrideProvider(TmapDirectionClient)
      .useValue({
        getRoute: jest.fn().mockResolvedValue({
          provider: 'TMAP',
          durationMinutes: 50,
          distanceMeters: 11000,
          option: RouteOption.RECOMMENDED,
          status: 'ok',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/directions/compare (GET) returns summary fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/directions/compare')
      .query({
        origin: '37.5665,126.9780',
        destination: '37.3948,127.1112',
        option: RouteOption.RECOMMENDED,
      })
      .expect(200);

    expect(response.body.summary).toBeDefined();
    expect(response.body.summary.okCount).toBe(3);
    expect(response.body.summary.fastestProvider).toBe('KAKAO');
    expect(response.body.summary.slowestProvider).toBe('TMAP');
    expect(typeof response.body.comparedAt).toBe('string');
  });
});

