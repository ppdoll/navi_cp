import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminCookie } from '@/lib/admin-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkAdminCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action, adminNote, deleteTarget } = await req.json();

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = action === 'resolve' ? 'resolved' : 'dismissed';

  if (deleteTarget && action === 'resolve') {
    if (report.targetType === 'spot' && report.spotId) {
      await prisma.$transaction([
        prisma.report.update({
          where: { id },
          data: { status, adminNote: adminNote || null, reviewedAt: new Date() },
        }),
        prisma.spot.delete({ where: { id: report.spotId } }),
      ]);
    } else if (report.targetType === 'review' && report.reviewId) {
      const review = await prisma.review.findUnique({ where: { id: report.reviewId } });
      if (review) {
        await prisma.$transaction([
          prisma.report.update({
            where: { id },
            data: { status, adminNote: adminNote || null, reviewedAt: new Date() },
          }),
          prisma.review.delete({ where: { id: report.reviewId } }),
          prisma.spot.update({
            where: { id: review.spotId },
            data: {
              ratingSum: { decrement: review.rating },
              reviewCount: { decrement: 1 },
            },
          }),
        ]);
      } else {
        await prisma.report.update({
          where: { id },
          data: { status, adminNote: adminNote || null, reviewedAt: new Date() },
        });
      }
    }
  } else {
    await prisma.report.update({
      where: { id },
      data: { status, adminNote: adminNote || null, reviewedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
