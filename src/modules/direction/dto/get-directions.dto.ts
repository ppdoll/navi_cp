import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { RouteOption } from '../../../00_ENUM/route-option.enum';

export class GetDirectionsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
  origin!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
  destination!: string;

  @IsOptional()
  @IsEnum(RouteOption)
  option: RouteOption = RouteOption.RECOMMENDED;
}
