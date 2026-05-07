import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchPlaceDto } from './dto/search-place.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('places')
  searchPlaces(@Query() query: SearchPlaceDto) {
    return this.searchService.searchPlaces(query.query);
  }
}

