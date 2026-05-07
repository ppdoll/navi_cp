import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DirectionController } from './direction.controller';
import { DirectionService } from './direction.service';
import { KakaoDirectionClient } from './providers/kakao-direction.client';
import { NaverDirectionClient } from './providers/naver-direction.client';
import { TmapDirectionClient } from './providers/tmap-direction.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(configService.get('HTTP_TIMEOUT_MS') ?? 10000),
        maxRedirects: 2,
      }),
    }),
  ],
  controllers: [DirectionController],
  providers: [
    DirectionService,
    NaverDirectionClient,
    KakaoDirectionClient,
    TmapDirectionClient,
  ],
})
export class DirectionModule {}
