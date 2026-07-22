import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const list = await db.list();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, vehicleYear, vehicleMake, vehicleModel, vin, customerPhone, repairName, estimatedCost, urgency, status, videoUrl, signature, approvedAt, advisorName, advisorEmail, shopName, province } = body;

    // Validate minimum required fields for creation
    if (!vehicleMake || !vehicleModel || !customerPhone || !repairName || estimatedCost === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      vehicleYear: Number(vehicleYear) || new Date().getFullYear(),
      vehicleMake,
      vehicleModel,
      vin,
      customerPhone,
      repairName,
      estimatedCost: Number(estimatedCost),
      urgency: urgency || 'RECOMMENDED',
      status: status || 'AWAITING_INSPECTION',
      videoUrl,
      signature,
      approvedAt,
      advisorName,
      advisorEmail,
      shopName,
      province,
    };

    let result;
    if (id) {
      // If ID is provided, check if it exists and update it, else create it with that ID
      const existing = await db.get(id);
      if (existing) {
        result = await db.update(id, payload);
      } else {
        result = await db.create({ id, ...payload });
      }
    } else {
      result = await db.create(payload);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing inspection ID' }, { status: 400 });
    }

    const result = await db.update(id, updates);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
