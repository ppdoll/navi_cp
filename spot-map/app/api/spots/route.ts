import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const spots = await prisma.spot.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const result = spots.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    category: s.category,
    attributes: JSON.parse(s.attributes),
    avgRating: s.reviewCount > 0 ? Math.round((s.ratingSum / s.reviewCount) * 10) / 10 : null,
    reviewCount: s.reviewCount,
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, address, latitude, longitude, category, attributes, rating } = body;

  if (!name || !address || latitude == null || longitude == null) {
    return NextResponse.json({ error: 'name, address, latitude, longitude are required' }, { status: 400 });
  }

  const initialRating = Number(rating) || 0;

  const spot = await prisma.spot.create({
    data: {
      name,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      category: category || 'claw_machine',
      attributes: JSON.stringify(attributes || {}),
      ratingSum: initialRating,
      reviewCount: initialRating > 0 ? 1 : 0,
    },
  });

  return NextResponse.json({ id: spot.id }, { status: 201 });
}
