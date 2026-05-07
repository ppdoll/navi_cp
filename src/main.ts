import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import serverless from 'serverless-http';
import { AppModule } from './modules/app.module';

declare const module: {
  hot?: {
    accept: () => void;
    dispose: (callback: () => void) => void;
  };
};

let cachedHandler:
  | ((request: Request, response: Response) => Promise<unknown>)
  | undefined;

async function createApp() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  await app.init();

  return serverless(expressApp);
}

export default async function handler(request: Request, response: Response) {
  if (!cachedHandler) {
    cachedHandler = (await createApp()) as (
      request: Request,
      response: Response,
    ) => Promise<unknown>;
  }

  return cachedHandler(request, response);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = Number(configService.get('PORT') ?? 3000);
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Port: ${port}`);
}

if (require.main === module) {
  void bootstrap();
}
