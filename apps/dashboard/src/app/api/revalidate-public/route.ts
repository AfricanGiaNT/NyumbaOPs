import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const publicUrl = process.env.PUBLIC_APP_URL;
  const secret = process.env.REVALIDATION_SECRET;

  if (!publicUrl || !secret) {
    return NextResponse.json({ error: "Revalidation not configured" }, { status: 500 });
  }

  let propertyId: string | undefined;
  try {
    const body = await request.json();
    propertyId = body.propertyId;
  } catch {
    // optional
  }

  try {
    const res = await fetch(`${publicUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ propertyId }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Revalidation failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Revalidation request failed" }, { status: 502 });
  }
}
