import { NextRequest, NextResponse } from "next/server";

import { createSamlLoginRedirect } from "@/lib/auth/saml";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const relayState = request.nextUrl.searchParams.get("returnTo") ?? "/dashboard";
    const redirectUrl = await createSamlLoginRedirect(relayState);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate SAML login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
