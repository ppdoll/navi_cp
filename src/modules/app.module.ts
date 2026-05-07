import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'node:path';
import { envValidationSchema } from '../config/env/env.validation';
import { DirectionModule } from './direction/direction.module';
import { HealthController } from './health.controller';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(
        process.cwd(),
        `src/config/env/.${process.env.NODE_ENV || 'local'}.env`,
      ),
      ignoreEnvVars: true,
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DirectionModule,
    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
