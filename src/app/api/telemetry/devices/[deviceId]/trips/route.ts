import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/telemetry/devices/[deviceId]/trips'>
) {
  const { deviceId } = await ctx.params;

  // TODO: Replace with your real trips fetch logic
  return NextResponse.json({
    success: true,
    deviceId,
    trips: [],
  });
}