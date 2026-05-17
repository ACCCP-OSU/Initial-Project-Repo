import { NextRequest, NextResponse } from "next/server";

import { parseSamlCallback } from "@/lib/auth/saml";
import { setSessionCookie } from "@/lib/auth/session";
import { createSession, upsertUserFromSaml } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body: Record<string, string> = {};
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const rawBody = await request.text();
      const params = new URLSearchParams(rawBody);
      for (const [key, value] of params.entries()) {
        body[key] = value;
      }
    } else {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          body[key] = value;
        }
      }
    }
    if (!body.SAMLResponse) {
      return NextResponse.json({ error: "SAMLResponse was not provided by identity provider." }, { status: 400 });
    }

    const samlIdentity = await parseSamlCallback(body);
    const user = upsertUserFromSaml(samlIdentity);
    const session = createSession(user.id);

    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url), { status: 302 });
    setSessionCookie(redirectResponse, session.token, session.expiresAt);
    return redirectResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAML callback failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
