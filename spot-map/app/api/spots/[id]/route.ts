import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const spot = await prisma.spot.findUnique({
    where: { id },
    include: { reviews: { orderBy: { createdAt: 'desc' } } },
  });

  if (!spot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: spot.id,
    name: spot.name,
    address: spot.address,
    latitude: spot.latitude,
    longitude: spot.longitude,
    category: spot.category,
    attributes: JSON.parse(spot.attributes),
    avgRating: spot.reviewCount > 0 ? Math.round((spot.ratingSum / spot.reviewCount) * 10) / 10 : null,
    reviewCount: spot.reviewCount,
    createdAt: spot.createdAt.toISOString(),
    reviews: spot.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      attributes: JSON.parse(r.attributes),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
