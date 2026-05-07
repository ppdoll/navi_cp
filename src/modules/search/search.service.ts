import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MapProvider } from '../../00_ENUM/map-provider.enum';

const KAKAO_LOCAL_ADDRESS_URL =
  'https://dapi.kakao.com/v2/local/search/address.json';
const KAKAO_LOCAL_KEYWORD_URL =
  'https://dapi.kakao.com/v2/local/search/keyword.json';

@Injectable()
export class SearchService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async searchPlaces(query: string) {
    const kakaoResult = await this.searchKakaoAddress(query);

    return {
      query,
      providers: [
        {
          provider: MapProvider.NAVER,
          status:
            this.configService.get<string>('NAVER_MAP_API_KEY_ID') &&
            this.configService.get<string>('NAVER_MAP_API_KEY')
              ? 'ready_for_integration'
              : 'missing_api_key',
        },
        {
          provider: MapProvider.KAKAO,
          ...kakaoResult,
        },
        {
          provider: MapProvider.TMAP,
          status: this.configService.get<string>('TMAP_API_KEY')
            ? 'ready_for_integration'
            : 'missing_api_key',
        },
      ],
    };
  }

  private async searchKakaoAddress(query: string) {
    const apiKey = this.configService.get<string>('KAKAO_MAP_API_KEY');

    if (!apiKey) {
      return {
        status: 'missing_api_key',
        message: 'KAKAO_MAP_API_KEY is missing.',
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          meta?: { total_count?: number; pageable_count?: number };
          documents?: Array<{
            address_name?: string;
            road_address?: { address_name?: string };
            x?: string;
            y?: string;
          }>;
        }>(KAKAO_LOCAL_ADDRESS_URL, {
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
          },
          params: {
            analyze_type: 'similar',
            page: 1,
            size: 10,
            query,
          },
        }),
      );

      const addressResults = (response.data.documents ?? []).map((item) => ({
        address: item.address_name ?? '',
        roadAddress: item.road_address?.address_name ?? '',
        longitude: item.x ?? '',
        latitude: item.y ?? '',
      }));

      if (addressResults.length > 0) {
        return {
          status: 'ok',
          source: 'address',
          totalCount: response.data.meta?.total_count ?? 0,
          pageableCount: response.data.meta?.pageable_count ?? 0,
          addresses: addressResults,
        };
      }

      const keywordResponse = await firstValueFrom(
        this.httpService.get<{
          meta?: { total_count?: number; pageable_count?: number };
          documents?: Array<{
            place_name?: string;
            address_name?: string;
            road_address_name?: string;
            x?: string;
            y?: string;
          }>;
        }>(KAKAO_LOCAL_KEYWORD_URL, {
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
          },
          params: {
            page: 1,
            size: 10,
            query,
          },
        }),
      );

      const keywordResults = (keywordResponse.data.documents ?? []).map(
        (item) => ({
          address: item.address_name ?? '',
          roadAddress: item.road_address_name || item.place_name || '',
          longitude: item.x ?? '',
          latitude: item.y ?? '',
        }),
      );

      return {
        status: 'ok',
        source: 'keyword',
        totalCount: keywordResponse.data.meta?.total_count ?? 0,
        pageableCount: keywordResponse.data.meta?.pageable_count ?? 0,
        addresses: keywordResults,
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ msg?: string; message?: string }>;
      return {
        status: 'request_failed',
        message:
          axiosError.response?.data?.msg ||
          axiosError.response?.data?.message ||
          axiosError.message,
      };
    }
  }
}
