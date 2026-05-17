import type { NextResponse } from "next/server";

import { config } from "@/lib/config";

export function setSessionCookie(response: NextResponse, sessionToken: string, expiresAt: string): void {
  response.cookies.set(config.session.cookieName, sessionToken, {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(config.session.cookieName, "", {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: "lax",
    expires: new Date(0),
    path: "/"
  });
}
