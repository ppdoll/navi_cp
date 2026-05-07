import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MapProvider } from '../../../00_ENUM/map-provider.enum';
import { RouteOption } from '../../../00_ENUM/route-option.enum';
import {
  buildKakaoAvoid,
  mapRouteOptionToKakao,
} from '../direction.utils';
import { Coordinate, ProviderRouteResult } from '../direction.types';
import { AbstractDirectionClient } from './abstract-direction.client';

const DEFAULT_KAKAO_DIRECTION_API_URL =
  'https://apis-navi.kakaomobility.com/v1/directions';

type KakaoRouteResponse = {
  routes?: Array<{
    sections?: Array<{
      roads?: Array<{
        vertexes?: number[];
      }>;
    }>;
    summary?: {
      distance?: number;
      duration?: number;
    };
  }>;
};

@Injectable()
export class KakaoDirectionClient extends AbstractDirectionClient {
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
    const apiKey = this.configService.get<string>('KAKAO_MAP_API_KEY');
    const apiUrl =
      this.configService.get<string>('KAKAO_DIRECTION_API_URL') ||
      DEFAULT_KAKAO_DIRECTION_API_URL;

    if (!apiKey) {
      return this.buildUnavailableResult(
        input.option,
        'missing_api_key',
        'KAKAO_MAP_API_KEY is missing.',
      );
    }

    try {
      const params = {
        origin: `${input.origin.longitude},${input.origin.latitude}`,
        destination: `${input.destination.longitude},${input.destination.latitude}`,
        priority: mapRouteOptionToKakao(input.option),
        avoid: buildKakaoAvoid(input.option),
        summary: false,
      };
      const response = await firstValueFrom(
        this.httpService.get<KakaoRouteResponse>(apiUrl, {
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
            'Content-Type': 'application/json',
          },
          params,
        }),
      );

      const route = response.data.routes?.[0];
      const durationRaw = route?.summary?.duration ?? null;
      const distanceMeters = route?.summary?.distance ?? null;
      const pathCoordinates = this.extractPathCoordinates(response.data);
      const durationRawUnit =
        durationRaw === null
          ? 'unknown'
          : durationRaw > 100000
            ? 'ms'
            : 'sec';
      const durationMinutes =
        durationRaw === null
          ? null
          : durationRawUnit === 'ms'
            ? Number((durationRaw / 60000).toFixed(1))
            : Number((durationRaw / 60).toFixed(1));

      return {
        provider: MapProvider.KAKAO,
        durationMinutes,
        distanceMeters,
        option: input.option,
        status: durationRaw === null ? 'request_failed' : 'ok',
        message:
          durationRaw === null
            ? 'Kakao route response did not include a summary.'
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
            durationRaw,
            durationRawUnit,
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
      return this.buildRequestFailedResult(input.option, error, apiUrl, input);
    }
  }

  private buildUnavailableResult(
    option: RouteOption,
    status: 'missing_api_key' | 'not_configured',
    message: string,
  ): ProviderRouteResult {
    return {
      provider: MapProvider.KAKAO,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status,
      message,
      apiDetail: {
        request: {
          method: 'GET',
          url:
            this.configService.get<string>('KAKAO_DIRECTION_API_URL') ||
            DEFAULT_KAKAO_DIRECTION_API_URL,
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
    apiUrl: string,
    input: { origin: Coordinate; destination: Coordinate; option: RouteOption },
  ): ProviderRouteResult {
    const axiosError = error as AxiosError<{ msg?: string }>;
    const providerMessage =
      axiosError.response?.data?.msg ||
      axiosError.message ||
      'Unknown error';
    const message =
      axiosError.response?.status === 403 &&
      providerMessage.toLowerCase().includes('permission denied')
        ? 'Kakao Mobility affiliate API permission is required for this REST API key.'
        : providerMessage;

    return {
      provider: MapProvider.KAKAO,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status: 'request_failed',
      message,
      apiDetail: {
        request: {
          method: 'GET',
          url: apiUrl,
          params: {
            origin: `${input.origin.longitude},${input.origin.latitude}`,
            destination: `${input.destination.longitude},${input.destination.latitude}`,
            priority: mapRouteOptionToKakao(input.option),
            avoid: buildKakaoAvoid(input.option),
            summary: false,
          },
        },
        response: {
          statusCode: axiosError.response?.status,
          error: message,
        },
      },
    };
  }

  private extractPathCoordinates(
    payload: KakaoRouteResponse,
  ): Array<[number, number]> {
    const sections = payload.routes?.[0]?.sections ?? [];
    const coordinates: Array<[number, number]> = [];

    for (const section of sections) {
      for (const road of section.roads ?? []) {
        const vertices = road.vertexes ?? [];
        for (let index = 0; index + 1 < vertices.length; index += 2) {
          const longitude = vertices[index];
          const latitude = vertices[index + 1];
          coordinates.push([latitude, longitude]);
        }
      }
    }

    return coordinates;
  }
}
