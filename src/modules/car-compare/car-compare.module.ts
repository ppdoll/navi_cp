import { Module } from '@nestjs/common';
import { CarCompareController } from './car-compare.controller';
import { CarCompareService } from './car-compare.service';

@Module({
  controllers: [CarCompareController],
  providers: [CarCompareService],
})
export class CarCompareModule {}
