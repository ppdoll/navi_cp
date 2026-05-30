import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const COOKIE_NAME = 'spot_admin_token';
const COOKIE_VALUE = `authenticated_${ADMIN_PASSWORD}`;

export function checkAdminCookie(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME);
  return cookie?.value === COOKIE_VALUE;
}

export function getAdminCookieHeader(): string {
  const maxAge = 60 * 60 * 8; // 8 hours
  return `${COOKIE_NAME}=${COOKIE_VALUE}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`;
}

export function clearAdminCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

export function verifyPassword(input: string): boolean {
  return input === ADMIN_PASSWORD;
}
