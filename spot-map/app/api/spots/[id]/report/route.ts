import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { reason, detail } = await req.json();

  if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 });

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const report = await prisma.report.create({
    data: { targetType: 'spot', spotId: id, reason, detail: detail || null },
  });

  return NextResponse.json({ id: report.id }, { status: 201 });
}
