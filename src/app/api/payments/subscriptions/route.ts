import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "~/lib/auth";
import { getUserSubscriptions } from "~/lib/api/payments";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401 }
    );
  }

  try {
    const subscriptions = await getUserSubscriptions(user.id);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch subscriptions" }),
      { status: 500 }
    );
  }
}
