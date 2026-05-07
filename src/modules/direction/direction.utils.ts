import { BadRequestException } from '@nestjs/common';
import { RouteOption } from '../../00_ENUM/route-option.enum';
import { Coordinate } from './direction.types';

const COORDINATE_PATTERN = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;

export function parseCoordinate(value: string): Coordinate {
  if (!COORDINATE_PATTERN.test(value)) {
    throw new BadRequestException(
      'Coordinates must be provided as "latitude,longitude".',
    );
  }

  const [latitude, longitude] = value.split(',').map(Number);

  return {
    latitude,
    longitude,
  };
}

export function mapRouteOptionToNaver(option: RouteOption): string {
  switch (option) {
    case RouteOption.FASTEST:
      return 'trafast';
    case RouteOption.FREE:
      return 'traavoidtoll';
    case RouteOption.BIG_ROAD:
      return 'tracomfort';
    case RouteOption.RECOMMENDED:
    default:
      return 'traoptimal';
  }
}

export function mapRouteOptionToKakao(option: RouteOption): string {
  switch (option) {
    case RouteOption.FASTEST:
      return 'TIME';
    case RouteOption.BIG_ROAD:
      return 'RECOMMEND';
    case RouteOption.FREE:
      return 'RECOMMEND';
    case RouteOption.RECOMMENDED:
    default:
      return 'RECOMMEND';
  }
}

export function buildKakaoAvoid(option: RouteOption): string | undefined {
  if (option === RouteOption.FREE) {
    return 'toll';
  }

  return undefined;
}

export function mapRouteOptionToTmap(option: RouteOption): string {
  switch (option) {
    case RouteOption.FREE:
      return '1';
    case RouteOption.FASTEST:
      return '2';
    case RouteOption.BIG_ROAD:
      return '0';
    case RouteOption.RECOMMENDED:
    default:
      return '0';
  }
}
