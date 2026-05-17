import { NextRequest, NextResponse } from "next/server";

import { requireRouteAdmin } from "@/lib/auth/guards";
import { getAdminMetrics } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userOrResponse = requireRouteAdmin(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }
  return NextResponse.json(getAdminMetrics());
}
