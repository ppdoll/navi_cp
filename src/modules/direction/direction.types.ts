import { MapProvider } from '../../00_ENUM/map-provider.enum';
import { RouteOption } from '../../00_ENUM/route-option.enum';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type ProviderRouteStatus =
  | 'ok'
  | 'missing_api_key'
  | 'not_configured'
  | 'request_failed';

export type ProviderRouteResult = {
  provider: MapProvider;
  durationMinutes: number | null;
  distanceMeters: number | null;
  option: RouteOption;
  status: ProviderRouteStatus;
  message?: string;
  pathCoordinates?: Array<[number, number]>;
  apiDetail?: {
    request: {
      method: 'GET' | 'POST';
      url: string;
      params?: Record<string, unknown>;
      body?: Record<string, unknown>;
    };
    response: {
      statusCode?: number;
      durationRaw?: number | null;
      durationRawUnit?: 'ms' | 'sec' | 'unknown';
      distanceRaw?: number | null;
      pathPointCount?: number;
      summary?: Record<string, unknown> | null;
      error?: string;
    };
  };
};

export type DirectionCompareSummary = {
  okCount: number;
  failedCount: number;
  fastestProvider: MapProvider | null;
  slowestProvider: MapProvider | null;
  spreadMinutes: number | null;
};
