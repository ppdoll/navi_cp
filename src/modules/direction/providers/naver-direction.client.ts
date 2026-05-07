import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MapProvider } from '../../../00_ENUM/map-provider.enum';
import { RouteOption } from '../../../00_ENUM/route-option.enum';
import { mapRouteOptionToNaver } from '../direction.utils';
import { Coordinate, ProviderRouteResult } from '../direction.types';
import { AbstractDirectionClient } from './abstract-direction.client';

const DEFAULT_NAVER_DIRECTION_API_URL =
  'https://maps.apigw.ntruss.com/map-direction/v1/driving';

type NaverRouteResponse = {
  route?: Record<
    string,
    Array<{
      path?: number[][];
      summary?: {
        distance?: number;
        duration?: number;
      };
    }>
  >;
};

@Injectable()
export class NaverDirectionClient extends AbstractDirectionClient {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
  ) {
    super(httpService, configService);
  }

  async getRoute(input: {
    origin: Coordinate;
    destination: Coordinate;
    option: RouteOption;
  }): Promise<ProviderRouteResult> {
    const apiKeyId = this.configService.get<string>('NAVER_MAP_API_KEY_ID');
    const apiKey = this.configService.get<string>('NAVER_MAP_API_KEY');
    const apiUrl =
      this.configService.get<string>('NAVER_DIRECTION_API_URL') ||
      DEFAULT_NAVER_DIRECTION_API_URL;

    if (!apiKeyId || !apiKey) {
      return this.buildUnavailableResult(
        input.option,
        'missing_api_key',
        'NAVER_MAP_API_KEY_ID or NAVER_MAP_API_KEY is missing.',
      );
    }

    try {
      const option = mapRouteOptionToNaver(input.option);
      const params = {
        start: `${input.origin.longitude},${input.origin.latitude}`,
        goal: `${input.destination.longitude},${input.destination.latitude}`,
        option,
      };
      const response = await firstValueFrom(
        this.httpService.get<NaverRouteResponse>(apiUrl, {
          headers: {
            'x-ncp-apigw-api-key-id': apiKeyId,
            'x-ncp-apigw-api-key': apiKey,
          },
          params,
        }),
      );

      const route = response.data.route?.[option]?.[0];
      const durationMs = route?.summary?.duration ?? null;
      const distanceMeters = route?.summary?.distance ?? null;
      const pathCoordinates =
        route?.path?.map((point) => [point[1], point[0]] as [number, number]) ?? [];

      return {
        provider: MapProvider.NAVER,
        durationMinutes:
          durationMs === null
            ? null
            : Number((durationMs / 60000).toFixed(1)),
        distanceMeters,
        option: input.option,
        status: durationMs === null ? 'request_failed' : 'ok',
        message:
          durationMs === null
            ? 'NAVER route response did not include a summary.'
            : undefined,
        pathCoordinates,
        apiDetail: {
          request: {
            method: 'GET',
            url: apiUrl,
            params,
          },
          response: {
            statusCode: response.status,
            durationRaw: durationMs,
            durationRawUnit: durationMs === null ? 'unknown' : 'ms',
            distanceRaw: distanceMeters,
            pathPointCount: pathCoordinates.length,
            summary: route?.summary
              ? {
                  duration: route.summary.duration ?? null,
                  distance: route.summary.distance ?? null,
                }
              : null,
          },
        },
      };
    } catch (error) {
      return this.buildRequestFailedResult(input.option, error);
    }
  }

  private buildUnavailableResult(
    option: RouteOption,
    status: 'missing_api_key' | 'not_configured',
    message: string,
  ): ProviderRouteResult {
    return {
      provider: MapProvider.NAVER,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status,
      message,
      apiDetail: {
        request: {
          method: 'GET',
          url:
            this.configService.get<string>('NAVER_DIRECTION_API_URL') ||
            DEFAULT_NAVER_DIRECTION_API_URL,
        },
        response: {
          error: message,
        },
      },
    };
  }

  private buildRequestFailedResult(
    option: RouteOption,
    error: unknown,
  ): ProviderRouteResult {
    const axiosError = error as AxiosError<{ message?: string }>;
    const providerMessage =
      axiosError.response?.data?.message ||
      axiosError.message ||
      'Unknown error';
    const message =
      axiosError.response?.status === 401 &&
      providerMessage.toLowerCase().includes('authentication failed')
        ? 'NAVER Maps key ID/key pair was rejected. Check that you are using the Maps API key ID and key, not IAM or another credential type.'
        : providerMessage;

    return {
      provider: MapProvider.NAVER,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status: 'request_failed',
      message,
      apiDetail: {
        request: {
          method: 'GET',
          url:
            this.configService.get<string>('NAVER_DIRECTION_API_URL') ||
            DEFAULT_NAVER_DIRECTION_API_URL,
        },
        response: {
          statusCode: axiosError.response?.status,
          error: message,
        },
      },
    };
  }
}
