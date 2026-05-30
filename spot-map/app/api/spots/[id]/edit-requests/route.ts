import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { proposed, reason } = body;

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) return NextResponse.json({ error: 'Spot not found' }, { status: 404 });

  const editRequest = await prisma.spotEditRequest.create({
    data: {
      spotId: id,
      proposed: JSON.stringify(proposed),
      reason: reason || null,
    },
  });

  return NextResponse.json({ id: editRequest.id }, { status: 201 });
}
