import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { rating, comment, attributes } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
  }

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) return NextResponse.json({ error: 'Spot not found' }, { status: 404 });

  const [review] = await prisma.$transaction([
    prisma.review.create({
      data: {
        spotId: id,
        rating: Number(rating),
        comment: comment || null,
        attributes: JSON.stringify(attributes || {}),
      },
    }),
    prisma.spot.update({
      where: { id },
      data: {
        ratingSum: { increment: Number(rating) },
        reviewCount: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({ id: review.id }, { status: 201 });
}
