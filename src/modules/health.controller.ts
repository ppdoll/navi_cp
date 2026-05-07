import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class HealthController {
  @Get()
  getRoot(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Navi Compare Backend</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <style>
      body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:#eef2f6; color:#2f2a33; }
      main { max-width: 720px; margin: 56px auto; background:#fff; border:1px solid #d9dee5; border-radius:16px; padding:24px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; color:#56505c; }
    </style>
  </head>
  <body>
    <main>
      <h1>🚏 Navi Compare Backend</h1>
      <p>서버가 정상 실행 중입니다. 상태 확인은 <code>/health</code>를 호출하세요.</p>
    </main>
  </body>
</html>`);
  }

  @Get('favicon.svg')
  getFavicon(@Res() res: Response) {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8a6b5"/>
      <stop offset="100%" stop-color="#8ec0e4"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="#f8efe6"/>
  <path d="M32 10c-8.8 0-16 7.2-16 16 0 11.8 14.2 25.8 15 26.4.6.6 1.4.6 2 0 .8-.6 15-14.6 15-26.4 0-8.8-7.2-16-16-16z" fill="url(#g1)"/>
  <circle cx="32" cy="26" r="7" fill="#ffffff"/>
</svg>`,
    );
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
