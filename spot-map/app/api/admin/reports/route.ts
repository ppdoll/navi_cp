import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminCookie } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!checkAdminCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.report.findMany({
    include: {
      spot: true,
      review: { include: { spot: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    items.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      spot: r.spot
        ? { id: r.spot.id, name: r.spot.name, address: r.spot.address }
        : r.review?.spot
          ? { id: r.review.spot.id, name: r.review.spot.name, address: r.review.spot.address }
          : null,
      review: r.review
        ? {
            id: r.review.id,
            rating: r.review.rating,
            comment: r.review.comment,
            attributes: JSON.parse(r.review.attributes),
          }
        : null,
    })),
  );
}
