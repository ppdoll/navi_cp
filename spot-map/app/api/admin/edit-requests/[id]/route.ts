import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdminCookie } from '@/lib/admin-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkAdminCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action, adminNote } = await req.json(); // action: "approve" | "reject"

  const editRequest = await prisma.spotEditRequest.findUnique({
    where: { id },
    include: { spot: true },
  });
  if (!editRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'approve') {
    const proposed = JSON.parse(editRequest.proposed) as {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      attributes?: Record<string, unknown>;
    };

    await prisma.$transaction([
      prisma.spot.update({
        where: { id: editRequest.spotId },
        data: {
          ...(proposed.name !== undefined && { name: proposed.name }),
          ...(proposed.address !== undefined && { address: proposed.address }),
          ...(proposed.latitude !== undefined && { latitude: proposed.latitude }),
          ...(proposed.longitude !== undefined && { longitude: proposed.longitude }),
          ...(proposed.attributes !== undefined && {
            attributes: JSON.stringify(proposed.attributes),
          }),
        },
      }),
      prisma.spotEditRequest.update({
        where: { id },
        data: { status: 'approved', adminNote: adminNote || null, reviewedAt: new Date() },
      }),
    ]);
  } else if (action === 'reject') {
    await prisma.spotEditRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote: adminNote || null, reviewedAt: new Date() },
    });
  } else {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
