import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

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
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
