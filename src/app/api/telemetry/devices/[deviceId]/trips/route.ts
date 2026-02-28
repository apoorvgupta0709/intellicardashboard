import { NextResponse } from 'next/server';

type Context = {
  params: {
    deviceId: string;
  };
};

export async function GET(_request: Request, { params }: Context) {
  const { deviceId } = params;

  // TODO: Replace this stub with your actual trips fetch logic
  // Example:
  // const trips = await getTripsForDevice(deviceId);
  // return NextResponse.json(trips);

  return NextResponse.json({
    success: true,
    deviceId,
    trips: [],
  });
}