import { Controller, Get, Query } from '@nestjs/common';
import { DirectionService } from './direction.service';
import { GetDirectionsDto } from './dto/get-directions.dto';

@Controller('directions')
export class DirectionController {
  constructor(private readonly directionService: DirectionService) {}

  @Get('compare')
  compareRoutes(@Query() query: GetDirectionsDto) {
    return this.directionService.compareRoutes(query);
  }
}

