import { RouteOption } from '../../../00_ENUM/route-option.enum';
import {
  DirectionCompareSummary,
  ProviderRouteResult,
} from '../direction.types';

export class DirectionCompareResponseDto {
  origin!: string;
  destination!: string;
  option!: RouteOption;
  comparedAt!: string;
  summary!: DirectionCompareSummary;
  routes!: ProviderRouteResult[];
}

