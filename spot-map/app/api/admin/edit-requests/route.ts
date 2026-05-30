import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminCookie } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!checkAdminCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.spotEditRequest.findMany({
    include: { spot: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    items.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      proposed: JSON.parse(r.proposed),
      spot: {
        id: r.spot.id,
        name: r.spot.name,
        address: r.spot.address,
        latitude: r.spot.latitude,
        longitude: r.spot.longitude,
        attributes: JSON.parse(r.spot.attributes),
      },
    })),
  );
}
