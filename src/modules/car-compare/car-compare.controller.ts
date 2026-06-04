import { Body, Controller, Post } from '@nestjs/common';
import { CarCompareService } from './car-compare.service';
import { CompareCarsDto } from './dto/compare-cars.dto';

@Controller('cars')
export class CarCompareController {
  constructor(private readonly carCompareService: CarCompareService) {}

  @Post('compare')
  compareCars(@Body() body: CompareCarsDto) {
    return this.carCompareService.compareCars(body.urls);
  }
}
