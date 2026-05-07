import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RouteOption } from '../../../00_ENUM/route-option.enum';
import { Coordinate, ProviderRouteResult } from '../direction.types';

export abstract class AbstractDirectionClient {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  abstract getRoute(input: {
    origin: Coordinate;
    destination: Coordinate;
    option: RouteOption;
  }): Promise<ProviderRouteResult>;
}

