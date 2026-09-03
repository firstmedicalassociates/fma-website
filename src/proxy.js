import { NextResponse } from "next/server";
import { getTrailingSlashRedirectUrl } from "./app/lib/config/site";

export function proxy(request) {
  const redirectUrl = getTrailingSlashRedirectUrl(request.nextUrl, request.method);
  return redirectUrl ? NextResponse.redirect(redirectUrl, 308) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
