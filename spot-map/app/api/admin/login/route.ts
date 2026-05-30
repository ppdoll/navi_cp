import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, getAdminCookieHeader, clearAdminCookieHeader } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', getAdminCookieHeader());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearAdminCookieHeader());
  return res;
}
