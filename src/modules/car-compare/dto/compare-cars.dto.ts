import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, IsUrl } from 'class-validator';

export class CompareCarsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { each: true },
  )
  urls!: string[];
}
