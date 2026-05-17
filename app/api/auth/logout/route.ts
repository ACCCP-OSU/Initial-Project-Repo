import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { deleteSession } from "@/lib/repositories";

export const runtime = "nodejs";

function logoutResponse(request: NextRequest): NextResponse {
  const sessionToken = request.cookies.get(config.session.cookieName)?.value;
  if (sessionToken) {
    deleteSession(sessionToken);
  }
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 302 });
  clearSessionCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  return logoutResponse(request);
}

export async function GET(request: NextRequest) {
  return logoutResponse(request);
}
