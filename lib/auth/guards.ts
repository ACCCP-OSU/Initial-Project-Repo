import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { config } from "@/lib/config";
import type { SessionUser } from "@/lib/models";
import { getUserFromSession, isAdminUser } from "@/lib/repositories";

export function getRouteUser(request: NextRequest): SessionUser | null {
  const sessionToken = request.cookies.get(config.session.cookieName)?.value;
  return getUserFromSession(sessionToken);
}

export function requireRouteUser(request: NextRequest): SessionUser | NextResponse {
  const user = getRouteUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export function requireRouteAdmin(request: NextRequest): SessionUser | NextResponse {
  const user = getRouteUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

export async function getPageUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(config.session.cookieName)?.value;
  return getUserFromSession(sessionToken);
}

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getPageUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requirePageAdmin(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (!isAdminUser(user.id)) {
    redirect("/dashboard");
  }
  return user;
}
