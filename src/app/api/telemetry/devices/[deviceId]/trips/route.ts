import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params;

  // TODO: Replace with your real trips fetch logic.
  return NextResponse.json({
    success: true,
    deviceId,
    trips: [],
  });
}