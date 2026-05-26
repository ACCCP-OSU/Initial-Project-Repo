import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { createSession, upsertUserFromSaml } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (process.env.ENABLE_DEV_LOGIN !== "true") {
    return NextResponse.json(
      { error: "Dev login is disabled." },
      { status: 404 }
    );
  }

  const user = upsertUserFromSaml({
    externalId: "dev-user-001",
    email: process.env.DEV_USER_EMAIL ?? "dev.user@osu.edu",
    displayName: process.env.DEV_USER_NAME ?? "Development User",
  });

  const session = createSession(user.id);

  const response = NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 302,
  });

  setSessionCookie(response, session.token, session.expiresAt);

  return response;
}