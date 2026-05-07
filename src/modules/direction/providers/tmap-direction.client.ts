import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MapProvider } from '../../../00_ENUM/map-provider.enum';
import { RouteOption } from '../../../00_ENUM/route-option.enum';
import { mapRouteOptionToTmap } from '../direction.utils';
import { Coordinate, ProviderRouteResult } from '../direction.types';
import { AbstractDirectionClient } from './abstract-direction.client';

const DEFAULT_TMAP_DIRECTION_API_URL =
  'https://apis.openapi.sk.com/tmap/routes?version=1&format=json';

type TmapRouteResponse = {
  features?: Array<{
    geometry?: {
      type?: string;
      coordinates?: number[][];
    };
    properties?: {
      totalDistance?: number;
      totalTime?: number;
    };
  }>;
};

@Injectable()
export class TmapDirectionClient extends AbstractDirectionClient {
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
    const apiKey = this.configService.get<string>('TMAP_API_KEY');
    const apiUrl =
      this.configService.get<string>('TMAP_DIRECTION_API_URL') ||
      DEFAULT_TMAP_DIRECTION_API_URL;

    if (!apiKey) {
      return this.buildUnavailableResult(
        input.option,
        'missing_api_key',
        'TMAP_API_KEY is missing.',
      );
    }

    try {
      const body = {
        startX: input.origin.longitude,
        startY: input.origin.latitude,
        endX: input.destination.longitude,
        endY: input.destination.latitude,
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        searchOption: mapRouteOptionToTmap(input.option),
        startName: 'origin',
        endName: 'destination',
      };
      const response = await firstValueFrom(
        this.httpService.post<TmapRouteResponse>(
          apiUrl,
          body,
          {
            headers: {
              appKey: apiKey,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const summary = response.data.features?.find(
        (feature) =>
          feature.properties?.totalDistance !== undefined ||
          feature.properties?.totalTime !== undefined,
      )?.properties;

      const durationSeconds = summary?.totalTime ?? null;
      const distanceMeters = summary?.totalDistance ?? null;
      const pathCoordinates = this.extractPathCoordinates(response.data);

      return {
        provider: MapProvider.TMAP,
        durationMinutes:
          durationSeconds === null
            ? null
            : Number((durationSeconds / 60).toFixed(1)),
        distanceMeters,
        option: input.option,
        status: durationSeconds === null ? 'request_failed' : 'ok',
        message:
          durationSeconds === null
            ? 'TMAP route response did not include a summary.'
            : undefined,
        pathCoordinates,
        apiDetail: {
          request: {
            method: 'POST',
            url: apiUrl,
            body,
          },
          response: {
            statusCode: response.status,
            durationRaw: durationSeconds,
            durationRawUnit: durationSeconds === null ? 'unknown' : 'sec',
            distanceRaw: distanceMeters,
            pathPointCount: pathCoordinates.length,
            summary: summary
              ? {
                  totalTime: summary.totalTime ?? null,
                  totalDistance: summary.totalDistance ?? null,
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
      provider: MapProvider.TMAP,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status,
      message,
      apiDetail: {
        request: {
          method: 'POST',
          url:
            this.configService.get<string>('TMAP_DIRECTION_API_URL') ||
            DEFAULT_TMAP_DIRECTION_API_URL,
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
    const axiosError = error as AxiosError<{ errorMessage?: string }>;
    const providerMessage =
      axiosError.response?.data?.errorMessage ||
      axiosError.message ||
      'Unknown error';

    return {
      provider: MapProvider.TMAP,
      durationMinutes: null,
      distanceMeters: null,
      option,
      status: 'request_failed',
      message: providerMessage,
      apiDetail: {
        request: {
          method: 'POST',
          url:
            this.configService.get<string>('TMAP_DIRECTION_API_URL') ||
            DEFAULT_TMAP_DIRECTION_API_URL,
        },
        response: {
          statusCode: axiosError.response?.status,
          error: providerMessage,
        },
      },
    };
  }

  private extractPathCoordinates(
    payload: TmapRouteResponse,
  ): Array<[number, number]> {
    const coordinates: Array<[number, number]> = [];

    for (const feature of payload.features ?? []) {
      if (feature.geometry?.type !== 'LineString') {
        continue;
      }

      for (const point of feature.geometry.coordinates ?? []) {
        if (point.length < 2) {
          continue;
        }
        coordinates.push([point[1], point[0]]);
      }
    }

    return coordinates;
  }
}
